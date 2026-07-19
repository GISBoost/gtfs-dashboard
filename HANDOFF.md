# Handoff — geneza projektu gtfs-dashboard (2026-07-19)

Streszczenie rozmowy z Michałem, w której powstał ten projekt. `PRD.md` opisuje co
budować; ten dokument opisuje **dlaczego akurat tak**, co zostało odrzucone po drodze,
i co zostało zweryfikowane (nie zgadnięte) w trakcie.

## 1. Punkt wyjścia

`GISBoost/easy-GTFS-RT` publikuje jeden GitHub Release dziennie na miasto
(`<city>-realized-<date>-phone`), obecnie 12 miast (`lodz`, `poznan`, `szczecin`,
`prague`, `rome`, `turin`, `vilnius`, `sofia`, `bucharest`, `lisbon`, `boston`,
`brisbane`) i rosnąco. Michał: przy kilkunastu wpisach dziennie lista Releases robi
się trudna do przeglądania; zaproponował podział na foldery miasto → miesiąc → dzień
i zapytał, czy lepszym rozwiązaniem byłyby foldery w repo, osobna strona (ma już
`gisboost.github.io`), czy coś innego.

## 2. Research (4 równoległe wątki, 2026-07-19)

Zamiast zgadywać, przeprowadzony został research z czterech kątów jednocześnie:

1. **Skalowalność GitHub Releases** — wyszukiwarka na stronie Releases istnieje, ale
   community określa ją jako „half-baked" (samo dopasowanie substring). **Brak
   udokumentowanego limitu liczby release'ów/tagów w repo** (sprawdzone bezpośrednio
   na `docs.github.com/.../repository-limits` — strona nie wspomina o takim limicie).
   „Max 1000" z dokumentacji dotyczy **assetów w obrębie jednego release'a**, nie
   liczby release'ów — to było źródłem nieporozumienia po drodze, wyjaśnione i
   sprostowane w rozmowie.
2. **Foldery w repo git jako magazyn** — odrzucone. Historia gita rośnie bezpowrotnie
   (każdy commit z binarką zostaje w `.git` na zawsze bez przepisywania historii). Git
   LFS: **10GB storage + 10GB transferu/miesiąc na konto** (nie na repo) — realne
   ryzyko przy 12 miastach × codziennie × lata. Wzorzec „git scraping" (Simon Willison)
   istnieje, ale nikt nie udokumentował utrzymania go na tę skalę bez czyszczenia
   historii.
3. **GitHub Pages jako katalog/indeks** — rozpoznany wzorzec (najbliższy odpowiednik:
   statyczne katalogi STAC dla danych geoprzestrzennych). Stabilne URL-e do assetów
   release'ów (`releases/download/<tag>/<plik>`) trzymają się dopóki release+tag
   istnieją.
4. **Alternatywne magazyny** — Cloudflare R2 (10GB free, egress zawsze darmowy) i
   Backblaze B2 (10GB free) realnie pokrywają skalę tego projektu na długo, ale **to
   nie jest problem pojemnościowy** — Zenodo odrzucone (myślane pod okresowe, nie
   codzienne automatyczne publikacje). Prior art z branży GTFS (Mobility Database,
   transit.land) wcale nie używa struktury folder/data — transit.land wersjonuje po
   hashu SHA1 zawartości feedu, w bazie+API, nie w plikach. Nie ma tu „złotego
   standardu" do skopiowania.

**Decyzja:** dane zostają tam, gdzie są (GitHub Releases w `easy-GTFS-RT`, zero
migracji) — buduje się tylko warstwa katalogu/przeglądania nad nimi. Problem był
odkrywalnością, nie pojemnością.

## 3. Iteracja mockupu (artifact, ta sama rozmowa)

Trzy wersje, każda na bezpośredni feedback Michała:

- **v1** — panel boczny (drzewo miasto→miesiąc) + jedna płaska, filtrowana tabela.
  Feedback: to w gruncie rzeczy to samo „wszystko naraz", tylko z innym filtrem —
  niechciane, bo miało wyglądać jak realny drill-down.
- **v2** — prawdziwy drill-down, jeden poziom na raz: karty (grid) dla miast i
  miesięcy, tabela dla dni, breadcrumby. To była właściwa struktura.
