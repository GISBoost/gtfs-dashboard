# CLAUDE.md — gtfs-dashboard

## Czym jest projekt
Statyczny katalog/dashboard przeglądający dane wyprodukowane przez pipeline
`GISBoost/easy-GTFS-RT` (nagrania GTFS-RT i „zrealizowane" GTFS z narzędzia Family A,
`GISBoost/easy-OTP`'s `tools/family_a_reconstruction/`). Rozwiązuje konkretny problem:
lista GitHub Releases w `easy-GTFS-RT` rośnie o ok. 12 wpisów dziennie (jedno miasto =
jeden release dziennie, 12 miast i rosnąco) i robi się nienawigowalna. Ta strona **nie
przechowuje żadnych danych** — czyta `manifest.json` wygenerowany z Releases API tamtego
repo i renderuje przeglądanie miasto → miesiąc → dzień → szczegóły dnia.

## Źródło prawdy
- **`PRD.md`** — pełna specyfikacja: architektura, schemat manifestu, wymagania UI,
  kryteria akceptacji, otwarte kwestie, pomysły na przyszłość. CLAUDE.md tego nie powiela.
- **`PROMPTS.md`** — kroki implementacji dla Claude Code (milestone GD-1, GD-2), po
  angielsku (jak `PROMPTS.md` w `easy-OTP`).
- **`HANDOFF.md`** — streszczenie rozmowy, w której ten projekt powstał: decyzje, dlaczego
  akurat tak, co zostało odrzucone i dlaczego.
- **`mockup-reference.html`** — działający, w pełni interaktywny mockup UI (dane
  przykładowe wpisane na sztywno w JS) wypracowany iteracyjnie z Michałem. To jest
  **specyfikacja wizualna i interakcyjna** — układ (karty dla miast/miesięcy, tabela dla
  dni, widok szczegółów dnia z osadzonym PNG), kolorystyka, typografia, breadcrumby,
  dostępność (klawiatura, `aria-sort`, `role="button"`, hierarchia nagłówków) — wszystko
  stamtąd ma zostać przeniesione, nie wymyślone na nowo. Podmieniane jest tylko źródło
  danych (na sztywno wpisany `manifest` w JS → fetch prawdziwego `manifest.json`).

## Twarde ograniczenia (nie wolno złamać)
- **Zero frameworków, zero build stepu.** Czysty HTML + CSS + vanilla JS, tak jak
  `mockup-reference.html`. Żadnego Reacta/Vite/npm — to jednostronicowa aplikacja
  serwowana wprost przez GitHub Pages, bez etapu kompilacji.
- **Zero zmian w `easy-OTP` i `easy-GTFS-RT`.** Ten projekt tylko *czyta* publiczne dane
  z `easy-GTFS-RT` (Releases API, `config/cities.json`) — nigdy nie modyfikuje tamtych
  repozytoriów, nie commituje tam, nie zmienia ich workflow.
- **Ten katalog to osobne repozytorium GitHub**, nie podfolder `gisboostgithub`
  (`GISBoost/gisboost.github.io`, zbudowany przez MkDocs) — MkDocs traktuje każdy `.md`
  pod `docs/` jak osobną podstronę wtapianą w nawigację całej witryny; ta aplikacja ma
  własny cykl wdrożeń (odświeża się kilka razy dziennie, niezależnie od tego, kiedy
  Michał aktualizuje resztę portfolio) i nie powinna być wciągana w tamten build.
  Rekomendacja z `HANDOFF.md`/`PRD.md`: `GISBoost/gtfs-dashboard`, publiczne repo,
  GitHub Pages jako project page pod `https://gisboost.github.io/gtfs-dashboard/`
  (potwierdzone: `GISBoost/gisboost.github.io` to już istniejące repo głównej strony,
  legacy Pages build z brancha `gh-pages` — nowe repo obok niego dostanie własną,
  niekolidującą ścieżkę).
- **Zero sekretów potrzebnych do odczytu danych.** `easy-GTFS-RT` jest publiczne —
  workflow generujący manifest czyta jego Releases API i `config/cities.json` przez
  zwykły `${{ github.token }}` (auto-token tego repo, wystarczający limit zapytań do
  odczytu cudzego publicznego repo) — nigdy nie twórz ani nie proś o nowy PAT do tego celu.
- **Parsowanie `body` release'u jest z założenia best-effort.** `easy-GTFS-RT`'s
  `family_a_build_and_notify_from_phone.yml` pisze `body` jako wolny tekst (prosa), nie
  jako ustrukturyzowane dane — pola `observations_matched`/`segments_corrected`/
  `coverage_ranges` w manifeście muszą być `null`-owalne i muszą nie wywalać całego
  przebiegu workflow, jeśli regex nie złapie dla jednego release'u (patrz PRD sekcja o
  schemacie manifestu). Nigdy nie zamieniaj tego w twardy wymóg/wyjątek blokujący cały run.
