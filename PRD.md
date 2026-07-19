# PRD — gtfs-dashboard: katalog danych GTFS-RT dla easy-GTFS-RT

**Status: do zrobienia, v1.** Ten dokument opisuje pierwszą wersję statycznej strony
przeglądającej dane produkowane przez `GISBoost/easy-GTFS-RT` (nagrania GTFS-RT +
„zrealizowany" GTFS z Family A, `GISBoost/easy-OTP`). Zob. `HANDOFF.md` po pełen kontekst
rozmowy, w której to powstało, i `CLAUDE.md` po twarde ograniczenia.

## 0. Skąd się to wzięło

`easy-GTFS-RT` publikuje jeden GitHub Release dziennie na miasto
(`<city>-realized-<date>-phone`), 12 miast i rosnąco (`lodz`, `poznan`, `szczecin`,
`prague`, `rome`, `turin`, `vilnius`, `sofia`, `bucharest`, `lisbon`, `boston`,
`brisbane` — patrz `easy-GTFS-RT/config/cities.json`). Michał (2026-07-19): przy
kilkunastu wpisach dziennie lista Releases robi się nienawigowalna, mimo że **nie ma
twardego limitu liczby release'ów w repo GitHuba** (sprawdzone: „max 1000" dotyczy
assetów w obrębie jednego release'a, nie liczby release'ów — brak takiego limitu w
oficjalnej dokumentacji "Repository limits" ani gdziekolwiek indziej). Problemem jest
wyłącznie **nawigacja/katalogowanie**, nie pojemność.

Rozważone alternatywy (research 2026-07-19, pełne uzasadnienie w `HANDOFF.md`):
foldery w repo git (odrzucone — historia gita rośnie bezpowrotnie, limit Git LFS 10GB/
10GB miesięcznie na konto), migracja na R2/B2 (odłożone — nie jest to problem
pojemnościowy, więc migracja magazynu nie rozwiązuje realnego problemu), Zenodo
(odrzucone — myślane pod okresowe, nie codzienne automatyczne publikacje). Wybrana
opcja: **statyczna strona-katalog, czytająca dane z już istniejących Releases**, bez
migracji samego magazynu danych.

## 1. Cel i zakres v1

Jedna statyczna strona (bez frameworka, bez build stepu) pozwalająca przeglądać dane
`easy-GTFS-RT` w hierarchii **miasto → miesiąc → dzień → szczegóły dnia**, zamiast
płaskiej, chronologicznej listy Releases. Dokładny układ, kolorystyka i interakcje są
już wypracowane w `mockup-reference.html` (dołączony do tego folderu) — to jest
specyfikacja wizualna, ten dokument opisuje **skąd biorą się dane** i **dokładne
wymagania funkcjonalne**, nie wygląd (o wyglądzie tylko tam, gdzie mockup czegoś nie
rozstrzyga, np. stan pustego/błędnego ładowania prawdziwego `manifest.json`).

Poza zakresem v1 (patrz sekcja 8): podsumowania miesięczne/trendy, porównania
międzymiastowe, powiadomienia, eksport danych, natychmiastowe odświeżanie przez
`repository_dispatch` (v1 = tylko okresowe odpytywanie).

## 2. Architektura

Osobne repozytorium GitHub, **`GISBoost/gtfs-dashboard`** (rekomendacja — publiczne,
tak jak `easy-GTFS-RT`, ten sam powód: darmowe nielimitowane minuty Actions i brak
limitu 500MB/repo na artefakty prywatnych repo). Bez frameworka — czysty
HTML+CSS+JS, GitHub Pages serwuje repo wprost, bez etapu budowania.

