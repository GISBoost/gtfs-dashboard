# Claude Code prompts — gtfs-dashboard (`GD-1`, `GD-2`)

> This is a small, standalone static site — **two milestones total**, not a large
> multi-stage rollout. Implements `PRD.md` in full; `HANDOFF.md` has the conversation
> this came from if you need more background than the PRD gives. `CLAUDE.md` has hard
> constraints — read it before either prompt below.
>
> **Reuse discipline:** `mockup-reference.html` in this same folder is a fully working,
> iteratively-refined mockup of the UI (fake data hardcoded in JS). **Do not redesign
> the UI from scratch** — GD-1 below is largely "take this mockup, replace its
> hardcoded `manifest` array with a `fetch("manifest.json")` call, keep everything
> else." Re-derive layout/interaction decisions from the mockup, not from prose
> descriptions in the PRD.
>
> English throughout (code, comments, commit messages) — same convention as
> `easy-OTP`/`easy-GTFS-RT`. This project's own planning docs (`PRD.md`, `HANDOFF.md`,
> `CLAUDE.md`) are in Polish; that's deliberate, don't "fix" it.

---

# Prompt GD-1 — static frontend against a sample manifest

> Paste into Claude Code running inside a fresh clone/init of `gtfs-dashboard` (the
> repo Michał creates per the open question in `PRD.md` section 7 — if it doesn't
> exist yet when you start this prompt, stop and ask rather than guessing a name and
> proceeding). This milestone builds and visually verifies the entire UI against a
> **hand-written sample `manifest.json`** — it does not need GD-2's generator workflow
> to exist yet, so it's fully testable on its own.

