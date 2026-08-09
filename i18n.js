"use strict";

// Lightweight PL/EN i18n for the language toggle — no build step, no library (see PRD.md /
// the language-toggle plan). Flat string dictionaries keyed by short ids, {placeholder}
// substitution in t(). Loaded before app.js (no `defer`) so getLang()/t() are ready before
// app.js's first render() call.

const LANG_STORAGE_KEY = "gtfsDashboardLang";

const MONTHS = {
  pl: ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
       "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"],
  en: ["January", "February", "March", "April", "May", "June",
       "July", "August", "September", "October", "November", "December"],
};
// Indexed by Date#getUTCDay() (0 = Sunday) — dates are parsed as UTC (bare "YYYY-MM-DD"), same
// convention app.js's daysBetween()/weekdayName() rely on.
const WEEKDAYS = {
  pl: ["niedz", "pon", "wt", "śr", "czw", "pt", "sob"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

const STRINGS = {
  pl: {
    // topbar / static shell
    homeAriaLabel: "Strona główna — wszystkie miasta",
    brandSub: "/ katalog nagrań GTFS-RT",
    navCompare: "Porównanie miast",
    navBackups: "Kopie zapasowe",
    navHowItWorks: "Jak to działa",
    langToggleAriaLabel: "Przełącz język",
    searchPlaceholderDefault: "Szukaj…",
    loadingTitle: "Ładowanie danych…",

    // chart showcase (static section)
    showcaseTitle: "Co można zrobić z tych danych",
    showcaseIntroHtml: 'Te same nagrania GTFS-RT (Family A) posłużyły też do policzenia piętnastu wykresów\n      punktualności, regularności i prędkości w narzędziu\n      <code>transit_charts</code> z repozytorium <code>easy-OTP</code> — poniżej osiem\n      przykładów z Łodzi. Pełny katalog, z opisem każdego wykresu i gotowymi komendami, jest w\n      <a href="https://github.com/GISBoost/easy-OTP/blob/main/tools/transit_charts/README.md" target="_blank" rel="noopener">tools/transit_charts</a>.',
    chartD15Title: "D15 · strata systematyczna czy losowa",
    chartD15Desc: "Każdy segment trasy jako jeden punkt z kilku dni: w poziomie — jak bardzo jest systematycznie spóźniony, w pionie — jak bardzo to się zmienia dzień w dzień. Prawy dolny róg to segment do przetestowania rozkładu, lewy górny — problem infrastruktury, nie planu.",
    chartB7Title: "B7 · odstępy między pojazdami",
    chartB7Desc: "Rozkład odstępów między kolejnymi pojazdami tej samej linii, godzina po godzinie. Dwa garby zamiast jednego zdradzają pojazdy „zbijające się” w pary.",
    chartC11Title: "C11 · punktualność w ciągu dnia",
    chartC11Desc: "Udział kursów punktualnych, spóźnionych i bardzo spóźnionych, godzina po godzinie. Gdy zielony pas się kurczy, coś na trasie zaczyna szwankować.",
    chartD17Title: "D17 · zapas w rozkładzie",
    chartD17Desc: "Czerwony odcinek trasy to rozkład zaplanowany za ciasno (opóźnienie wpisane w harmonogram), niebieski — zbyt luźno, więc pojazdy czekają na przystanku.",
    chartB5Title: "B5 · regularność, przystanek × godzina",
    chartB5Desc: "Ta sama linia rozłożona na siatkę: wiersze to przystanki, kolumny to godziny. Pionowy czerwony pas pokazuje przystanek, na którym service zawsze traci rytmiczność.",
    chartD14Title: "D14 · prędkość, segment × pasmo czasu",
    chartD14Desc: "Wiersze to kolejne odcinki trasy, kolumny to pory dnia, kolor to mediana prędkości. Ciemny wiersz to odcinek zawsze wolny; ciemna kolumna to pora, kiedy zwalnia cała trasa — przecięcie obu jest najbardziej warte uwagi.",
    chartH29Title: "H29 · ranking strat czasu, cała sieć",
    chartH29Desc: "Ranking wszystkich linii według strat czasu z powodu nieregularności. Lewy panel pokazuje, gdzie tracimy najwięcej minut pasażerskich, prawy — która linia jest proporcjonalnie najgorsza. To dwa różne pytania, nie sprzeczne odpowiedzi.",
    chartE20Title: "E20 · ten sam artefakt w 7 miastach",
    chartE20Desc: "Sztucznie wydłużony pierwszy odcinek trasy (odstój na pętli, nie prawdziwe opóźnienie) zmierzony naraz w siedmiu miastach. Rzym i Boston pokazują go wyraźnie, Łódź — praktycznie wcale.",
    chartLinkLabel: "Zobacz w easy-OTP →",

    // footer
    footerDataPrefix: "Dane:",
    visitorCounterAriaLabel: "Liczba odwiedzin w tym miesiącu",
    visitorCounterSuffix: "odwiedzin w tym miesiącu",
    socialSourceEasyOtp: "Kod źródłowy: easy-OTP",

    // breadcrumbs / topbar state
    crumbsAllCities: "Wszystkie miasta",
    crumbsCompare: "Porównanie miast",
    crumbsBackups: "Kopie zapasowe",
    dataBadgeUpdated: "zaktualizowano: ",

    // loading / error
    errorTitle: "Nie udało się wczytać danych",
    errorBodyHtml: "Wystąpił problem z pobraniem <code>manifest.json</code> ({msg}).",
    errorLink: "Zobacz release'y bezpośrednio na GitHubie ↗",
    errorUnknown: "nieznany błąd",
    manifestShapeError: 'manifest.json ma nieoczekiwany kształt (brak pola "cities").',
    consoleLoadError: "Nie udało się wczytać manifest.json:",

    // monthly delay summary / trend panel
    delaySummaryEmpty: "brak danych o opóźnieniach za ten miesiąc",
    delayMean: "śr. opóźnienie: ",
    delayMax: "maks. opóźnienie: ",
    delayWorst: "najgorszy dzień: ",
    delayTrendTitle: "Trend opóźnień w tym miesiącu",
    delayTrendCaption: "Średnie opóźnienie obserwacji na dzień, w minutach (przerwy w linii = brak danych za ten dzień; najedź na linię, żeby zobaczyć wartość dla konkretnego dnia). Zakres w tym miesiącu: {lo} – {hi}.",

    // compare view
    compareTitle: "Porównanie miast",
    compareEmpty: "Brak miast w danych.",
    compareEmptyNoteHtml: "<b>Porównanie miast:</b> brak miast w załadowanym manifeście.",
    compareRangeAriaLabel: "Zakres czasu",
    compareRangeMonth: "Bieżący miesiąc",
    compareRangeAll: "Cały dostępny okres",
    compareRangeLabelMonth: "bieżący miesiąc ({month} {year})",
    compareRangeLabelAll: "cały dostępny okres",
    compareNoteHtml: "<b>Porównanie miast:</b> ranking wg opóźnień za {range}, liczony wyłącznie z danych już wczytanych w <code>manifest.json</code> (bez dodatkowych zapytań). „Opóźnione obserwacje” to wiersze <code>stop_times.txt</code> (obserwacje na przystanku), nie unikalne kursy — jeden opóźniony kurs generuje wiele zmienionych wierszy.",
    tableCity: "Miasto",
    tableMeanDelay: "Śr. opóźnienie",
    tableMeanAbsDelay: "Śr. bezwzględne opóźnienie",
    tableMaxDelay: "Maks. opóźnienie",
    tableDelayedObs: "Opóźnione obserwacje",

    // backups view
    backupsTitle: "Kopie zapasowe",
    backupsSearchPlaceholder: "Szukaj miesiąca (np. lipiec, 2026-07)…",
    backupsEmptyFiltered: "Brak miesięcy pasujących do „{q}”.",
    backupsEmptyNone: "Nie opublikowano jeszcze żadnej kopii zapasowej.",
    backupsPublished: "opublikowano {date}",
    backupsNoteHtml: "<b>Kopie zapasowe:</b> comiesięczne archiwa surowych snapshotów GPS (GTFS-RT VehiclePositions) użytych do zbudowania „zrealizowanego” rozkładu — publikowane automatycznie po zakończeniu każdego miesiąca, żeby dane nie musiały leżeć w nieskończoność na urządzeniu nagrywającym. Kliknij miesiąc, żeby zobaczyć pliki per miasto.",
    backupMonthTitle: "Kopie zapasowe — {month} {year}",
    viewReleaseLink: "zobacz release na GitHubie ↗",
    backupMonthNoteHtml: "<b>{n} {cities}</b> w tej kopii zapasowej. Każdy plik to skompresowane surowe snapshoty GTFS-RT (VehiclePositions) z {month} {year} dla danego miasta — rozpakuj 7-Zipem (pliki <code>.7z</code> od razu, pliki <code>.tar.xz</code> w dwóch krokach: <code>.xz</code>→<code>.tar</code>, potem <code>.tar</code>→pliki) i wskaż jako <code>--positions-dir</code> dla <code>family_a match</code>, żeby odtworzyć dopasowanie lokalnie.",

    // cities view
    citiesTitle: "Wszystkie miasta",
    citiesSearchPlaceholder: "Szukaj miasta…",
    citiesEmpty: "Brak miast pasujących do „{q}”.",
    daysCount: "{n} dni",
    citiesFreshOk: "✓ aktualne",
    citiesFreshStale: "brak od {n} dni",
    citiesNote: "<b>Poziom 1 z 4:</b> miasta posortowane alfabetycznie. Kliknij, żeby zobaczyć miesiące.",

    // months view
    monthsSearchPlaceholder: "Szukaj miesiąca (np. lipiec, 2026-06)…",
    monthsEmpty: "Brak miesięcy pasujących do „{q}”.",
    monthsPartial: "częściowe pokrycie",
    monthsUnknown: "dni bez danych",
    monthsNoteHtml: "<b>Poziom 2 z 4:</b> miesiące dla <b>{city}</b>, najnowszy na górze.",

    // days view
    daysSearchPlaceholder: "Szukaj dnia (np. 07-16)…",
    daysEmpty: "Brak dni pasujących do „{q}”.",
    tableDate: "Data",
    tableWeekday: "Dzień tyg.",
    tableCoverage: "Pokrycie",
    tableMatchedObs: "Dopasowane obs.",
    tableCorrectedSeg: "Skorygowane odc.",
    tableFiles: "Pliki",
    dayRowAriaLabel: "Pokaż szczegóły i wykres dla {date}",
    extReleaseLink: "release ↗",
    daysNoteHtml: "<b>Poziom 3 z 4:</b> dni w {month} {year} dla <b>{city}</b>, chronologicznie. Kliknij wiersz, żeby zobaczyć wykres tego dnia.",

    // day detail view
    detailNoteHtml: "<b>Poziom 4 z 4:</b> szczegóły jednego dnia — dokładnie te pliki, które dziś trafiają do release'u <code>{tag}</code>, wykres PNG osadzony wprost z tego release'u.",
    coverageLabel: "Pokrycie: ",
    coverageNoData: "brak danych o pokryciu",
    statusBuilt: "✓ zbudowane",
    statusPartial: "częściowe",
    statusUnknown: "stan nieznany",
    statMatchedObs: "dopasowane obserwacje",
    statCorrectedSeg: "skorygowane odcinki",
    statRecordingDirs: "katalog(i) nagrania",
    chartCardTitle: "Static vs realized — średnie opóźnienie wg czasu rozkładowego",
    chartImgAlt: "Wykres średniego opóźnienia (zrealizowane minus rozkładowe) w funkcji czasu rozkładowego, {city} {date}",
    chartFallbackNotLoaded: "Obraz nie wczytał się pod tym adresem.",
    chartFallbackOpenAnyway: "Otwórz link mimo to ↗",
    chartFallbackNoChart: "Wykres nie został wygenerowany dla tego dnia (np. same zerowe opóźnienia).",
    chartCaptionHtml: "Ten PNG nie jest renderowany przez tę stronę — to gotowy plik z release'u\n        <code>{tag}</code>, wygenerowany przez\n        <code>tools/analysis/gtfs_static_vs_realized_diff.py</code> (matplotlib) bezpośrednio z różnicy\n        statycznego i „zrealizowanego” GTFS — nie z CSV; CSV to osobny, równoległy eksport tych samych\n        danych z tego samego przebiegu skryptu, nie źródło wykresu.",
    summaryLineHtml: " Dostępna alternatywa danych (tabela): <a href=\"{url}\" target=\"_blank\" rel=\"noopener\">plik CSV</a>.",
    dlP50: "📦 GTFS skorygowany — mediana (P50)",
    dlP85: "📦 GTFS skorygowany — 85. percentyl (P85)",
    dlStaticGtfs: "🗺️ Statyczny GTFS użyty do tego builda",
    dlChart: "📈 Wykres static-vs-realized (PNG)",
    dlSummaryCsv: "📄 Zestawienie różnic (CSV)",
    dlTidyTable: "📊 Tabela źródłowa wykresów (tidy table, CSV.GZ)",
    dlGoLabel: "pobierz ↗",
    tidyTableCaptionHtml: "Ta tabela to dokładne wejście, które czyta\n          <code>transit_charts chart</code> — zawiera jeden wiersz na zaplanowane minięcie\n          przystanku dla całego dnia. Instrukcja, jak z niej lokalnie odtworzyć wykresy:\n          <a href=\"https://github.com/GISBoost/easy-OTP/tree/main/tools/transit_charts#readme\" target=\"_blank\" rel=\"noopener\">README narzędzia transit_charts ↗</a>.",
    bulkExportButton: "Pobierz wszystkie ({n} {files}) — CSV",
    bulkExportInProgress: "Pobieranie… ({done}/{total})",
    bulkExportWaitOther: "Poczekaj, trwa pobieranie dla innego miesiąca…",
  },
  en: {
    homeAriaLabel: "Home — all cities",
    brandSub: "/ GTFS-RT recording catalog",
    navCompare: "City comparison",
    navBackups: "Backups",
    navHowItWorks: "How it works",
    langToggleAriaLabel: "Switch language",
    searchPlaceholderDefault: "Search…",
    loadingTitle: "Loading data…",

    showcaseTitle: "What you can do with this data",
    showcaseIntroHtml: 'These same GTFS-RT recordings (Family A) were also used to compute fifteen\n      punctuality, regularity and speed charts with the\n      <code>transit_charts</code> tool from the <code>easy-OTP</code> repository — eight\n      examples from Łódź below. The full catalog, with a description of every chart and ready-to-run\n      commands, is in\n      <a href="https://github.com/GISBoost/easy-OTP/blob/main/tools/transit_charts/README.md" target="_blank" rel="noopener">tools/transit_charts</a>.',
    chartD15Title: "D15 · systematic vs. random loss",
    chartD15Desc: "Every route segment as one point across several days: horizontally — how systematically late it is, vertically — how much that varies day to day. Bottom-right is a segment worth re-testing the schedule against; top-left is an infrastructure problem, not a planning one.",
    chartB7Title: "B7 · headway distribution",
    chartB7Desc: "Distribution of gaps between consecutive vehicles on the same line, hour by hour. Two humps instead of one reveal vehicles “bunching” into pairs.",
    chartC11Title: "C11 · punctuality through the day",
    chartC11Desc: "Share of on-time, late and very late trips, hour by hour. When the green band shrinks, something on the route is starting to go wrong.",
    chartD17Title: "D17 · schedule slack",
    chartD17Desc: "A red route segment is scheduled too tightly (delay baked into the timetable); blue is too loose, so vehicles wait at the stop.",
    chartB5Title: "B5 · regularity, stop × hour",
    chartB5Desc: "The same line laid out on a grid: rows are stops, columns are hours. A vertical red band shows the stop where the service always loses its rhythm.",
    chartD14Title: "D14 · speed, segment × time band",
    chartD14Desc: "Rows are consecutive route segments, columns are times of day, color is median speed. A dark row is a segment that's always slow; a dark column is a time when the whole route slows down — the intersection of both is worth the closest look.",
    chartH29Title: "H29 · network-wide time-loss ranking",
    chartH29Desc: "Ranking of all lines by time lost to irregularity. The left panel shows where the most passenger-minutes are lost; the right shows which line is proportionally worst. Two different questions, not conflicting answers.",
    chartE20Title: "E20 · the same artifact across 7 cities",
    chartE20Desc: "An artificially stretched first route segment (layover at the loop, not a real delay) measured at once across seven cities. Rome and Boston show it clearly; Łódź — almost not at all.",
    chartLinkLabel: "See in easy-OTP →",

    footerDataPrefix: "Data:",
    visitorCounterAriaLabel: "Number of visits this month",
    visitorCounterSuffix: "visits this month",
    socialSourceEasyOtp: "Source code: easy-OTP",

    crumbsAllCities: "All cities",
    crumbsCompare: "City comparison",
    crumbsBackups: "Backups",
    dataBadgeUpdated: "updated: ",

    errorTitle: "Failed to load data",
    errorBodyHtml: "There was a problem fetching <code>manifest.json</code> ({msg}).",
    errorLink: "View releases directly on GitHub ↗",
    errorUnknown: "unknown error",
    manifestShapeError: 'manifest.json has an unexpected shape (missing "cities" field).',
    consoleLoadError: "Failed to load manifest.json:",

    delaySummaryEmpty: "no delay data for this month",
    delayMean: "avg delay: ",
    delayMax: "max delay: ",
    delayWorst: "worst day: ",
    delayTrendTitle: "Delay trend this month",
    delayTrendCaption: "Average observation delay per day, in minutes (gaps in the line = no data for that day; hover the line to see the value for a specific day). Range this month: {lo} – {hi}.",

    compareTitle: "City comparison",
    compareEmpty: "No cities in the data.",
    compareEmptyNoteHtml: "<b>City comparison:</b> no cities in the loaded manifest.",
    compareRangeAriaLabel: "Time range",
    compareRangeMonth: "Current month",
    compareRangeAll: "Entire available period",
    compareRangeLabelMonth: "the current month ({month} {year})",
    compareRangeLabelAll: "the entire available period",
    compareNoteHtml: "<b>City comparison:</b> ranking by delay for {range}, computed entirely from data already loaded in <code>manifest.json</code> (no extra requests). “Delayed observations” are <code>stop_times.txt</code> rows (per-stop observations), not unique trips — one delayed trip usually produces many changed rows.",
    tableCity: "City",
    tableMeanDelay: "Avg delay",
    tableMeanAbsDelay: "Avg absolute delay",
    tableMaxDelay: "Max delay",
    tableDelayedObs: "Delayed observations",

    backupsTitle: "Backups",
    backupsSearchPlaceholder: "Search month (e.g. July, 2026-07)…",
    backupsEmptyFiltered: "No months match “{q}”.",
    backupsEmptyNone: "No backup has been published yet.",
    backupsPublished: "published {date}",
    backupsNoteHtml: "<b>Backups:</b> monthly archives of the raw GPS snapshots (GTFS-RT VehiclePositions) used to build the “realized” schedule — published automatically after each month ends, so the data doesn't have to sit on the recording device forever. Click a month to see the files per city.",
    backupMonthTitle: "Backups — {month} {year}",
    viewReleaseLink: "view release on GitHub ↗",
    backupMonthNoteHtml: "<b>{n} {cities}</b> in this backup. Each file is a compressed archive of raw GTFS-RT snapshots (VehiclePositions) from {month} {year} for that city — unpack it with 7-Zip (<code>.7z</code> files directly, <code>.tar.xz</code> files in two steps: <code>.xz</code>→<code>.tar</code>, then <code>.tar</code>→files) and point <code>family_a match</code>'s <code>--positions-dir</code> at it to reproduce the matching locally.",

    citiesTitle: "All cities",
    citiesSearchPlaceholder: "Search city…",
    citiesEmpty: "No cities match “{q}”.",
    daysCount: "{n} days",
    citiesFreshOk: "✓ up to date",
    citiesFreshStale: "missing for {n} days",
    citiesNote: "<b>Level 1 of 4:</b> cities sorted alphabetically. Click one to see its months.",

    monthsSearchPlaceholder: "Search month (e.g. July, 2026-06)…",
    monthsEmpty: "No months match “{q}”.",
    monthsPartial: "partial coverage",
    monthsUnknown: "days without data",
    monthsNoteHtml: "<b>Level 2 of 4:</b> months for <b>{city}</b>, newest first.",

    daysSearchPlaceholder: "Search day (e.g. 07-16)…",
    daysEmpty: "No days match “{q}”.",
    tableDate: "Date",
    tableWeekday: "Weekday",
    tableCoverage: "Coverage",
    tableMatchedObs: "Matched obs.",
    tableCorrectedSeg: "Corrected seg.",
    tableFiles: "Files",
    dayRowAriaLabel: "Show details and chart for {date}",
    extReleaseLink: "release ↗",
    daysNoteHtml: "<b>Level 3 of 4:</b> days in {month} {year} for <b>{city}</b>, chronologically. Click a row to see that day's chart.",

    detailNoteHtml: "<b>Level 4 of 4:</b> details for a single day — exactly the files that today ship in release <code>{tag}</code>, with the PNG chart embedded straight from that release.",
    coverageLabel: "Coverage: ",
    coverageNoData: "no coverage data",
    statusBuilt: "✓ built",
    statusPartial: "partial",
    statusUnknown: "unknown status",
    statMatchedObs: "matched observations",
    statCorrectedSeg: "corrected segments",
    statRecordingDirs: "recording director(y/ies)",
    chartCardTitle: "Static vs realized — average delay by scheduled time",
    chartImgAlt: "Chart of average delay (realized minus scheduled) as a function of scheduled time, {city} {date}",
    chartFallbackNotLoaded: "The image failed to load at this address.",
    chartFallbackOpenAnyway: "Open the link anyway ↗",
    chartFallbackNoChart: "No chart was generated for this day (e.g. all delays were zero).",
    chartCaptionHtml: "This PNG is not rendered by this site — it's a ready-made file from release\n        <code>{tag}</code>, generated by\n        <code>tools/analysis/gtfs_static_vs_realized_diff.py</code> (matplotlib) directly from the\n        difference between the static and “realized” GTFS — not from the CSV; the CSV is a separate,\n        parallel export of the same data from the same script run, not the source of the chart.",
    summaryLineHtml: " An alternative data view (table) is available: <a href=\"{url}\" target=\"_blank\" rel=\"noopener\">CSV file</a>.",
    dlP50: "📦 Corrected GTFS — median (P50)",
    dlP85: "📦 Corrected GTFS — 85th percentile (P85)",
    dlStaticGtfs: "🗺️ Static GTFS used for this build",
    dlChart: "📈 Static-vs-realized chart (PNG)",
    dlSummaryCsv: "📄 Diff summary (CSV)",
    dlTidyTable: "📊 Chart source table (tidy table, CSV.GZ)",
    dlGoLabel: "download ↗",
    tidyTableCaptionHtml: "This table is the exact input read by\n          <code>transit_charts chart</code> — one row per scheduled stop visit for the whole day.\n          Instructions for reproducing the charts from it locally:\n          <a href=\"https://github.com/GISBoost/easy-OTP/tree/main/tools/transit_charts#readme\" target=\"_blank\" rel=\"noopener\">transit_charts tool README ↗</a>.",
    bulkExportButton: "Download all ({n} {files}) — CSV",
    bulkExportInProgress: "Downloading… ({done}/{total})",
    bulkExportWaitOther: "Please wait, a download for another month is already in progress…",
  },
};

let onLangChange = null;
function setLangChangeHandler(fn) { onLangChange = fn; }

function getLang() {
  return localStorage.getItem(LANG_STORAGE_KEY) === "en" ? "en" : "pl";
}

function setLang(lang) {
  const next = lang === "en" ? "en" : "pl";
  localStorage.setItem(LANG_STORAGE_KEY, next);
  document.documentElement.lang = next;
  applyStaticI18n();
  updateLangToggleButton();
  if (onLangChange) onLangChange();
}

function t(key, vars) {
  const dict = STRINGS[getLang()];
  let str = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
  if (vars) {
    Object.keys(vars).forEach((k) => { str = str.split(`{${k}}`).join(vars[k]); });
  }
  return str;
}

function monthName(index) { return MONTHS[getLang()][index]; }
function weekdayName(dateStr) { return WEEKDAYS[getLang()][new Date(dateStr).getUTCDay()]; }
function dtLocale() { return getLang() === "en" ? "en-US" : "pl-PL"; }

// Polish grammatical plurals need three forms (1 / 2-4 / 5+, with a 12-14 exception); English only
// needs singular/plural — two small lang-branching helpers beat a generic pluralization engine for
// these two call sites (city counts, file counts).
function cityCountLabel(n) {
  if (getLang() === "en") return n === 1 ? "city" : "cities";
  if (n === 1) return "miasto";
  const mod10 = n % 10, mod100 = n % 100;
  return mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14) ? "miasta" : "miast";
}
function fileCountLabel(n) {
  if (getLang() === "en") return n === 1 ? "file" : "files";
  if (n === 1) return "plik";
  const mod10 = n % 10, mod100 = n % 100;
  return mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14) ? "pliki" : "plików";
}

function applyStaticI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel)); });
}
function updateLangToggleButton() {
  const btn = document.getElementById("langToggleBtn");
  if (btn) btn.textContent = getLang() === "pl" ? "EN" : "PL";
}

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.lang = getLang();
  applyStaticI18n();
  updateLangToggleButton();
  const btn = document.getElementById("langToggleBtn");
  if (btn) btn.addEventListener("click", () => setLang(getLang() === "pl" ? "en" : "pl"));
});