**Potwierdzone przez `gh api repos/GISBoost/gisboost.github.io/pages`:** główna strona
Michała to repo `GISBoost/gisboost.github.io` (legacy Pages build z brancha
`gh-pages`, adres `https://gisboost.github.io/`). Nowe repo `GISBoost/gtfs-dashboard`,
jeśli włączy się dla niego GitHub Pages jako project page, wyląduje pod
**`https://gisboost.github.io/gtfs-dashboard/`** — osobna ścieżka, zero kolizji, zero
wpływu na build głównej strony (MkDocs). To jest rekomendacja tego dokumentu, nie
ustalony fakt „na zawsze" — **Michał musi ręcznie założyć to repo i włączyć Pages**
(agent tego nie robi bez wyraźnego polecenia, patrz `CLAUDE.md`).

**To NIE jest osobna domena/osobna „witryna" z punktu widzenia odwiedzającego.**
GitHub Pages pozwala jednemu kontu/organizacji na dokładnie **jedną** stronę
„główną" (user/org page — repo musi się nazywać dosłownie `<org>.github.io`, to jest
`GISBoost/gisboost.github.io`, serwowana pod samym `https://gisboost.github.io/`) plus
**dowolną liczbę** stron „projektowych" (project page — każda to osobne repo o
dowolnej nazwie, każda dostaje własną podścieżkę pod **tym samym**
`gisboost.github.io`). `gtfs-dashboard` będzie taką drugą kategorią — inny
adres/podścieżka, ta sama domena, kompletnie osobne repo/build/CI od MkDocsowej
strony głównej. Można je swobodnie linkować wzajemnie (main site → dashboard i
odwrotnie) bez żadnego sprzężenia deployów. Jedyny sposób na faktycznie inną domenę
byłby przez ręczne skonfigurowanie customowego `CNAME` dla `gtfs-dashboard` (np.
`gtfs.gisboost.pl`) — nic w tym planie tego nie wymaga ani nie zakłada.

```
GISBoost/easy-GTFS-RT (public, source of truth, nie ruszamy)
  ├─ Releases: <city>-realized-<date>-phone (tag), assets: _p50.zip / _p85.zip /
  │  _static_gtfs.zip / _diff_..._chart.png (best-effort) / _diff_..._summary.csv (best-effort)
  └─ config/cities.json (display_name, static_gtfs_url, opcjonalnie timezone per miasto)
        |
        | GitHub Actions w gtfs-dashboard, schedule co 30-60 min (patrz sekcja 5)
        | GET (github.token, auth, wysoki limit) — zero nowych sekretów
        v
GISBoost/gtfs-dashboard (to repo)
  ├─ manifest.json (regenerowany OD ZERA co przebieg — nie inkrementalnie, patrz sekcja 4)
  ├─ index.html + CSS/JS (bazuje na mockup-reference.html, podmienione źródło danych)
  └─ .nojekyll (wymagane — czysty statyczny plik, nie Jekyll)
        |
        v
GitHub Pages (classic, deploy z brancha) -> gisboost.github.io/gtfs-dashboard/
```

## 3. Źródło danych i jego ograniczenia (przeczytaj przed kodowaniem)

### 3.1 Skąd biorą się nazwy miast
`GET https://raw.githubusercontent.com/GISBoost/easy-GTFS-RT/main/config/cities.json`
(publiczny plik, bez autoryzacji) — słownik `city_id -> {display_name, static_gtfs_url,
timezone?}`. Użyj `display_name` stąd, **nie** parsuj tytułu release'u dla nazwy miasta.