- **v3** — na prośbę Michała: karty zamienione na pionową listę (zamiast gridu);
  dodany 4. poziom (szczegóły dnia) z wykresem renderowanym na miejscu (canvas, dane
  syntetyczne, seedowane per miasto+data) i wyróżnionym szczytem opóźnień (kształt,
  nie tylko kolor — zgodnie ze skillem `dataviz`).
- **Audyt `ui-ux-pro-max`** — Michał poprosił o przepuszczenie mockupu przez ten
  skill. Wynik: rekomendowana paleta (niebiesko-bursztynowa, generyczna) odrzucona na
  rzecz już istniejącej marki z `mkdocs.yml` Michała (silniejszy sygnał niż domyślna
  rekomendacja dla pustego projektu). Znalezione i naprawione **realne** problemy:
  wiersz dnia w tabeli był nieosiągalny z klawiatury (`<tr onclick>` bez
  `tabindex`/`role`) — naprawione; brak hierarchii `<h1>` — dodany per-poziomowy
  nagłówek; wykres bez wyróżnionego ekstremum — dodany romb + etykieta (potwierdzone
  niezależnie przez bazę wykresów `ui-ux-pro-max` i skill `dataviz`).
- **v4 (finalna w tym folderze, `mockup-reference.html`)** — dwie ostatnie prośby
  Michała: (a) wrócić do gridu (kart) dla miast/miesięcy, zostawić resztę struktury
  bez zmian; (b) zamiast renderowanego wykresu — osadzić prawdziwy PNG z release'u
  (`<img>` z `onerror` fallbackiem), bo Michał zapytał wprost, skąd bierze się ten
  wykres.

## 4. Skąd faktycznie bierze się wykres (zweryfikowane w kodzie, nie zgadnięte)

`tools/analysis/gtfs_static_vs_realized_diff.py` (`easy-OTP`), funkcja
`plot_mean_delay` (matplotlib): liczy się **bezpośrednio z różnicy dwóch plików
GTFS** (statycznego i „zrealizowanego" z Family A) w tym samym przebiegu skryptu, który
też pisze `_summary.csv`. **CSV nie jest źródłem wykresu** — to równoległy, dodatkowy
eksport tych samych danych z tego samego przebiegu, nie coś, z czego wykres jest potem
odczytywany. Oba (`_chart.png`, `_summary.csv`) są best-effort assetami release'u w
`easy-GTFS-RT` — mogą legalnie nie istnieć dla danego dnia (np. same zerowe
opóźnienia — skrypt świadomie pomija wykres w takim przypadku).

## 5. Decyzja o odświeżaniu manifestu

Michał: „możemy narazie zrobić opcję regeneracji od zera, żeby np. o północy
odświeżała się strona". Zaakceptowane z jedną poprawką, opartą na precedensie z
tego samego projektu: `easy-GTFS-RT`'s własne README dokumentuje dokładnie ten sam
błąd popełniony i naprawiony wcześniej — pojedynczy trigger o stałej porze
(Warszawa) nie pokrywa bezpiecznie miast w innych strefach (Boston kończy okno
nagrywania dopiero ok. 04:00 czasu warszawskiego następnego dnia). Stąd `PRD.md`
rekomenduje **okresowe** odpytywanie (co 30 min, cały dzień), nie jednorazowe o
północy — to świadome odejście od dosłownej propozycji Michała, uzasadnione
udokumentowanym precedensem w tym samym repo, nie moim domysłem.

## 6. Architektura — co zostało ustalone, co wymaga potwierdzenia

**Ustalone/zweryfikowane w tej rozmowie:**
- Osobne repozytorium (nie podfolder `gisboostgithub`/`GISBoost/gisboost.github.io`)
  — potwierdzone przez `gh api repos/GISBoost/gisboost.github.io/pages`: główna
  strona Michała to repo `GISBoost/gisboost.github.io` (nie `portfolio-gisboost`, jak
  sugerował lokalny `git remote` — to stara nazwa sprzed rename'u, GitHub przekierował
  automatycznie), legacy Pages build z brancha `gh-pages`, adres bazowy
  `gisboost.github.io/`. Nowe repo `gtfs-dashboard` wyląduje pod
  `gisboost.github.io/gtfs-dashboard/` — osobna ścieżka, zero kolizji.
- **To nie będzie osobna domena** — Michał dopytał o to wprost. GitHub Pages: jedna
  strona „główna" per konto/org (user/org page, repo musi się nazywać dosłownie
  `<org>.github.io`) + dowolna liczba stron „projektowych" (project page, dowolna
  nazwa repo, własna podścieżka pod tą samą domeną). `gtfs-dashboard` to druga
  kategoria — inna ścieżka, ta sama domena `gisboost.github.io`, całkowicie osobne
  repo/build/CI od MkDocsowej strony głównej. Inna domena byłaby możliwa tylko przez
  ręczny `CNAME` — poza zakresem tego planu.
