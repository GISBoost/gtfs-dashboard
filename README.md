# gtfs-dashboard

**Live site: [gisboost.github.io/gtfs-dashboard](https://gisboost.github.io/gtfs-dashboard/)**

A static dashboard for browsing GTFS-RT recordings and "realized" GTFS builds produced by the
[`GISBoost/easy-GTFS-RT`](https://github.com/GISBoost/easy-GTFS-RT) pipeline (built with
[`GISBoost/easy-OTP`](https://github.com/GISBoost/easy-OTP)'s Family A reconstruction tool).

That pipeline publishes a new GitHub Release per city per day, and with 12+ cities recording
daily, the Releases list itself is no longer a practical way to browse the data. This site solves
that: it reads `manifest.json` (generated from the Releases API) and renders a simple
city → month → day → details drill-down, with each day's stats, download links, and diff chart.

This repo stores **no data of its own** — `manifest.json` is regenerated from scratch on a
schedule by `.github/workflows/refresh-manifest.yml`, which reads `easy-GTFS-RT`'s public
Releases API and `config/cities.json`. The frontend is plain HTML/CSS/vanilla JS, no build step,
served directly by GitHub Pages.

See `PRD.md` for the full spec and `HANDOFF.md` for the design rationale (both kept local, not
pushed — see `.gitignore`).