### 3.2 Skąd biorą się dni/release'y
`GET /repos/GISBoost/easy-GTFS-RT/releases` (REST API), **paginacja obowiązkowa**
(`per_page=100` + nagłówek `Link`, albo `gh api --paginate`) — przy ~12 release'ach
dziennie strona 1 (100 wpisów) wyczerpuje się w ok. tydzień. Filtruj tylko tagi
pasujące do wzorca:
```
^(?<city>[a-z0-9_]+)-realized-(?<date>\d{4}-\d{2}-\d{2})-phone$
```
Wszystko inne (np. `positions-raw-*`, które i tak są kasowane po zbudowaniu finalnego
release'u) ignoruj po cichu — nie traktuj nierozpoznanego tagu jako błędu.

### 3.3 `body` release'u to prosa, nie JSON — parsowanie best-effort
Dokładny format `--notes` z `easy-GTFS-RT/.github/workflows/family_a_build_and_notify_from_phone.yml`
(krok „Publish GitHub Release"):
```
Automated build from phone-recorded data (TX-2/TX-3). P50/P85 corrected GTFS from
<DATE>'s recording (<COUNT> recording director(y|ies) merged, <MATCHED> observations
matched, <CORRECTED> segments corrected). Actual recorded coverage: <COVERAGE>. ...
```
Regeksy do wyciągnięcia (wszystkie pola **nullable** — brak dopasowania = `null`, nie
błąd):
- `recording_dirs`: `/(\d+) recording director/`
- `observations_matched`: `/(\d+) observations matched/`
- `segments_corrected`: `/(\d+) segments corrected/`
- `coverage_ranges` (string, może zawierać kilka zakresów po przecinku, np.
  `"06:00-14:32, 14:40-22:00"` gdy nagrywanie miało przerwę): `/Actual recorded coverage: ([^.]+)\./`

**Jeśli ten format kiedyś się zmieni w `easy-GTFS-RT` — regex tu przestanie łapać
nowe dni.** To świadomie zaakceptowane ryzyko (żeby nie duplikować/zmieniać kodu w
`easy-GTFS-RT`), opisane w `CLAUDE.md`. Strona ma nadal działać poprawnie z tymi
polami jako `null` (pokaż myślnik/„brak danych", nie crashuj renderowania).

### 3.4 Reguła „status: ok / partial"
Sparsuj `coverage_ranges` na listę `(start, end)`. `status = "partial"` gdy:
- więcej niż jeden zakres (oznacza przerwę w nagrywaniu — restart), **lub**
- jedyny zakres zaczyna się później niż `06:05`, **lub**
- jedyny zakres kończy się wcześniej niż `21:55`.
W przeciwnym razie `status = "ok"`. Gdy `coverage_ranges` jest `null` (regex nie
złapał) → `status = "unknown"` (osobny, trzeci stan — nie zgaduj „ok" ani „partial").

### 3.5 Assety per dzień
Dla release'u o tagu `<city>-realized-<date>-phone` dopasuj assety po nazwie
(sprawdź obecność w `assets[]` z API — każde pole poniżej jest **nullable**, `diff_chart`
i `diff_summary` są best-effort i legalnie mogą nie istnieć):
```
p50:          <city>_realized_<date>_p50.zip
p85:          <city>_realized_<date>_p85.zip
static_gtfs:  <city>_static_gtfs_<date>.zip
diff_chart:   <city>_diff_<date>_p50_chart.png   (opcjonalny)
diff_summary: <city>_diff_<date>_p50_summary.csv (opcjonalny)
```
URL do każdego to `browser_download_url` z odpowiedzi API (stabilny, dopóki release+tag
istnieją — potwierdzone w tej samej rozmowie/research, patrz `HANDOFF.md`).

**Ważne — czym jest `diff_chart`:** to gotowy PNG z
`tools/analysis/gtfs_static_vs_realized_diff.py` (matplotlib), liczony bezpośrednio z
różnicy dwóch plików GTFS (statycznego i zrealizowanego) w tym samym przebiegu skryptu
co `diff_summary` (CSV) — **CSV nie jest źródłem wykresu**, to równoległy, dodatkowy
eksport tych samych danych. Strona wyłącznie osadza gotowy PNG (`<img>`), nigdy go nie
generuje ani nie interpretuje CSV do rysowania czegokolwiek.

### 3.6 Autoryzacja
Zero nowych sekretów. `easy-GTFS-RT` jest publiczne — workflow w `gtfs-dashboard`
używa własnego domyślnego `${{ github.token }}` (wystarczający limit zapytań do
odczytu cudzego publicznego repo; nie trzeba PAT-a ani cross-repo secreta).

### 3.7 Harmonogram odświeżania — NIE raz o północy
`easy-GTFS-RT` już raz się na tym przejechało (patrz jego README, sekcja „Known
gotchas"): Boston (`America/New_York`) kończy okno nagrywania dopiero ok. 04:00 czasu
warszawskiego następnego dnia — pojedynczy trigger o stałej porze (np. północ) albo
złapie to za wcześnie (przed zbudowaniem), albo wymaga czekania do następnego dnia.
**Ten projekt ma odpytywać okresowo, cały dzień** (rekomendacja: `cron: "*/30 * * * *"`,
czyli co 30 min — spójne z tempem `sweep_and_upload.sh`/healthchecku w `easy-GTFS-RT`,
choć tamte odpytują co 15 min; 30 min jest wystarczające, bo to tylko regeneracja
katalogu, nie coś czasowo-krytycznego). Plus `workflow_dispatch:` do ręcznego
odpalenia przy testach.

UWAGA: zmień odświeżanie tego repo nie co 30min tylko raz dziennie, ewentualnie 2 razy dziennie.
nowych gtfs-ow i tak nie przybywa co 30min więc to bez sensu.
trzeba jeszcze się zastanowić nad tym czy odświeżenie strony wymaga zrobienia deploy na repo gisboost.github.
przed wdrożeniem sprawdź to.

## 4. Schemat `manifest.json`

Regenerowany **od zera** przy każdym przebiegu (nie inkrementalnie — spójne z
filozofią reszty tego pipeline'u: release'y w `easy-GTFS-RT` są źródłem prawdy, ten
plik to tylko ich pochodna, zawsze odtwarzalna). Commituj tylko jeśli treść faktycznie
się zmieniła (unikaj pustych commitów i niepotrzebnych re-deployów Pages).

```json
{
  "generated_at": "2026-07-19T22:30:00Z",
  "source_repo": "GISBoost/easy-GTFS-RT",
  "cities": {
    "lodz": {
      "display_name": "Łódź",
      "days": [
        {
          "date": "2026-07-18",
          "release_tag": "lodz-realized-2026-07-18-phone",
          "release_url": "https://github.com/GISBoost/easy-GTFS-RT/releases/tag/lodz-realized-2026-07-18-phone",
          "created_at": "2026-07-18T20:12:03Z",
          "recording_dirs": 1,
          "observations_matched": 16040,
          "segments_corrected": 838,
          "coverage_ranges": ["06:00-22:00"],
          "status": "ok",
          "assets": {
            "p50": "https://github.com/GISBoost/easy-GTFS-RT/releases/download/lodz-realized-2026-07-18-phone/lodz_realized_2026-07-18_p50.zip",
            "p85": "https://.../lodz_realized_2026-07-18_p85.zip",
            "static_gtfs": "https://.../lodz_static_gtfs_2026-07-18.zip",
            "diff_chart": "https://.../lodz_diff_2026-07-18_p50_chart.png",
            "diff_summary": "https://.../lodz_diff_2026-07-18_p50_summary.csv"
          }
        }
      ]
    }
  }
}
```

Pola `recording_dirs`/`observations_matched`/`segments_corrected`/`coverage_ranges`
oraz każdy klucz w `assets` mogą być `null` — frontend musi to obsłużyć czytelnie
(myślnik/„brak danych"/ukryty przycisk pobierania), nigdy jako pusty string czy `0`
udający prawdziwą wartość.

## 5. Wymagania UI

Bazuj **bezpośrednio na `mockup-reference.html`** — poniżej tylko różnice/doprecyzowania
względem tego, co mockup już pokazuje:

1. **Miasta** (poziom 1): karty w gridzie (`auto-fill, minmax(220px, 1fr)`), sortowane
   alfabetycznie, plakietka świeżości liczona z `days[].date` najnowszego wpisu vs.
   dzisiejsza data (UTC albo lokalny czas przeglądarki — bez znaczenia dla samej
   plakietki, to tylko orientacyjny sygnał).
2. **Miesiące** (poziom 2): karty w gridzie, najnowszy miesiąc na górze, plakietka
   „częściowe pokrycie" gdy którykolwiek dzień w miesiącu ma `status: "partial"`.
3. **Dni** (poziom 3): tabela, chronologicznie rosnąco domyślnie, sortowalna po dacie/
   dopasowanych obserwacjach/skorygowanych odcinkach (nagłówki-przyciski z
   `aria-sort`). Wiersz klikalny **i** dostępny z klawiatury (`tabindex="0"`,
   `role="button"`, Enter/Spacja) — to była realna poprawka dostępności w mockupie,
   nie utracić jej przy przepisywaniu.
4. **Szczegóły dnia** (poziom 4): nagłówek `<h1>` (jedyny `<h1>` na stronie w danym
   momencie — pozostałe poziomy mają swój `<h1>` w `#pageTitle`, ukrywany na tym
   poziomie), kafelki statystyk, **osadzony PNG** (`<img>` z `onerror` fallbackiem —
   patrz mockup), lista plików do pobrania z opisem.
5. Breadcrumby na górze, klikalne wstecz do dowolnego wyższego poziomu.
6. Szukajka kontekstowa (filtruje to, co aktualnie widać — miasta, miesiące, albo dni
   — nigdy nie spłaszcza całej hierarchii na raz).
7. Jasny/ciemny motyw z tokenami CSS (`prefers-color-scheme` + `data-theme` override),
   zielony/niebieski dopasowany do istniejącej marki `gisboost.github.io`
   (`mkdocs.yml`: primary green, accent light blue).
8. **Nowe względem mockupu — obsługa realnego ładowania danych:**
   - Stan ładowania: krótki komunikat/spinner podczas `fetch("manifest.json")`.
   - Stan błędu: jeśli fetch się nie uda (404/sieć), czytelny komunikat + link do
     `github.com/GISBoost/easy-GTFS-RT/releases` jako fallback — strona nie może
     zostać pusta bez wyjaśnienia.
   - `status: "unknown"` (patrz 3.4) renderowany jako osobna, wyraźnie neutralna
     plakietka (nie zielona „ok", nie bursztynowa „partial").

## 6. Kryteria akceptacji

1. `manifest.json` wygenerowany przez workflow zawiera co najmniej wszystkie miasta z
   `config/cities.json`, które mają choć jeden release pasujący do wzorca tagu.
2. Ręczne usunięcie/edycja jednego release'u w `easy-GTFS-RT` i ponowne uruchomienie
   workflow (`workflow_dispatch`) odzwierciedla się w `manifest.json` przy następnym
   przebiegu (dowód, że generowanie jest „od zera", nie inkrementalne/cache'owane).
3. Strona otwarta pod `gisboost.github.io/gtfs-dashboard/` pozwala dotrzeć od
   listy miast do konkretnego pliku `_p50.zip` w maksymalnie 4 kliknięciach (miasto →
   miesiąc → dzień → link), zgodnie z mockupem.
4. Dzień bez wygenerowanego `diff_chart` (np. same zerowe opóźnienia) pokazuje czytelny
   fallback zamiast złamanego obrazka.
5. Działa identycznie (wizualnie i funkcjonalnie) w jasnym i ciemnym motywie.
6. Wszystkie interakcje osiągalne z samej klawiatury (Tab + Enter/Spacja), zgodnie z
   poprawkami już wprowadzonymi w `mockup-reference.html`.

## 7. Otwarte kwestie do potwierdzenia z Michałem (nie zgadywać przy kodowaniu)

1. **Nazwa i właściciel repo** — rekomendacja `GISBoost/gtfs-dashboard`, ale Michał
   zakłada je ręcznie (patrz `CLAUDE.md`) i może wybrać inną nazwę. odp: nazwa ok
2. **Dokładny interwał odświeżania** — rekomendacja co 30 min (sekcja 3.7); potwierdzić,
   czy 30 czy np. 15 (jak reszta pipeline'u) czy inna wartość. odp: inne, patrz sekcja odświeżania.
3. **Czy `gtfs-dashboard` powinien też umieć linkować w drugą stronę** (np. przycisk
   „zobacz surowe Release na GitHub" przy każdym dniu) — nice-to-have, do potwierdzenia
   czy w v1 czy później. odp: tak.

## 8. Pomysły na przyszłość (poza zakresem v1)

- **Podsumowanie miesięczne per miasto** — np. średnie opóźnienie w miesiącu, trend
  dzień-po-dniu (sparkline), „najgorszy dzień tego miesiąca" — naturalne rozszerzenie
  poziomu „miesiące", bo dane (`observations_matched`/`segments_corrected` per dzień)
  już są w manifeście.
- **Porównanie międzymiastowe** — ranking miast po średnim opóźnieniu/liczbie
  skorygowanych odcinków, przydatne dla artykułu naukowego (kontekst: metoda
  Spatio-Temporal PTA, `docs/papers/` w `easy-OTP`).
- **Pasek stanu systemu** — jedno miejsce agregujące plakietki świeżości wszystkich
  miast na raz (które nie nagrywały od X dni) — częściowa odpowiedź na usunięty
  `family_a_phone_healthcheck.yml` (usunięty 2026-07-17 z powodu fałszywych alarmów,
  patrz `easy-GTFS-RT` README) — to nie zastępuje alertu WhatsApp, ale daje miejsce do
  ręcznego sprawdzenia „czy coś wygląda źle" bez grzebania w Releases.
- **Odświeżanie przez `repository_dispatch` zamiast (albo obok) odpytywania** —
  `easy-GTFS-RT`'s `family_a_build_and_notify_from_phone.yml` mógłby, zaraz po
  publikacji release'u, wysłać dispatch do `gtfs-dashboard` (ten sam wzorzec, co już
  istnieje między telefonem a `easy-GTFS-RT`) — niemal natychmiastowe odświeżenie
  zamiast czekania do najbliższego pollingu. Wymaga zmiany w `easy-GTFS-RT` (nowy krok
  + nowy sekret z uprawnieniem do dispatchowania do `gtfs-dashboard`) — świadomie poza
  zakresem v1, żeby nie dotykać `easy-GTFS-RT` przy pierwszym wdrożeniu.
- **Eksport zbiorczy dla badacza** — przycisk „pobierz wszystkie dni tego miesiąca jako
  jeden CSV" (łączenie `diff_summary` po stronie klienta) — przydatne pod analizę do
  pracy naukowej bez ręcznego pobierania dzień po dniu.
- **Przełącznik motywu w UI** — obecnie tylko `prefers-color-scheme`; przycisk
  jasny/ciemny w topbarze dla użytkowników bez ustawionej preferencji systemowej.
- **Globalna szukajka** — obecnie szukajka jest kontekstowa per poziom (sekcja 5,
  punkt 6); „wyszukaj po całej hierarchii naraz" (np. wpisz datę, zobacz wszystkie
  miasta z tym dniem) to możliwe rozszerzenie, jeśli okaże się potrzebne w praktyce.

## 9. Źródła

- `GISBoost/easy-GTFS-RT/README.md`, `CLAUDE.md`, `config/cities.json`,
  `.github/workflows/family_a_build_and_notify_from_phone.yml` (dokładny format
  `body`/nazw assetów, sekcja 3).
- `GISBoost/easy-OTP/scripts/termux/README.md` (harmonogram/strefy czasowe, sekcja 3.7).
- `GISBoost/easy-OTP/tools/analysis/gtfs_static_vs_realized_diff.py` (co dokładnie
  generuje wykres, sekcja 3.5).
- `gh api repos/GISBoost/gisboost.github.io/pages` (potwierdzenie adresu głównej
  strony i mechanizmu Pages, sekcja 2) — sprawdzone 2026-07-19.
- Research web (2026-07-19, w tej samej rozmowie): brak limitu liczby release'ów w
  repo GitHub, limity Git LFS, wzorce katalogów statycznych (STAC), prior art GTFS
  (Mobility Database/transit.land) — pełne cytowania w `HANDOFF.md`.
- `mockup-reference.html` (ten folder) — specyfikacja wizualna/interakcyjna.