- Zero potrzebnych nowych sekretów — `easy-GTFS-RT` jest publiczne, domyślny
  `github.token` workflow'u w `gtfs-dashboard` wystarcza do odczytu.
- Paginacja Releases API jest obowiązkowa (nie „nice to have") — przy tempie ~12
  release'ów dziennie strona 1 (100 wpisów) wyczerpuje się w niecały tydzień.

**Do potwierdzenia przez Michała (patrz `PRD.md` sekcja 7):**
- Dokładna nazwa/właściciel nowego repo (rekomendacja: `GISBoost/gtfs-dashboard`,
  publiczne).
- Dokładny interwał odświeżania (rekomendacja: co 30 min).

## 7. Pytanie o reorganizację folderów na Pulpicie (odpowiedź, nie tylko rekomendacja)

Michał rozważa przeniesienie `easy-OTP`, `easy-GTFS-RT` i `gisboostgithub` do
wspólnego folderu `Pulpit\easy\`, z `gtfs-dashboard` jako sąsiadem (nie w środku
`gisboostgithub`).

**To dobry pomysł, z jednym zastrzeżeniem.** Żadna część rzeczywistego pipeline'u nie
zależy od lokalnego układu folderów na dysku Michała — wszystkie odniesienia
między-repowe (checkout `GISBoost/easy-OTP` w workflow'ach `easy-GTFS-RT`, dispatch z
telefonu do `easy-GTFS-RT`, itd.) idą przez GitHub, nie przez lokalne ścieżki
względne. Przeniesienie folderów to więc czysto organizacyjna wygoda — `.git` w
każdym folderze przetrwa zwykłe przeniesienie/`mv`/drag-and-drop bez żadnych zmian w
zdalnych repo. Jedyne, co może się „zepsuć": zakładki/ostatnio-otwierane-projekty w
IDE albo skróty wskazujące na stare, absolutne ścieżki — drobna, spodziewana
konsekwencja każdego przenoszenia folderów, nie realne ryzyko dla samych repo.

Co do `gtfs-dashboard` jako sąsiada, nie podfolderu `gisboostgithub`: intuicja Michała
(MkDocs traktuje każdy `.md` pod `docs/` jako osobną podstronę) jest trafna dla plików
`.md` — ale technicznie plik `.html` (nie `.md`) pod `docs/` w MkDocs jest kopiowany
bez zmian, nie renderowany jako strona (tak jak już działają `docs/assets/*.pdf`/
`*.mp4` w tym repo). Nie to jednak przeważyło decyzję — rekomendacja w `PRD.md` to
**osobne repozytorium GitHub** dla `gtfs-dashboard` (własny cykl wdrożeń, brak
sprzężenia z buildem MkDocs głównej strony, brak potrzeby obchodzenia
`navigation.instant`'s `document$.subscribe()` MkDocs-Material), a osobne repo git
strukturalnie **musi** być osobnym folderem na dysku niezależnie od powyższego —
więc instynkt Michała (sąsiad, nie podfolder) jest dokładnie poprawny, z innego
niż zakładany powodu.

## 8. Co dalej

`PRD.md` (specyfikacja pełna), `PROMPTS.md` (GD-1, GD-2 do wykonania przez Claude
Code), `mockup-reference.html` (specyfikacja wizualna) — wszystko w tym folderze.
Pierwszy krok, zanim GD-1 ruszy: Michał zakłada repo `GISBoost/gtfs-dashboard` (albo
potwierdza inną nazwę) i potwierdza dwie otwarte kwestie z `PRD.md` sekcji 7.
