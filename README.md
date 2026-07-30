# gtfs-dashboard

**Live site: [gisboost.github.io/gtfs-dashboard](https://gisboost.github.io/gtfs-dashboard/)**

A static dashboard for browsing GTFS-RT recordings and "realized" GTFS builds produced by the
[`GISBoost/easy-GTFS-RT`](https://github.com/GISBoost/easy-GTFS-RT) pipeline (built with
[`GISBoost/easy-OTP`](https://github.com/GISBoost/easy-OTP)'s Family A reconstruction tool).

That pipeline publishes a new GitHub Release per city per day, and with 12+ cities recording
daily, the Releases list itself is no longer a practical way to browse the data. This site solves
that: it reads `manifest.json` (generated from the Releases API) and renders a simple
city → month → day → details drill-down, with each day's stats, download links, and diff chart.

This repo stores **no data of its own** — `manifest.json` is regenerated from scratch by
`.github/workflows/refresh-manifest.yml`, which reads `easy-GTFS-RT`'s public Releases API and
`config/cities.json`. The frontend is plain HTML/CSS/vanilla JS, no build step, served directly by
GitHub Pages.

**Refresh schedule: once daily at 04:00 UTC** (06:00 Warsaw in summer), picking up everything
published since the previous run. The hour is set by Boston, the latest-finishing city: it records
until 22:00 local, so its window closes at 02:00 UTC and its build publishes at 02:21–02:26 UTC —
measured across twelve consecutive days. That leaves ~1.5h of margin, narrowing to ~35 min in
winter once US DST ends and Boston's publish shifts an hour later (cron is UTC and does not
follow DST). `workflow_dispatch` is available for an immediate manual refresh.

See `PRD.md` for the full spec and `HANDOFF.md` for the design rationale (both kept local, not
pushed — see `.gitignore`).

## Licensing

The site itself — `index.html`, `app.js`, `styles.css`, and the workflow that regenerates the
manifest — is **MIT**, see [`LICENSE`](LICENSE).

That covers the browser, not the data seen through it. `manifest.json` is a generated index of
`easy-GTFS-RT`'s Releases, and every file it links to derives from a transit agency's own
open-data feed, under that agency's terms — not this repo's. Read
[`easy-GTFS-RT`'s "Data and attribution"](https://github.com/GISBoost/easy-GTFS-RT#data-and-attribution)
before redistributing or publishing anything you downloaded through this site.