## Context to load first
- `PRD.md` in full, especially section 4 (manifest schema — every field's exact name
  and nullability) and section 5 (UI requirements — mostly "match the mockup, plus
  these specific additions").
- `mockup-reference.html` in this folder — read the whole file. This is the actual
  spec for markup/CSS/JS structure, drill-down levels, breadcrumbs, accessibility
  fixes (keyboard-operable day rows, per-level `<h1>`), and the chart section (embeds
  a PNG via `<img>` with an `onerror` fallback — already correct in the mockup, not a
  synthetic canvas chart, don't reintroduce one).
- `CLAUDE.md` — no framework, no build step, no bundler.

## Goal (from PRD section 1, 5)
A working `index.html` (+ separate `.css`/`.js` files, or inline like the mockup —
your call, but prefer splitting into `styles.css`/`app.js` for a real repo rather than
one giant inline file, since this is no longer a throwaway mockup) that renders the
full city → month → day → detail drill-down against a real `fetch()`'d
`manifest.json`, visually and functionally matching `mockup-reference.html`.

## What it does
Same UI as the mockup, with its hardcoded sample `manifest` array replaced by an
actual `fetch("manifest.json")` call, plus the loading/error/unknown-status states the
mockup didn't need (PRD section 5, point 8) since it never had to handle a real
network request.

## Plan implementacji

1. Repo layout:
   ```
   gtfs-dashboard/
     index.html
     styles.css
     app.js
     manifest.sample.json   <- hand-written, for local dev/testing only, see step 2
     .nojekyll               <- empty file, required for plain static Pages serving
   ```
2. Write `manifest.sample.json` by hand — a small but representative sample (3-4
   cities, a few months each, at least one day with `status: "partial"`, at least one
   with `status: "unknown"` (all four PRD-section-3.4 fields `null`), at least one
   with `assets.diff_chart: null` and one with a real-shaped-but-fake chart URL to
   exercise the `onerror` fallback) — matches the schema in `PRD.md` section 4
   exactly, including the `null`-able fields. This file is never read by the deployed
   site in production (GD-2's generated `manifest.json` replaces it) — it exists so
   this milestone is testable via a local static server before GD-2's workflow exists.
3. Port the mockup's HTML/CSS/JS, with these specific changes:
   - Replace the hardcoded `manifest` array and its `city()`/`day()` builder functions
     with: `fetch("manifest.json").then(r => r.json())`, falling back to
     `manifest.sample.json` **only** when running locally without a real manifest yet
     (e.g. try `manifest.json`, and if that 404s during local dev, note this in a
     console warning and let the developer manually point `<script src>` at the sample
     — do not silently and permanently bake in a fallback-to-sample in the shipped
     `app.js`; the production site must fail loudly per PRD section 5 point 8 if
     `manifest.json` is missing, not silently substitute fake data).
   - Add a loading state: show a small message/spinner while the fetch is in flight.
   - Add an error state: if the fetch rejects or the response isn't OK, show a clear
     message with a link to `https://github.com/GISBoost/easy-GTFS-RT/releases` as a
     manual fallback — never render an empty page with no explanation.
   - Add the `status: "unknown"` badge (neutral, not the mockup's green "ok" or amber
     "partial" — PRD section 5 point 8) everywhere the mockup currently only handles
     `ok`/`partial`.
   - Handle every nullable manifest field per PRD section 4: a `null` stat shows a
     dash/"no data" placeholder, a `null` asset URL hides that download link/button
     entirely rather than linking to `null`.
   - Everything else (grid cards for cities/months, sortable day table with
     keyboard-accessible rows, per-level `<h1>` in `#pageTitle`, breadcrumbs,
     light/dark theme tokens, the chart `<img>` + `onerror` fallback) — copy as-is.
4. `.nojekyll`: create as an empty file at repo root — GitHub Pages runs content
   through Jekyll by default unless this file is present; not strictly required for
   this site's current file names, but standard practice for a plain static site and
   cheap insurance against Jekyll silently mangling something later (e.g. a future
   filename starting with `_`).

## Hard constraints (from `CLAUDE.md`)
- No framework, no build step, no npm/bundler — plain files GitHub Pages serves
  directly.
- Don't redesign the UI — port the mockup, don't reinvent it.
- Don't bake a permanent silent fallback to `manifest.sample.json` into the shipped
  `app.js` (see step 3 above) — the production failure mode must be visible, not
  papered over.
- English throughout.

## Step 0 — setup
1. Confirm you're inside the `gtfs-dashboard` repo (ask if unsure whether it exists
   yet and under what remote — do not `git init` a throwaway local-only repo and
   proceed as if that's the real thing without checking with Michał first, per
   `CLAUDE.md`'s "don't create repos without being asked").
2. No existing test suite (new repo).

## Tests
No pytest/JS test suite for a static site this size. Validate by:
- Opening `index.html` via a local static server (e.g. `py -m http.server`, per this
  user's Python-invocation convention — not a bare `python`) pointed at
  `manifest.sample.json` (temporarily copy/rename it to `manifest.json` for this local
  test, or adjust the fetch path — your call, just don't ship that temporary hack).
- Manually walking all 4 levels, both themes (toggle OS/browser dark-mode setting),
  keyboard-only navigation (Tab + Enter/Space) through at least one full city → month
  → day → detail path.
- Triggering the error state by pointing the fetch at a URL that 404s, confirming the
  fallback message renders instead of a blank page.

## Finish order — STOP for human verification BEFORE reviewing or committing
1. Finish the files.
2. **STOP and hand off to Michał.** Ask him to open `index.html` locally (or via a
   quick local server) and click through all 4 levels in both themes.
3. **After his confirmation:** fix anything he flags.
4. **Then** commit: `feat: static frontend against sample manifest (GD-1)`.

## Human verification (manual step)
1. Serve the folder locally, confirm all 4 drill-down levels render against
   `manifest.sample.json`.
2. Toggle light/dark (OS setting or browser devtools) — confirm both look correct,
   not just "not broken."
3. Tab through a city → month → day → detail path using only the keyboard; confirm
   Enter/Space opens the day-row into detail view.
4. Confirm a day with `assets.diff_chart: null` in the sample shows the "no chart"
   state cleanly, not a broken image icon.
5. Confirm a `status: "unknown"` day shows a distinct, neutral badge — not green or
   amber.

---

# Prompt GD-2 — manifest-generation workflow + Pages deploy

> Paste into Claude Code running inside the same `gtfs-dashboard` repo, **after GD-1
> is committed**. This milestone adds the GitHub Actions workflow that regenerates
> `manifest.json` from `GISBoost/easy-GTFS-RT`'s public Releases API, and wires up
> GitHub Pages so pushes actually publish.

## Context to load first
- `PRD.md` sections 3 (data source, in full — the exact tag pattern, the exact `body`
  regexes, the exact asset filename patterns, the status heuristic) and 4 (manifest
  schema) — this milestone's entire job is producing a `manifest.json` that matches
  section 4 exactly, sourced per section 3's exact rules. Do not approximate the
  regexes from memory — copy them from the PRD verbatim.
- `CLAUDE.md` — pagination is mandatory (not optional), zero new secrets needed
  (public-repo read via the workflow's own `github.token`), never a fixed
  once-a-day/midnight schedule (PRD section 3.7 explains why, with the Boston/Brisbane
  timezone precedent from `easy-GTFS-RT`'s own history).

## Goal (from PRD section 3, 4, 6)
A scheduled (and manually re-triggerable) GitHub Actions workflow that rebuilds
`manifest.json` from scratch every run, commits it only if changed, and pushes — which
(via GitHub Pages' classic branch-deploy) is also the deploy mechanism, no separate
deploy job needed.

## What it does
1. Fetches `config/cities.json` from `easy-GTFS-RT` (raw, unauthenticated) for
   `display_name` per city.
2. Fetches **all** releases from `easy-GTFS-RT` via the REST API, paginating fully.
3. Filters to tags matching `^(?<city>[a-z0-9_]+)-realized-(?<date>\d{4}-\d{2}-\d{2})-phone$`,
   silently ignoring anything else.
4. For each matching release: regex-parses `body` for the four PRD-section-3.3 fields
   (each nullable on no-match — log a `::warning::` for that one release, keep going,
   never fail the whole run over one unparseable release), matches `assets[]` against
   the PRD-section-3.5 filename patterns (nullable if an asset genuinely isn't
   present), computes `status` per PRD section 3.4.
5. Groups by city, sorts each city's `days` ascending by date.
6. Writes `manifest.json`; commits + pushes only if the content actually changed
   (diff against the working tree — an unchanged manifest must not produce an empty
   commit or trigger a pointless Pages rebuild).

## Plan implementacji

1. New file: `.github/workflows/refresh-manifest.yml`:
   ```yaml
   name: Refresh manifest.json

   on:
     schedule:
       - cron: "*/30 * * * *"   # see PRD 3.7 — periodic, NOT once at midnight
     workflow_dispatch: {}

   permissions:
     contents: write

   jobs:
     refresh:
       runs-on: ubuntu-latest
       timeout-minutes: 10
       env:
         GH_TOKEN: ${{ github.token }}
         SOURCE_REPO: GISBoost/easy-GTFS-RT
       steps:
         - uses: actions/checkout@v4

         - name: Fetch config/cities.json (display names)
           run: |
             curl -fsSL "https://raw.githubusercontent.com/${SOURCE_REPO}/main/config/cities.json" \
               -o cities.json

         - name: Fetch all releases (paginated) and build manifest.json
           run: |
             set -euo pipefail
             gh api --paginate "repos/${SOURCE_REPO}/releases" > releases.json
             # <build manifest.json from releases.json + cities.json here — jq or a
             # small inline script; implement per PRD sections 3.2-3.5 exactly, do not
             # approximate the regexes>

         - name: Commit if changed
           run: |
             git config user.name "github-actions[bot]"
             git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
             if git diff --quiet -- manifest.json; then
               echo "No changes to manifest.json - skipping commit."
               exit 0
             fi
             git add manifest.json
             git commit -m "chore: refresh manifest.json"
             git push
   ```
   The "build manifest.json" step above is intentionally left as a placeholder in
   this prompt — **write it yourself** using `jq` against `releases.json`/`cities.json`
   (bash + `jq`, per `CLAUDE.md` — not Python, no dependency-install step for a task
   this size), following PRD sections 3.2–3.5's exact rules. Test it against a few
   real releases before considering this step done — see Tests below.
2. `gh api --paginate` already handles the `Link`-header pagination for you (this is
   why the prompt uses `gh api` rather than raw `curl` for the releases call, unlike
   `easy-GTFS-RT`'s own scripts which use plain `curl` to avoid installing `gh` on the
   phone — that constraint doesn't apply here, this runs on a normal
   `ubuntu-latest` runner where `gh` is preinstalled).
3. GitHub Pages setup (one-time, likely manual on GitHub.com rather than in code — ask
   Michał to confirm Pages is enabled for this repo, "Deploy from a branch", pointed
   at whichever branch this workflow pushes to): no separate deploy workflow needed,
   the commit+push above **is** the deploy trigger under classic branch-based Pages.

## Hard constraints (from `CLAUDE.md`, `PRD.md`)
- Pagination is mandatory — do not ship a version that only reads the first page and
  "works for now."
- No new secrets/PATs — `github.token` only.
- `cron` must be periodic (every 30-60 min, all day) — never a single fixed
  once-daily time. If you're tempted to simplify to "once at midnight UTC," stop and
  re-read PRD section 3.7 first.
- Manifest regeneration is always "from scratch" — never patch/append to the existing
  `manifest.json` incrementally. A day/release later deleted from `easy-GTFS-RT` must
  disappear from the manifest on the next run (acceptance criterion 2 in `PRD.md`).
- A single unparseable release `body` must degrade that release's stat fields to
  `null`, never fail the whole workflow run.
- English throughout.

## Step 0 — setup
1. Confirm inside the `gtfs-dashboard` repo, GD-1 already committed.
2. No existing test suite beyond GD-1's manual checks.

## Tests
No pytest suite (this is a GitHub Actions workflow + jq). Validate by:
- `workflow_dispatch`-running it manually at least once and inspecting the resulting
  `manifest.json` against a handful of *real* releases in `easy-GTFS-RT` you can check
  by eye on GitHub.com (spot-check that dates, asset URLs, and parsed stats actually
  match what's really in those releases' pages).
- Confirming a second manual run with no new upstream releases produces **no commit**
  (the "commit if changed" guard actually guards).
- Confirming a release whose `body` doesn't match the expected format (construct one
  by hand if needed, or reason through the regex against an edge case) degrades
  gracefully to `null` fields rather than crashing the step.

## Finish order — STOP for human verification BEFORE reviewing or committing
1. Finish the workflow file.
2. **STOP.** Verification requires a real run against the real `easy-GTFS-RT` and
   Michał confirming GitHub Pages is actually enabled/serving. Do not run
   milestone-reviewer or commit yet.
3. **After his confirmation:** fix anything flagged.
4. **Then** commit: `feat(ci): scheduled manifest.json refresh from easy-GTFS-RT (GD-2)`.

## Human verification (manual step, on GitHub.com)
1. Confirm GitHub Pages is enabled for `gtfs-dashboard` (Settings → Pages → "Deploy
   from a branch"), pointed at the branch this workflow pushes to.
2. Run the workflow via `workflow_dispatch`, confirm `manifest.json` appears/updates
   in the repo with real data from `easy-GTFS-RT`.
3. Visit `https://gisboost.github.io/gtfs-dashboard/` (or whatever URL Pages actually
   assigned — confirm it matches PRD section 2's prediction, flag it if not) and
   confirm the live site shows real cities/days, not the GD-1 sample data.
4. Wait for (or manually trigger a second time after) the next scheduled tick, confirm
   no spurious commit appears when nothing upstream changed.