- **Paginacja Releases API jest obowiązkowa, nie opcjonalna.** Przy ok. 12
  releases/dzień limit 100/stronę wyczerpuje się w ok. tydzień — kod bez paginacji
  będzie *pozornie* działał lokalnie/na starcie i cicho urwie starsze miesiące później.
  Zawsze `--paginate` (lub ręczna obsługa nagłówka `Link`).
- Kod, komentarze, komunikaty commitów: **po angielsku** (spójne z `easy-OTP`/
  `easy-GTFS-RT`). Ten plik i pozostałe dokumenty projektowe: po polsku (jak
  `PR_easy-OTP_termux-migration.md` i pokrewne w `easy-OTP`).
- **Nie zgaduj harmonogramu odświeżania na sztywno co północ.** `easy-GTFS-RT` już
  raz się na tym przejechało (patrz `PRD.md`, sekcja o harmonogramie) — Boston/Brisbane
  kończą okno nagrywania długo po północy czasu warszawskiego. Odświeżanie manifestu
  musi być periodyczne (co 30–60 min, cały dzień), nie jednorazowe o ustalonej godzinie.

## Architektura (skrót — szczegóły w PRD.md)
```
GISBoost/easy-GTFS-RT (public, nie ruszamy)          GISBoost/gtfs-dashboard (to repo)
--------------------------------------------          -----------------------------------
Releases: <city>-realized-<date>-phone      <----     GitHub Actions (schedule, co 30-60 min):
  assets: _p50.zip, _p85.zip,                          1. GET config/cities.json (display_name)
          _static_gtfs.zip, _diff_..._chart.png,       2. GET /releases (paginated!)
          _diff_..._summary.csv (oba ostatnie          3. parsuj tag + body (best-effort)
          best-effort, mogą nie istnieć)               4. zbuduj manifest.json od zera
config/cities.json (display_name per miasto) <----     5. commit + push (jeśli coś się zmieniło)
                                                                    |
                                                                    v
                                                        GitHub Pages (branch classic deploy)
                                                        index.html + manifest.json
                                                        -> gisboost.github.io/gtfs-dashboard/
```

## Workflow pracy (przestrzegaj zawsze)
- **Jeden milestone na raz** (GD-1, GD-2 — patrz `PROMPTS.md`). Nie wybiegaj naprzód.
- **Nie zgaduj** — gdy coś jest niejasne lub niedoprecyzowane w PRD (np. dokładna nazwa
  repo, dokładny interwał cron), zapytaj Michała zamiast zakładać.
- **Nie twórz automatycznie nowych branchy** ani nowych repozytoriów GitHub bez
  wyraźnego polecenia — założenie repo `GISBoost/gtfs-dashboard` to krok, który robi
  Michał ręcznie (albo wyraźnie o to poprosi).
