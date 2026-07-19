"use strict";

// gtfs-dashboard frontend — drill-down catalog over manifest.json (see PRD.md §4 for schema).
// Ported from mockup-reference.html: same markup/CSS structure and interactions, real fetch()
// instead of hardcoded sample data, plus loading/error/unknown-status handling the mockup
// never needed (PRD.md §5 point 8).

const REPO = "GISBoost/easy-GTFS-RT";
const RELEASES_URL = `https://github.com/${REPO}/releases`;
const MONTHS_PL = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];
// Indexed by Date#getUTCDay() (0 = Sunday). Dates are parsed as UTC (bare "YYYY-MM-DD", no time
// suffix) so the weekday is derived purely from the calendar date string, unaffected by the
// viewer's local timezone — same convention daysBetween() already relies on.
const WEEKDAYS_PL = ["niedz", "pon", "wt", "śr", "czw", "pt", "sob"];
function weekdayPl(dateStr) {
  return WEEKDAYS_PL[new Date(dateStr).getUTCDay()];
}

let state = {
  level: "cities", cityId: null, month: null, date: null, q: "", sort: "date", dir: "asc",
  loadStatus: "loading", loadError: null, manifest: null, generatedAt: null,
  // Cross-city comparison view (PRD.md §8.3, GD-4) - lives outside the city→month→day
  // hierarchy, so it gets its own sort/range state instead of reusing sort/dir above.
  compareRange: "month", compareSort: "meanAbsDelaySec", compareDir: "desc",
};

// --- URL hash routing --------------------------------------------------------------------------
// The drill-down state is mirrored into location.hash (#/<cityId>/<YYYY-MM>/<YYYY-MM-DD>) so
// every level transition is a real browser history entry — without this, the mouse/keyboard
// "back" button exits the whole single-page app on the first press instead of stepping back one
// drill-down level, since nothing else here ever touches session history.
function hashFromState(level, cityId, month, date) {
  if (level === "compare") return "#/compare";
  if (level === "months" && cityId) return `#/${encodeURIComponent(cityId)}`;
  if (level === "days" && cityId && month) return `#/${encodeURIComponent(cityId)}/${month}`;
  if (level === "detail" && cityId && month && date) return `#/${encodeURIComponent(cityId)}/${month}/${date}`;
  return "#/";
}
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  if (raw === "compare") return { compare: true };
  const [cityId, month, date] = raw.split("/").filter(Boolean).map((s) => decodeURIComponent(s));
  return { cityId: cityId || null, month: month || null, date: date || null };
}
// Reads location.hash, validates it against the loaded manifest, and updates + renders state.
// Falls back one level at a time when a segment doesn't resolve (stale/hand-edited/bookmarked
// URL) rather than crashing.
function applyHash() {
  const parsed = parseHash();
  if (parsed.compare) {
    state.level = "compare"; state.cityId = null; state.month = null; state.date = null;
    state.compareRange = "month"; state.compareSort = "meanAbsDelaySec"; state.compareDir = "desc";
    render(); return;
  }
  const { cityId, month, date } = parsed;
  const city = cityId ? state.manifest.find((c) => c.id === cityId) : null;
  if (!city) {
    state.level = "cities"; state.cityId = null; state.month = null; state.date = null;
    render(); return;
  }
  const monthDays = month ? city.days.filter((d) => d.date.slice(0, 7) === month) : [];
  if (!month || !monthDays.length) {
    state.level = "months"; state.cityId = cityId; state.month = null; state.date = null;
    render(); return;
  }
  const day = date ? monthDays.find((d) => d.date === date) : null;
  if (!date || !day) {
    state.level = "days"; state.cityId = cityId; state.month = month; state.date = null;
    state.sort = "date"; state.dir = "desc";
    render(); return;
  }
  state.level = "detail"; state.cityId = cityId; state.month = month; state.date = date;
  render();
}
function navigateTo(level, cityId, month, date) {
  state.q = "";
  const next = hashFromState(level, cityId, month, date);
  if (location.hash === next) applyHash();
  else location.hash = next;
}