- Po każdym milestonie: **STOP na ręczną weryfikację** (Claude Code nie ma dostępu do
  GitHub Actions ani do rzeczywistego stanu Pages) → dopiero potem commit.
- GitHub CLI na tym komputerze: pełna ścieżka `"C:\Program Files\GitHub CLI\gh.exe"`
  (to samo ograniczenie co w `easy-OTP`/`easy-GTFS-RT`).
- Python: `py`, nie `python`/`python3` (to samo ograniczenie co w `easy-OTP`) — dotyczy
  wyłącznie ewentualnych lokalnych skryptów pomocniczych; docelowy manifest-generator
  działa jako krok GitHub Actions (bash + `jq` + `gh api`, nie Python, żeby uniknąć
  jakiegokolwiek etapu instalacji zależności w CI dla tak małego zadania).

## Czego NIE testuje agent (testuje człowiek)
Claude Code nie ma dostępu do prawdziwego stanu `easy-GTFS-RT`'s Releases (poza
odczytem publicznego API — może to zweryfikować), do ustawień GitHub Pages tego nowego
repo, ani do uruchomionego workflow w Actions. Po każdym milestonie jasno wypisz, co
Michał musi ręcznie sprawdzić na GitHub.com (patrz „Human verification" w `PROMPTS.md`).

## Standardy kodu
- Czysty HTML5 + CSS custom properties (jasny/ciemny motyw, jak `mockup-reference.html`)
  + vanilla JS (bez transpilacji, bez bundlera).
- `bash`/`jq` do generatora manifestu (krok GitHub Actions) — nie Python, nie Node.
- Zasoby (obrazki/PNG z release'ów) nigdy nie są kopiowane do tego repo — zawsze
  linkowane bezpośrednio do `releases/download/...` w `easy-GTFS-RT`.

## Gotchas (realne pułapki — pamiętaj)
- **`body` release'u to prosa, nie JSON.** Regex musi dokładnie pasować do
  literalnego formatu `printf` w `easy-GTFS-RT`'s
  `.github/workflows/family_a_build_and_notify_from_phone.yml` (krok „Notify WhatsApp
  (success)") — jeśli ten format kiedyś się zmieni w `easy-GTFS-RT`, regex tutaj
  cicho przestanie parsować nowe release'y (pola spadną do `null`, strona i tak
  zadziała, tylko bez liczb). Nie jest to błąd blokujący, ale warto to zauważyć przy
  debugowaniu „dlaczego statystyki są puste dla nowych dni".
- **Wykres PNG nie jest generowany przez tę stronę.** To gotowy plik z
  `tools/analysis/gtfs_static_vs_realized_diff.py` (matplotlib, liczony z różnicy
  dwóch plików GTFS, nie z CSV) — ta strona go tylko `<img src="...">` osadza. Może
  legalnie nie istnieć dla danego dnia (skrypt pomija wykres, gdy wszystkie
  dopasowane wiersze miały `delay_sec == 0`) — frontend musi mieć czytelny fallback
  (patrz `mockup-reference.html`'s `onerror` na `<img class="chart-img">`), nie
  traktować braku PNG jako błędu.
- **Surowe release'y (`positions-raw-<city>-<date>`) są kasowane** przez
  `easy-GTFS-RT` zaraz po zbudowaniu finalnego GTFS — manifest ma czytać wyłącznie
  tagi `<city>-realized-<date>-phone`, nigdy `positions-raw-*` (te nie powinny nawet
  istnieć w momencie odczytu, ale bądź defensywny: filtruj po dokładnym wzorcu tagu).
- **`city_id` w tagu release'u musi się zgadzać z kluczem w `config/cities.json`** —
  jeśli kiedyś się rozjadą (nowe miasto dodane w jednym miejscu, nie w drugim),
  traktuj to jako miasto z nieznaną `display_name` (fallback: pokaż surowe `city_id`),
  nie jako błąd zatrzymujący cały generator.