// --- small helpers ---------------------------------------------------------------------------
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function todayIso() { return new Date().toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

function fmtNum(n) {
  return n === null ? '<span class="dash">–</span>' : n.toLocaleString("pl-PL");
}
function fmtCoverage(ranges) {
  return ranges === null ? '<span class="dash">brak danych o pokryciu</span>' : ranges.join(", ");
}
function statusPillHtml(status) {
  if (status === "ok") return '<span class="pill">✓ zbudowane</span>';
  if (status === "partial") return '<span class="pill warn">częściowe</span>';
  return '<span class="pill unknown">stan nieznany</span>';
}

function cityMeta(c) {
  const dates = c.days.map((d) => d.date).sort();
  const last = dates[dates.length - 1];
  return { first: dates[0], last, stale: daysBetween(last, todayIso()), count: c.days.length };
}
function monthsFor(c) {
  const map = new Map();
  c.days.forEach((d) => {
    const ym = d.date.slice(0, 7);
    if (!map.has(ym)) map.set(ym, []);
    map.get(ym).push(d);
  });
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

// --- monthly delay summary (PRD.md §8.2) -------------------------------------------------------
// delay_stats (added in GD-3) is nullable per day — absent entirely on manifests generated
// before GD-3 shipped, or null for a specific day that has no diff_summary.csv (best-effort,
// PRD §3.5). Everything below reads only numbers already present in the fetched manifest.json —
// no network requests, no CSV parsing happens in the browser (PRD §8.1's core constraint).
// "Worst day" and the sparkline both use max_delay_sec (the worst single observation that day),
// not mean_abs_delay_sec — chosen once, for consistency, per PRD §8.2's note that either is
// defensible but the two uses must agree. max_delay_sec is a true max, so it's taken directly
// across days, never weighted by n_rows the way the averages below are.
function monthDelaySummary(days) {
  const withStats = days.filter((d) => d.delay_stats != null);
  if (!withStats.length) return null;
  let sumRows = 0, sumMeanWeighted = 0, maxDelaySec = -Infinity, worst = withStats[0];
  withStats.forEach((d) => {
    const s = d.delay_stats;
    sumRows += s.n_rows;
    sumMeanWeighted += s.mean_delay_sec * s.n_rows;
    if (s.max_delay_sec > maxDelaySec) { maxDelaySec = s.max_delay_sec; worst = d; }
  });
  return {
    meanDelaySec: sumRows ? sumMeanWeighted / sumRows : null,
    maxDelaySec,
    worstDay: worst,
    daysWithData: withStats.length,
  };
}
// delay_stats stores seconds (matches diff_summary.csv's own column names 1:1, PRD §8.1) -
// converted to minutes only here, at display time, since minutes read more naturally for
// transit delays than raw seconds once you're past a few tens of them.
function fmtSignedMinPlain(sec) {
  const min = sec / 60;
  return `${min > 0 ? "+" : ""}${min.toFixed(1)} min`;
}
function fmtSignedMin(sec) {
  return sec === null ? '<span class="dash">–</span>' : fmtSignedMinPlain(sec);
}
function fmtMin(sec) {
  return sec === null ? '<span class="dash">–</span>' : `${(sec / 60).toFixed(1)} min`;
}
// Day-by-day sparkline of mean_delay_sec (signed - early vs late both matter, unlike a plain
// max), chronological. Days with delay_stats: null break the line into a gap rather than
// plotting as 0 — a real 0 s day and "no data" are not the same thing (PRD §8.2 / the same
// delay_sec == 0 ambiguity called out in PRD §3.5). The baseline always includes 0 so an
// early-running day (negative mean) reads as a dip below the line, not just a smaller bump.
// Interactive mode (days-level panel) skips aria-hidden since hover then genuinely exposes
// per-day data via wireDayTrendTooltip() - the month-card caller stays non-interactive/decorative.
function sparklineSvg(days, { width = 120, height = 26, className = "", interactive = false } = {}) {
  const w = width, h = height, pad = 4;
  if (days.length < 2) return "";
  const vals = days.map((d) => (d.delay_stats != null ? d.delay_stats.mean_delay_sec : null));
  const nums = vals.filter((v) => v !== null);
  if (!nums.length) return "";
  const hi = Math.max(0, ...nums), lo = Math.min(0, ...nums);
  const range = (hi - lo) || 1;
  const stepX = (w - pad * 2) / (days.length - 1);
  const y = (v) => h - pad - ((v - lo) / range) * (h - pad * 2);
  const segments = [];
  let cur = [];
  vals.forEach((v, i) => {
    if (v === null) { if (cur.length) segments.push(cur); cur = []; }
    else cur.push(`${(pad + i * stepX).toFixed(1)},${y(v).toFixed(1)}`);
  });
  if (cur.length) segments.push(cur);
  const polylines = segments
    .map((seg) => `<polyline points="${seg.join(" ")}" fill="none" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join("");
  return `<svg class="sparkline${className ? ` ${className}` : ""}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none"${interactive ? "" : ' aria-hidden="true"'}>${polylines}</svg>`;
}
// Wires hover on the days-level trend panel's sparkline: mouse position along the chart's width
// maps to the nearest day that has non-null delay_stats, whose date + mean delay is then shown in
// a small floating tooltip. Attached to the whole <svg> (not per-point markers) so hovering
// anywhere along the line's horizontal span works, not just exact data-point pixels.
function wireDayTrendTooltip(monthDays) {
  const panel = document.querySelector(".delay-panel");
  const svg = panel && panel.querySelector("svg.sparkline");
  if (!svg) return;
  const withStats = monthDays.map((d, i) => ({ d, i })).filter(({ d }) => d.delay_stats != null);
  if (!withStats.length) return;
  const tooltip = document.createElement("div");
  tooltip.className = "spark-tooltip";
  panel.appendChild(tooltip);
  const n = monthDays.length;
  svg.addEventListener("mousemove", (e) => {
    const rect = svg.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const idx = frac * (n - 1);
    let nearest = withStats[0], bestDist = Infinity;
    withStats.forEach((item) => {
      const dist = Math.abs(item.i - idx);
      if (dist < bestDist) { bestDist = dist; nearest = item; }
    });
    const panelRect = panel.getBoundingClientRect();
    tooltip.textContent = `${nearest.d.date}: ${fmtSignedMinPlain(nearest.d.delay_stats.mean_delay_sec)}`;
    tooltip.style.display = "block";
    tooltip.style.left = `${e.clientX - panelRect.left + 12}px`;
    tooltip.style.top = `${e.clientY - panelRect.top + 12}px`;
  });
  svg.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });
}
// Compact text-only summary shown on each month card (cities → months level). The sparkline
// itself lives on the days level instead (dayTrendPanelHtml below) - there's more room for it
// there, right next to the actual per-day table it's summarizing.
function delaySummaryHtml(days) {
  const summary = monthDelaySummary(days);
  if (!summary) {
    return `<div class="delay-summary delay-summary-empty">brak danych o opóźnieniach za ten miesiąc</div>`;
  }
  return `<div class="delay-summary">
    <span>śr. opóźnienie: ${fmtSignedMin(summary.meanDelaySec)}</span>
    <span>maks. opóźnienie: ${fmtMin(summary.maxDelaySec)}</span>
    <span class="worst">najgorszy dzień: ${summary.worstDay.date} (${fmtMin(summary.worstDay.delay_stats.max_delay_sec)})</span>
  </div>`;
}
// Day-by-day delay trend panel for the days level (one specific month) - always built from every
// day in the month regardless of the search box filter, since it summarizes "the month", not
// whatever subset of days is currently matching a date search.
function dayTrendPanelHtml(monthDays) {
  const withStats = monthDays.filter((d) => d.delay_stats != null);
  if (!withStats.length) {
    return `<div class="delay-panel">
      <div class="delay-panel-title">Trend opóźnień w tym miesiącu</div>
      <div class="empty">brak danych o opóźnieniach za ten miesiąc</div>
    </div>`;
  }
  const vals = withStats.map((d) => d.delay_stats.mean_delay_sec);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return `<div class="delay-panel">
    <div class="delay-panel-title">Trend opóźnień w tym miesiącu</div>
    ${sparklineSvg(monthDays, { width: 600, height: 60, className: "sparkline-wide", interactive: true })}
    <p class="delay-panel-caption">Średnie opóźnienie obserwacji na dzień, w minutach (przerwy w linii = brak danych za ten dzień; najedź na linię, żeby zobaczyć wartość dla konkretnego dnia). Zakres w tym miesiącu: ${fmtSignedMinPlain(lo)} – ${fmtSignedMinPlain(hi)}.</p>
  </div>`;
}

// --- cross-city delay comparison (PRD.md §8.3, GD-4) -------------------------------------------
// Same n_rows-weighted aggregation as monthDelaySummary above, just spanning every city's days
// within a selected range instead of one city's one month. stdev_delay_sec is deliberately never
// aggregated here - PRD §8.3 explains why: averaging an already-averaged stdev without the raw
// per-row data would be statistically misleading.
function cityDaysInRange(city, range) {
  if (range === "all") return city.days;
  const ym = todayIso().slice(0, 7);
  return city.days.filter((d) => d.date.slice(0, 7) === ym);
}
function cityDelayAggregate(city, range) {
  const days = cityDaysInRange(city, range).filter((d) => d.delay_stats != null);
  if (!days.length) return null;
  let sumRows = 0, sumMeanWeighted = 0, sumAbsWeighted = 0, sumChanged = 0, maxDelaySec = -Infinity;
  days.forEach((d) => {
    const s = d.delay_stats;
    sumRows += s.n_rows;
    sumMeanWeighted += s.mean_delay_sec * s.n_rows;
    sumAbsWeighted += s.mean_abs_delay_sec * s.n_rows;
    sumChanged += s.n_changed;
    if (s.max_delay_sec > maxDelaySec) maxDelaySec = s.max_delay_sec;
  });
  return {
    meanDelaySec: sumRows ? sumMeanWeighted / sumRows : null,
    meanAbsDelaySec: sumRows ? sumAbsWeighted / sumRows : null,
    maxDelaySec,
    nChanged: sumChanged,
    pctChanged: sumRows ? (sumChanged / sumRows) * 100 : null,
  };
}
// Null values (a city with zero non-null delay_stats in the selected range - PRD §8.3 point 4)
// always sort to the bottom regardless of ascending/descending direction, same rule as
// dayComparator below.
function compareRowValue(row, key) {
  return key === "display" ? row.city.display : (row.agg ? row.agg[key] : null);
}
function compareRowComparator(a, b) {
  const key = state.compareSort;
  const av = compareRowValue(a, key), bv = compareRowValue(b, key);
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  const cmp = typeof av === "string" ? av.localeCompare(bv, "pl") : (av < bv ? -1 : av > bv ? 1 : 0);
  return state.compareDir === "asc" ? cmp : -cmp;
}
function fmtPct(agg) {
  if (!agg || agg.pctChanged === null) return '<span class="dash">–</span>';
  return `${fmtNum(agg.nChanged)} (${agg.pctChanged.toFixed(1)}%)`;
}
function compareTableHtml(rows) {
  const sortInd = (key) => (state.compareSort === key ? (state.compareDir === "asc" ? "ascending" : "descending") : "none");
  return `<div class="table-wrap"><table>
      <thead><tr>
        <th><button data-csort="display" aria-sort="${sortInd("display")}">Miasto</button></th>
        <th><button data-csort="meanDelaySec" aria-sort="${sortInd("meanDelaySec")}">Śr. opóźnienie</button></th>
        <th><button data-csort="meanAbsDelaySec" aria-sort="${sortInd("meanAbsDelaySec")}">Śr. bezwzględne opóźnienie</button></th>
        <th><button data-csort="maxDelaySec" aria-sort="${sortInd("maxDelaySec")}">Maks. opóźnienie</button></th>
        <th><button data-csort="pctChanged" aria-sort="${sortInd("pctChanged")}">Opóźnione obserwacje</button></th>
      </tr></thead>
      <tbody>${rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.city.display)}</td>
          <td class="num">${fmtSignedMin(row.agg ? row.agg.meanDelaySec : null)}</td>
          <td class="num">${fmtMin(row.agg ? row.agg.meanAbsDelaySec : null)}</td>
          <td class="num">${fmtMin(row.agg ? row.agg.maxDelaySec : null)}</td>
          <td class="num">${fmtPct(row.agg)}</td>
        </tr>`).join("")}</tbody>
    </table></div>`;
}

// Null values always sort to the bottom of the day table, regardless of ascending/descending
// direction — otherwise an unknown-status day (all stats null) can look like the "highest"
// value on a descending sort.
function dayComparator(a, b) {
  const key = state.sort;
  const av = a[key], bv = b[key];
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  const cmp = av < bv ? -1 : av > bv ? 1 : 0;
  return state.dir === "asc" ? cmp : -cmp;
}

// --- manifest fetch + normalization -----------------------------------------------------------
// Translates the PRD §4 schema (cities as an object keyed by city_id) into the flat
// {id, display, days} array shape the render functions below operate on. This is the one seam
// where the manifest's real field names meet the UI — render functions read the manifest's
// field names directly (observations_matched, coverage_ranges, assets.static_gtfs, ...), no
// further renaming happens past this point.
function normalizeManifest(data) {
  const cities = Object.entries(data.cities || {}).map(([id, c]) => ({
    id,
    display: c.display_name || id,
    days: (c.days || []).slice().sort((a, b) => a.date.localeCompare(b.date)),
  }));
  return { cities, generatedAt: data.generated_at || null };
}

async function loadManifest() {
  try {
    const res = await fetch("manifest.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || typeof data.cities !== "object" || data.cities === null) {
      throw new Error('manifest.json ma nieoczekiwany kształt (brak pola "cities").');
    }
    const normalized = normalizeManifest(data);
    state.manifest = normalized.cities;
    state.generatedAt = normalized.generatedAt;
    state.loadStatus = "loaded";
    applyHash();
  } catch (err) {
    console.error("Nie udało się wczytać manifest.json:", err);
    state.loadStatus = "error";
    state.loadError = err;
    render();
  }
}

// --- breadcrumbs -------------------------------------------------------------------------------
let crumbHandlers = [];
function crumbBtn(label, current, handler) {
  const i = crumbHandlers.length;
  crumbHandlers.push(handler);
  return `<button data-i="${i}" ${current ? "disabled" : ""}>${label}</button>`;
}
function setCrumbs() {
  crumbHandlers = [];
  const parts = [];
  parts.push(crumbBtn("Wszystkie miasta", state.level === "cities", () => {
    navigateTo("cities", null, null, null);
  }));
  if (state.level === "compare") {
    parts.push('<span class="sep">/</span>');
    parts.push(crumbBtn("Porównanie miast", true, () => {}));
  }
  if (state.cityId) {
    const c = state.manifest.find((m) => m.id === state.cityId);
    parts.push('<span class="sep">/</span>');
    parts.push(crumbBtn(escapeHtml(c.display), state.level === "months", () => {
      navigateTo("months", state.cityId, null, null);
    }));
  }
  if (state.month) {
    const [y, m] = state.month.split("-");
    parts.push('<span class="sep">/</span>');
    parts.push(crumbBtn(`${MONTHS_PL[+m - 1]} ${y}`, state.level === "days", () => {
      navigateTo("days", state.cityId, state.month, null);
    }));
  }
  if (state.date) {
    parts.push('<span class="sep">/</span>');
    parts.push(crumbBtn(state.date, true, () => {}));
  }
  const el = document.getElementById("crumbs");
  el.innerHTML = parts.join(" ");
  el.querySelectorAll("button[data-i]").forEach((btn) => { btn.onclick = crumbHandlers[btn.dataset.i]; });
}

function updateDataBadge() {
  const badge = document.getElementById("dataBadge");
  if (!state.generatedAt) { badge.textContent = ""; return; }
  const d = new Date(state.generatedAt);
  badge.textContent = isNaN(d.getTime())
    ? ""
    : "zaktualizowano: " + d.toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" });
}

// --- loading / error states --------------------------------------------------------------------
function renderLoadingHtml() {
  return `<div class="state-message">
    <div class="spinner" aria-hidden="true"></div>
    <div class="state-title">Ładowanie danych…</div>
  </div>`;
}
function renderErrorHtml(err) {
  const msg = err && err.message ? err.message : "nieznany błąd";
  return `<div class="state-message is-error">
    <div class="state-title">Nie udało się wczytać danych</div>
    <p>Wystąpił problem z pobraniem <code>manifest.json</code> (${escapeHtml(msg)}).</p>
    <a class="state-link" href="${RELEASES_URL}" target="_blank" rel="noopener">Zobacz release'y bezpośrednio na GitHubie ↗</a>
  </div>`;
}

// --- download link helpers ----------------------------------------------------------------------
function dlChip(label, url) {
  return url ? `<a href="${url}" target="_blank" rel="noopener">${label}</a>` : "";
}
function dlRow(name, url) {
  if (!url) return "";
  const file = url.split("/").pop();
  return `<a class="dl-detail" href="${url}" target="_blank" rel="noopener">
    <span><span class="dl-name">${name}</span><br/><span class="dl-file">${escapeHtml(file)}</span></span>
    <span class="dl-go">pobierz ↗</span>
  </a>`;
}

function renderDetail(c, d) {
  const chartUrl = d.assets.diff_chart;
  const chartBlock = chartUrl
    ? `<div class="chart-img-wrap">
        <img class="chart-img" loading="lazy"
             src="${chartUrl}"
             alt="Wykres średniego opóźnienia (zrealizowane minus rozkładowe) w funkcji czasu rozkładowego, ${escapeHtml(c.display)} ${d.date}"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        <div class="chart-fallback" style="display:none">
          <span>Obraz nie wczytał się pod tym adresem.</span>
          <a href="${chartUrl}" target="_blank" rel="noopener">Otwórz link mimo to ↗</a>
        </div>
      </div>`
    : `<div class="chart-img-wrap">
        <div class="chart-fallback">
          <span>Wykres nie został wygenerowany dla tego dnia (np. same zerowe opóźnienia).</span>
        </div>
      </div>`;

  const summaryLine = d.assets.diff_summary
    ? ` Dostępna alternatywa danych (tabela): <a href="${d.assets.diff_summary}" target="_blank" rel="noopener">plik CSV</a>.`
    : "";

  return `
    <div class="detail-head">
      <div><h1 class="detail-date">${escapeHtml(c.display)} — ${d.date}</h1><span class="cov">Pokrycie: ${fmtCoverage(d.coverage_ranges)}</span></div>
      <div class="detail-badges">
        ${statusPillHtml(d.status)}
        ${d.release_url ? `<a class="pill-link" href="${d.release_url}" target="_blank" rel="noopener">zobacz release na GitHubie ↗</a>` : ""}
      </div>
    </div>
    <div class="stat-tiles">
      <div class="stat-tile"><div class="stat-value${d.observations_matched === null ? " dash" : ""}">${fmtNum(d.observations_matched)}</div><div class="stat-label">dopasowane obserwacje</div></div>
      <div class="stat-tile"><div class="stat-value${d.segments_corrected === null ? " dash" : ""}">${fmtNum(d.segments_corrected)}</div><div class="stat-label">skorygowane odcinki</div></div>
      <div class="stat-tile"><div class="stat-value${d.recording_dirs === null ? " dash" : ""}">${fmtNum(d.recording_dirs)}</div><div class="stat-label">katalog(i) nagrania</div></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">Static vs realized — średnie opóźnienie wg czasu rozkładowego</div>
      ${chartBlock}
      <p class="chart-caption">Ten PNG nie jest renderowany przez tę stronę — to gotowy plik z release'u
        <code>${d.release_tag}</code>, wygenerowany przez
        <code>tools/analysis/gtfs_static_vs_realized_diff.py</code> (matplotlib) bezpośrednio z różnicy
        statycznego i „zrealizowanego” GTFS — nie z CSV; CSV to osobny, równoległy eksport tych samych
        danych z tego samego przebiegu skryptu, nie źródło wykresu.${summaryLine}</p>
    </div>
    <div class="downloads-detail">
      ${dlRow("📦 GTFS skorygowany — mediana (P50)", d.assets.p50)}
      ${dlRow("📦 GTFS skorygowany — 85. percentyl (P85)", d.assets.p85)}
      ${dlRow("🗺️ Statyczny GTFS użyty do tego builda", d.assets.static_gtfs)}
      ${dlRow("📈 Wykres static-vs-realized (PNG)", d.assets.diff_chart)}
      ${dlRow("📄 Zestawienie różnic (CSV)", d.assets.diff_summary)}
    </div>`;
}

// --- main render dispatcher ----------------------------------------------------------------------
function render() {
  const content = document.getElementById("content");
  const q = document.getElementById("q");
  const note = document.getElementById("scopeNote");
  const pageTitle = document.getElementById("pageTitle");
  const crumbsEl = document.getElementById("crumbs");
  const controls = document.querySelector(".controls");

  if (state.loadStatus === "loading") {
    crumbsEl.innerHTML = "";
    pageTitle.style.display = "none";
    controls.style.display = "none";
    note.style.display = "none";
    content.innerHTML = renderLoadingHtml();
    return;
  }
  if (state.loadStatus === "error") {
    crumbsEl.innerHTML = "";
    pageTitle.style.display = "none";
    controls.style.display = "none";
    note.style.display = "none";
    content.innerHTML = renderErrorHtml(state.loadError);
    return;
  }

  setCrumbs();
  updateDataBadge();
  document.getElementById("compareNavBtn").classList.toggle("active", state.level === "compare");
  note.style.display = "block";
  q.style.display = (state.level === "detail" || state.level === "compare") ? "none" : "";
  controls.style.display = (state.level === "detail" || state.level === "compare") ? "none" : "flex";
  pageTitle.style.display = state.level === "detail" ? "none" : "block";

  if (state.level === "compare") {
    pageTitle.textContent = "Porównanie miast";
    const range = state.compareRange;
    if (!state.manifest.length) {
      content.innerHTML = `<div class="empty">Brak miast w danych.</div>`;
      note.innerHTML = `<b>Porównanie miast:</b> brak miast w załadowanym manifeście.`;
      return;
    }
    const rows = state.manifest
      .slice()
      .sort((a, b) => a.display.localeCompare(b.display, "pl"))
      .map((city) => ({ city, agg: cityDelayAggregate(city, range) }))
      .sort(compareRowComparator);
    const now = new Date(todayIso());
    const rangeLabel = range === "month"
      ? `bieżący miesiąc (${MONTHS_PL[now.getUTCMonth()]} ${now.getUTCFullYear()})`
      : "cały dostępny okres";
    content.innerHTML = `
      <div class="range-toggle" role="group" aria-label="Zakres czasu">
        <button class="range-btn${range === "month" ? " active" : ""}" data-range="month" aria-pressed="${range === "month"}">Bieżący miesiąc</button>
        <button class="range-btn${range === "all" ? " active" : ""}" data-range="all" aria-pressed="${range === "all"}">Cały dostępny okres</button>
      </div>
      ${compareTableHtml(rows)}`;
    content.querySelectorAll("[data-range]").forEach((btn) => {
      btn.onclick = () => { state.compareRange = btn.dataset.range; render(); };
    });
    content.querySelectorAll("thead button[data-csort]").forEach((btn) => {
      btn.onclick = () => {
        const key = btn.dataset.csort;
        if (state.compareSort === key) state.compareDir = state.compareDir === "asc" ? "desc" : "asc";
        else { state.compareSort = key; state.compareDir = key === "display" ? "asc" : "desc"; }
        render();
      };
    });
    note.innerHTML = `<b>Porównanie miast:</b> ranking wg opóźnień za ${rangeLabel}, liczony wyłącznie z danych już wczytanych w <code>manifest.json</code> (bez dodatkowych zapytań). „Opóźnione obserwacje" to wiersze <code>stop_times.txt</code> (obserwacje na przystanku), nie unikalne kursy — jeden opóźniony kurs generuje wiele zmienionych wierszy.`;

  } else if (state.level === "cities") {
    pageTitle.textContent = "Wszystkie miasta";
    q.placeholder = "Szukaj miasta…";
    let cities = state.manifest.slice().sort((a, b) => a.display.localeCompare(b.display, "pl"));
    const query = state.q.trim().toLowerCase();
    if (query) cities = cities.filter((c) => c.display.toLowerCase().includes(query) || c.id.includes(query));

    content.innerHTML = !cities.length
      ? `<div class="empty">Brak miast pasujących do „${escapeHtml(state.q)}”.</div>`
      : `<div class="grid">${cities.map((c) => {
          const m = cityMeta(c);
          const freshness = m.stale <= 1 ? `<span class="pill">✓ aktualne</span>`
            : m.stale <= 3 ? `<span class="pill warn">brak od ${m.stale} dni</span>`
            : `<span class="pill muted">brak od ${m.stale} dni</span>`;
          return `<button class="card" data-city="${c.id}">
              <div class="title"><span>${escapeHtml(c.display)}</span><span class="arrow">→</span></div>
              <div class="meta">${m.first} … ${m.last}</div>
              <div class="row-stats"><span class="pill muted">${m.count} dni</span>${freshness}</div>
            </button>`;
        }).join("")}</div>`;
    content.querySelectorAll("[data-city]").forEach((btn) => {
      btn.onclick = () => navigateTo("months", btn.dataset.city, null, null);
    });
    note.innerHTML = `<b>Poziom 1 z 4:</b> miasta posortowane alfabetycznie. Kliknij, żeby zobaczyć miesiące.`;

  } else if (state.level === "months") {
    const c = state.manifest.find((m) => m.id === state.cityId);
    pageTitle.textContent = c.display;
    q.placeholder = "Szukaj miesiąca (np. lipiec, 2026-06)…";
    let months = monthsFor(c);
    const query = state.q.trim().toLowerCase();
    if (query) months = months.filter(([ym]) => ym.includes(query) || MONTHS_PL[+ym.slice(5, 7) - 1].includes(query));

    content.innerHTML = !months.length
      ? `<div class="empty">Brak miesięcy pasujących do „${escapeHtml(state.q)}”.</div>`
      : `<div class="grid">${months.map(([ym, days]) => {
          const [y, m] = ym.split("-");
          const hasPartial = days.some((d) => d.status === "partial");
          const hasUnknown = days.some((d) => d.status === "unknown");
          return `<button class="card" data-ym="${ym}">
              <div class="title"><span>${MONTHS_PL[+m - 1]} ${y}</span><span class="arrow">→</span></div>
              <div class="meta">${days[0].date} … ${days[days.length - 1].date}</div>
              <div class="row-stats">
                <span class="pill muted">${days.length} dni</span>
                ${hasPartial ? '<span class="pill warn">częściowe pokrycie</span>' : ""}
                ${hasUnknown ? '<span class="pill unknown">dni bez danych</span>' : ""}
              </div>
              ${delaySummaryHtml(days)}
            </button>`;
        }).join("")}</div>`;
    content.querySelectorAll("[data-ym]").forEach((btn) => {
      btn.onclick = () => navigateTo("days", state.cityId, btn.dataset.ym, null);
    });
    note.innerHTML = `<b>Poziom 2 z 4:</b> miesiące dla <b>${escapeHtml(c.display)}</b>, najnowszy na górze.`;

  } else if (state.level === "days") {
    const c = state.manifest.find((m) => m.id === state.cityId);
    const [titleY, titleM] = state.month.split("-");
    pageTitle.textContent = `${c.display} — ${MONTHS_PL[+titleM - 1]} ${titleY}`;
    q.placeholder = "Szukaj dnia (np. 07-16)…";
    const monthDays = c.days.filter((d) => d.date.slice(0, 7) === state.month);
    let days = monthDays;
    const query = state.q.trim().toLowerCase();
    if (query) days = days.filter((d) => d.date.includes(query));
    days = days.slice().sort(dayComparator);

    const sortInd = (key) => (state.sort === key ? (state.dir === "asc" ? "ascending" : "descending") : "none");
    content.innerHTML = (!days.length
      ? `<div class="empty">Brak dni pasujących do „${escapeHtml(state.q)}”.</div>`
      : `<div class="table-wrap"><table>
          <thead><tr>
            <th><button data-sort="date" aria-sort="${sortInd("date")}">Data</button></th>
            <th>Dzień tyg.</th>
            <th>Pokrycie</th>
            <th><button data-sort="observations_matched" aria-sort="${sortInd("observations_matched")}">Dopasowane obs.</button></th>
            <th><button data-sort="segments_corrected" aria-sort="${sortInd("segments_corrected")}">Skorygowane odc.</button></th>
            <th>Pliki</th>
          </tr></thead>
          <tbody>${days.map((d) => `
            <tr class="day-row" data-date="${d.date}" tabindex="0" role="button" aria-label="Pokaż szczegóły i wykres dla ${d.date}">
              <td class="date">${d.date}</td>
              <td>${weekdayPl(d.date)}</td>
              <td><span class="cov">${fmtCoverage(d.coverage_ranges)}</span> ${statusPillHtml(d.status)}</td>
              <td class="num">${fmtNum(d.observations_matched)}</td>
              <td class="num">${fmtNum(d.segments_corrected)}</td>
              <td><div class="dl" onclick="event.stopPropagation()">
                ${dlChip("P50", d.assets.p50)}
                ${dlChip("P85", d.assets.p85)}
                ${dlChip("static", d.assets.static_gtfs)}
                ${dlChip("diff", d.assets.diff_chart)}
                ${d.release_url ? `<a class="ext" href="${d.release_url}" target="_blank" rel="noopener">release ↗</a>` : ""}
              </div></td>
            </tr>`).join("")}</tbody>
        </table></div>`) + dayTrendPanelHtml(monthDays);
    content.querySelectorAll("thead button[data-sort]").forEach((btn) => {
      btn.onclick = () => {
        const key = btn.dataset.sort;
        if (state.sort === key) state.dir = state.dir === "asc" ? "desc" : "asc";
        else { state.sort = key; state.dir = "asc"; }
        render();
      };
    });
    content.querySelectorAll("tr.day-row").forEach((tr) => {
      const open = () => navigateTo("detail", state.cityId, state.month, tr.dataset.date);
      tr.onclick = open;
      tr.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
    });
    wireDayTrendTooltip(monthDays);
    const [y, m] = state.month.split("-");
    note.innerHTML = `<b>Poziom 3 z 4:</b> dni w ${MONTHS_PL[+m - 1]} ${y} dla <b>${escapeHtml(c.display)}</b>, chronologicznie. Kliknij wiersz, żeby zobaczyć wykres tego dnia.`;

  } else if (state.level === "detail") {
    const c = state.manifest.find((m) => m.id === state.cityId);
    const d = c.days.find((x) => x.date === state.date);
    content.innerHTML = renderDetail(c, d);
    note.innerHTML = `<b>Poziom 4 z 4:</b> szczegóły jednego dnia — dokładnie te pliki, które dziś trafiają do release'u <code>${d.release_tag}</code>, wykres PNG osadzony wprost z tego release'u.`;
  }
}

document.getElementById("q").addEventListener("input", (e) => { state.q = e.target.value; render(); });
document.getElementById("compareNavBtn").addEventListener("click", () => navigateTo("compare", null, null, null));

// Browser back/forward moves through the hash history built by navigateTo(); re-sync state from
// whatever hash we land on (only once the manifest is loaded — before that, applyHash has
// nothing to validate against, and loadManifest() calls applyHash() itself once it resolves).
window.addEventListener("hashchange", () => {
  if (state.loadStatus === "loaded") applyHash();
});

render();
loadManifest();
