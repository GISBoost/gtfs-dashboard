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
    navDiagnostics: "Diagnostyka",
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

    // --- Family A diagnostics (diagnostics/*.html) — static prose, shared across the three pages ---
    diagBackToDashboard: "← Wróć do dashboardu",
    diagReadReport: "Zobacz raport →",
    diagSourceEasyOtp: "Źródło: easy-OTP",
    diagFullSourceData: "Pełne dane źródłowe",

    diagIdxTitle: "Diagnostyka Family A",
    diagIdxLede1Html: "Każdy widok dzień-po-dniu w tym dashboardzie jest zbudowany przez <strong>Family A</strong> — pipeline, który zamienia surowe pozycje pojazdów z GTFS-RT w „zrealizowany” feed GTFS: przepisany <code>stop_times.txt</code>, w którym czasy przyjazdu/odjazdu odzwierciedlają to, co pojazdy faktycznie tego dnia robiły (P50: typowy kurs; P85: wolniejszy, ale wciąż częsty kurs), zamiast tego, co obiecywał rozkład jazdy. Kod znajduje się w <a href=\"https://github.com/GISBoost/easy-OTP/tree/main/tools/family_a_reconstruction\" target=\"_blank\" rel=\"noopener\"><code>tools/family_a_reconstruction</code></a> w repozytorium <a href=\"https://github.com/GISBoost/easy-OTP\" target=\"_blank\" rel=\"noopener\">easy-OTP</a>.",
    diagIdxLede2Html: "Pipeline, który odtwarza rozkład jazdy z zaszumionych, niekompletnych danych rzeczywistych, może się mylić w sposób łatwy do przeoczenia — nie dlatego, że kod ma błąd, ale dlatego, że jakieś założenie wejściowe po cichu przestaje być prawdziwe dla konkretnego miasta albo konkretnego dnia. Zamiast ufać tylko wynikowi, uruchamiamy kontrolowane eksperymenty na prawdziwych nagraniach, żeby sprawdzić <em>kiedy</em> i <em>dlaczego</em> odtworzeniu można ufać, i publikujemy wyniki tutaj, obok przeglądarki danych — ta sama przejrzystość, jaką ten dashboard już daje w dane same w sobie.",
    diagIdxReportsHeading: "Raporty",
    diagIdxReport1Title: "Ile nagrywania GTFS-RT wystarczy?",
    diagIdxReport1DescHtml: "Więcej dni nagrywania daje segmentowi więcej obserwacji, więc jego estymata P50/P85 powinna się stabilizować — ale ile dni to „wystarczy”, i czy łączenie wielu dni może się kiedyś odbić czkawką? Dwie rundy eksperymentów (9 miast, okna od 1 do 20 dni) mierzą, jak bardzo faktycznie porusza się estymata segmentu wraz z dodawaniem kolejnych dni nagrywania, i po drodze odkrywają większy, osobny problem: około połowa przebadanych miast po cichu traci dane, gdy jeden statyczny plik GTFS jest używany wielokrotnie w wielodniowym oknie nagrywania.",
    diagIdxReport1Stat1: "14 dni ≈ punkt nasycenia",
    diagIdxReport1Stat2: "4 / 9 miast: niedopasowanie statyk/okno",
    diagIdxReport2Title: "Flotowy przegląd stabilności kalendarza i trip_id",
    diagIdxReport2DescHtml: "Raporty o czasie nagrywania znalazły, że kilka miast republikuje swój statyczny GTFS na tyle często, że psuje to wielodniowe odtworzenie. Ten przegląd sprawdza wszystkie 25 miast/przewoźników floty — nie tylko te już oflagowane — próbkując trzy migawki statycznego GTFS na miasto i mierząc, ile z <code>trip_id</code>, <code>route_id</code> i <code>stop_id</code> faktycznie przetrwa między publikacjami, oraz jak szerokie jest okno ważności <code>calendar.txt</code> każdego feedu.",
    diagIdxReport2Stat1: "9 / 25 miast: niestabilny trip_id",
    diagIdxReport2Stat2: "11 / 25: brak calendar.txt w ogóle",
    diagIdxAboutHeading: "Czym to jest (a czym nie jest)",
    diagIdxAboutTextHtml: "To wewnętrzna diagnostyka inżynierska, nie stwierdzenie, że jakikolwiek opublikowany w tym dashboardzie feed realized-GTFS jest błędny. Istnieje po to, żeby uczynić założenia pipeline'u jawnymi, znaleźć, gdzie się psują, i zdecydować, co naprawić dalej — otwarcie, tak samo jak reszta tego projektu jest rozwijana. Ustalenia, które zamieniają się w poprawki, wracają do README i testów <code>family_a_reconstruction</code>; ustalenia, które wciąż są otwartymi pytaniami, są śledzone jako dokumenty przeglądowe w folderze <a href=\"https://github.com/GISBoost/easy-OTP/tree/main/docs/reviews\" target=\"_blank\" rel=\"noopener\"><code>docs/reviews</code></a> w <code>easy-OTP</code>.",

    diagRdCrumb: "Czas nagrywania",
    diagRdTitle: "Ile nagrywania GTFS-RT wystarczy?",
    diagRdKicker: "family_a_reconstruction — raport diagnostyczny",
    diagRdLede1Html: "Family A zamienia surowe nagrania pozycji pojazdów GTFS-RT w „zrealizowany” feed GTFS: dla każdego <strong>segmentu</strong> przystanek-do-przystanku (linia, kierunek, para przystanków, typ dnia, kubełek pory dnia) łączy każdy zaobserwowany czas przejścia, jaki ma, i raportuje 50. i 85. percentyl (P50/P85) jako poprawiony czas przyjazdu/odjazdu. Więcej dni nagrywania to więcej obserwacji na segment — więc w zasadzie estymata powinna się stabilizować wraz z dłuższym nagrywaniem. Ten raport mierzy, jak bardzo faktycznie się porusza, w dwóch rundach eksperymentów na prawdziwych danych: okna 1/3/5 dni na 4 miastach, potem okna 5/14/20 dni na 5 kolejnych.",
    diagRdLede2Html: "Wynik nagłówkowy w ogóle nie dotyczył rozrzutu: około połowa z dziewięciu przebadanych miast okazała się po cichu łamać całe założenie, bo jeden plik statycznego GTFS był używany w całym wielodniowym oknie nagrywania, podczas gdy prawdziwy statyczny feed miasta już się pod spodem zmienił. To ustalenie jest co najmniej tak samo ważne jak sama krzywa zbieżności, więc jest raportowane jako pierwsze.",
    diagRdGlossaryHtml: "<b>Pojęcia użyte niżej</b> — <b>klucz segmentu</b>: (linia, kierunek, para przystanków, typ dnia, kubełek pory dnia) — jednostka, do której pulowana jest każda obserwacja. <b>P50/P85</b>: 50./85. percentyl czasu przejścia dla klucza segmentu, czyli „typowy” kurs kontra „wolniejszy, ale wciąż częsty”. <b>Odsetek odrzuceń (FA-15)</b>: udział surowych pozycji GTFS-RT, których nie dało się dopasować do żadnego zaplanowanego kursu w statycznym GTFS użytym w danym przebiegu — telemetria, na której opiera się ten raport, żeby wykryć zepsute parowanie statyk/nagranie.",
    diagRdStat1Label: "miast przebadanych w obu rundach",
    diagRdStat2Label: "miast, gdzie parowanie statyk↔okno się psuje (rosnące odrzucenia, nie rozrzut)",
    diagRdStat3Label: "mediana ΔP50 i ΔP85 na kroku 14→20 dni, we wszystkich 4 zdrowych miastach",
    diagRdStat4Label: "praktyczne minimum (3 dni) do punktu bliskiego nasycenia (10–14 dni)",
    diagRdS1Heading: "1 · Liczba dopasowanych obserwacji vs długość okna nagrywania",
    diagRdS1SubHtml: "Skala logarytmiczna. Płaska linia oznacza, że dodatkowe dni nagrywania nie dołożyły ani jednej nowo dopasowanej pozycji — statyczny GTFS już się rozjechał z danymi. Rosnąca linia oznacza, że nagrywanie faktycznie się opłaca.",
    diagRdS1Caption: "Liczby dopasowanych obserwacji dla rundy 2 są policzone jako (klucze segmentów) × (średnia obserwacji na klucz) z raportu źródłowego — dokładnie równe całkowitej liczbie obserwacji.",
    diagRdS2Heading: "2 · Macierz odrzuceń dopasowania (telemetria FA-15, %)",
    diagRdS2SubHtml: "Im ciemniejsza komórka, tym większy odsetek pozycji GTFS-RT odrzucony podczas dopasowywania. Miasta oflagowane ⚠ mają potwierdzony problem „jeden statyk na całe okno” (albo renumeracja <code>trip_id</code>, albo wąskie okno ważności <code>calendar.txt</code>) — rosnące odrzucenia są tam objawem tego defektu, nie miarą jakości nagrywania.",
    diagRdS3Heading: "3 · Macierz głębi obserwacji — % kluczy segmentów z <5 obserwacjami",
    diagRdS3SubHtml: "Poniżej ok. 5 obserwacji na klucz segmentu wybór metody percentyla istotnie zmienia wynik. Ciemniejsze komórki zawierają więcej płytko obserwowanych kluczy.",
    diagRdS4Heading: "4 · Krzywa malejących przyrostów — mediana |ΔP50| / |ΔP85| między oknami",
    diagRdS4SubHtml: "Pokazane są tylko „czyste” przejścia (bez artefaktu nieaktualnego statyku, bez zupełnie nowej populacji kluczy). Słupek = mediana zmiany wartości segmentu przy dołożeniu więcej dni; cienka linia nad nim to p90 (ogon rozkładu). Grupy idą od najkrótszego do najdłuższego przebadanego kroku nagrywania.",
    diagRdS4Caption: "Krok 14→20 dni (runda 2, wszystkie 4 miasta z kompletnym zbiorem danych, w tym Poznań) daje medianę dokładnie 0,0 s zarówno dla P50, jak i P85 — pierwszy czysty dowód zbieżności w obu rundach, a nie tylko brak nowych danych.",
    diagRdS5Heading: "5 · Skład kluczy segmentów wg dnia tygodnia (największe przebadane okno na miasto)",
    diagRdS5SubHtml: "Klucz segmentu zawiera <code>day_type</code>, więc obserwacje z weekendu nigdy nie mieszają się z obserwacjami dnia roboczego — dodanie dni weekendowych do okna dokłada osobną, równoległą populację kluczy, zamiast rozcieńczać estymatę dnia roboczego.",
    diagRdRound1Windows: "Runda 1 — okna 1 / 3 / 5 dni",
    diagRdRound2Windows: "Runda 2 — okna 5 / 14 / 20 dni",
    diagRdSourceNoteHtml: "Źródło: <code>docs/reviews/family-a_recording-duration-experiment.md</code> (runda 1) i <code>-v2.md</code> (runda 2) w <a href=\"https://github.com/GISBoost/easy-OTP\" target=\"_blank\" rel=\"noopener\">easy-OTP</a>. Powiązane: proponowana naprawa problemu parowania statyku jest opisana w <code>docs/reviews/family-a_multi-day-static-pairing_plan.md</code> (jeszcze niewdrożona).",

    diagCalCrumb: "Kalendarz i trip_id",
    diagCalTitle: "Flotowy przegląd stabilności kalendarza i trip_id",
    diagCalKicker: "family_a_reconstruction — raport diagnostyczny, 25 miast",
    diagCalLede1Html: "Krok <code>build</code> narzędzia Family A rozwiązuje każdy zaobserwowany <code>trip_id</code> z GTFS-RT względem dokładnie jednego pliku statycznego GTFS. Jeśli namespace <code>trip_id</code> tego pliku został już renumerowany, albo jego okno ważności <code>calendar.txt</code> nie sięga dnia, który jest odtwarzany, obserwacja jest po cichu odrzucana zamiast dołączona do puli — problem jakości danych, nie awaria, więc nic tego nie sygnalizuje, jeśli się tego celowo nie sprawdzi. Powiązany raport (<a href=\"recording-duration.html\">ile nagrywania wystarczy?</a>) znalazł to zjawisko w około połowie z dziewięciu ręcznie dobranych miast. Ten przegląd sprawdza, czy to była obciążona próbka, charakteryzując <strong>wszystkie 25</strong> miast/przewoźników aktualnie śledzonych przez flotę — używając wyłącznie samych plików statycznego GTFS, bez nagrań GTFS-RT i bez uruchamiania pipeline'u odtwarzania, co czyni to na tyle tanim, żeby uruchomić od razu na całej flocie.",
    diagCalLede2Html: "Dla każdego miasta wybrano trzy migawki statycznego GTFS, rozłożone możliwie równomiernie w dostępnej historii wydań (najwcześniejsza / środkowa / najnowsza), i porównano: jak szerokie jest okno ważności <code>calendar.txt</code>/<code>calendar_dates.txt</code> każdej migawki, oraz ile z namespace'u <code>trip_id</code>, <code>route_id</code> i <code>stop_id</code> faktycznie przetrwa między trzema migawkami (overlap Jaccarda trzech zbiorów ID).",
    diagCalGlossaryHtml: "<b>Jak czytać liczby</b> — <b>overlap Jaccarda</b> to prosta miara podobieństwa dwóch zbiorów: liczba elementów wspólnych podzielona przez liczbę elementów w sumie obu zbiorów. Dla dwóch identycznych zbiorów <code>trip_id</code> wychodzi 1,0; dla dwóch zupełnie rozłącznych — 0,0. Tutaj liczony jest parami między trzema próbkowanymi datami i uśredniany, więc niska wartość oznacza, że większość identyfikatorów z jednej migawki statyku po prostu nie istnieje w drugiej. Szerokie okno <code>calendar.txt</code> <b>nie</b> oznacza stabilnego namespace'u <code>trip_id</code> — te dwie rzeczy są sprawdzane osobno niżej, i kilka miast jest szerokich na jednej osi, a niestabilnych na drugiej. 12 z 25 miast miało w momencie badania tylko 7 wydań rozłożonych na 8 dni, więc ich „3 daty” to naprawdę tylko 3–4 dni odstępu zamiast tygodni — te wiersze są oznaczone jako niska pewność, zamiast prezentować fałszywą precyzję.",
    diagCalStat1Label: "miast objętych, żadne nie pominięte",
    diagCalStat2Label: "brak calendar.txt w ogóle (44% floty — tylko calendar_dates.txt)",
    diagCalStat3Label: "niestabilny trip_id — jeden statyk nie jest bezpieczny nawet na <2 tygodnie (36% floty)",
    diagCalStat4Label: "znaleziona niestabilność route_id (Brisbane, Jaccard 0,574 — wcześniej zakładane jako zawsze stabilne)",
    diagCalS1Heading: "1 · Szacowane bezpieczne okno poolingu jednym statykiem, per miasto",
    diagCalS1SubHtml: "Skala logarytmiczna, dni. Pasek = szacowany zakres (albo pojedyncza wartość, gdy nie dało się ustalić zakresu). Przyblakłe paski = niska pewność (mały rozstaw próbek — dni zamiast tygodni). <span style=\"color:var(--red)\">✱</span> = wzorzec Jaccarda niemonotoniczny w czasie — możliwa cykliczna renumeracja, oflagowana jako niepotwierdzona hipoteza. <sup>†</sup> przy nazwie = brak <code>calendar.txt</code> w ogóle, tylko calendar_dates.txt.",
    diagCalS2Heading: "2 · Macierz stabilności identyfikatorów (overlap Jaccarda między 3 próbkowanymi datami)",
    diagCalS2SubHtml: "1,0 = identyczny zbiór ID we wszystkich 3 próbkach; 0,0 = zupełnie rozłączne zbiory. Miasta pogrupowane wg reżimu z panelu 1. <code>route_id</code>/<code>stop_id</code> są „zwykle” stabilne — Brisbane to jedyne miasto warte dodatkowej uwagi.",
    diagCalS3Title: "3 · Skład floty wg reżimu",
    diagCalS3Caption: "Jeden pasek = 100% floty (25 miast).",
    diagCalS4Title: "4 · Okno kalendarza ≠ stabilność trip_id",
    diagCalS4Caption: "Oś X: zadeklarowane okno kalendarza (dni, skala log). Oś Y: średni Jaccard trip_id. Szerokie okno kalendarza (ufając samemu <code>calendar.txt</code>) nie gwarantuje stabilnego namespace'u <code>trip_id</code> — widać to po miastach w prawym dolnym rogu (szerokie okno, niski Jaccard).",
    diagCalAboutHeading: "Co to oznacza dla planu okna poolingu",
    diagCalAboutTextHtml: "Grupa niestabilnego <code>trip_id</code> to 9/25 miast (36% floty), nie przypadek brzegowy — warto ją priorytetyzować, gdy powstanie opisana w <code>docs/reviews/family-a_multi-day-static-pairing_plan.md</code> naprawa uwzględniająca „ery” statyku. Ale GZM, Suwałki i Kielce pokazują <em>niemonotoniczny</em> wzorzec Jaccarda (ustalenie #4 w raporcie źródłowym), który czysto data-based detektor er mógłby źle rozpoznać — to wymaga gęstszego próbkowania (codzienne migawki przez 2+ tygodnie), zanim naprawę uogólni się na te miasta.",
    diagCalSourceNoteHtml: "Źródło: <code>docs/reviews/family-a_calendar-window-fleet-survey.md</code> w <a href=\"https://github.com/GISBoost/easy-OTP\" target=\"_blank\" rel=\"noopener\">easy-OTP</a>. Powiązany raport: <a href=\"recording-duration.html\">ile nagrywania GTFS-RT wystarczy?</a>",
  },
  en: {
    homeAriaLabel: "Home — all cities",
    brandSub: "/ GTFS-RT recording catalog",
    navCompare: "City comparison",
    navBackups: "Backups",
    navHowItWorks: "How it works",
    navDiagnostics: "Diagnostics",
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

    // --- Family A diagnostics (diagnostics/*.html) — static prose, shared across the three pages ---
    diagBackToDashboard: "← Back to dashboard",
    diagReadReport: "Read the report →",
    diagSourceEasyOtp: "Source: easy-OTP",
    diagFullSourceData: "Full source data",

    diagIdxTitle: "Family A diagnostics",
    diagIdxLede1Html: "Every day-by-day view in this dashboard is built by <strong>Family A</strong>, a pipeline that turns raw GTFS-RT vehicle-position pings into a &ldquo;realized&rdquo; GTFS feed &mdash; a rewritten <code>stop_times.txt</code> whose arrival/departure times reflect what vehicles actually did that day (P50: typical run; P85: a slower, but still common, run) instead of what the timetable promised. The code lives in <a href=\"https://github.com/GISBoost/easy-OTP/tree/main/tools/family_a_reconstruction\" target=\"_blank\" rel=\"noopener\"><code>tools/family_a_reconstruction</code></a> in the <a href=\"https://github.com/GISBoost/easy-OTP\" target=\"_blank\" rel=\"noopener\">easy-OTP</a> repository.",
    diagIdxLede2Html: "A pipeline that reconstructs a schedule from noisy, incomplete real-world data can be wrong in ways that are easy to miss &mdash; not because the code has a bug, but because an input assumption quietly stops holding for a particular city or a particular day. Rather than only trusting the output, we run controlled experiments against real recordings to find out <em>when</em> and <em>why</em> the reconstruction can be trusted, and publish the results here alongside the data browser &mdash; the same transparency this dashboard already gives you into the data itself.",
    diagIdxReportsHeading: "Reports",
    diagIdxReport1Title: "How much GTFS-RT recording is enough?",
    diagIdxReport1DescHtml: "More days of recording give a segment more observations, so its P50/P85 estimate should stabilize &mdash; but how many days is &ldquo;enough&rdquo;, and does pooling multiple days ever backfire? Two rounds of experiments (9 cities, windows from 1 to 20 days) measure how much a segment's estimate actually moves as more recording days are added, and uncover a bigger, separate problem along the way: about half the tested cities silently lose data when a single static GTFS file is reused across a multi-day recording window.",
    diagIdxReport1Stat1: "14 days ≈ saturation point",
    diagIdxReport1Stat2: "4 / 9 cities: static/window mismatch",
    diagIdxReport2Title: "Fleet-wide calendar & trip_id stability survey",
    diagIdxReport2DescHtml: "The recording-duration reports found that a handful of cities republish their static GTFS often enough to break a multi-day reconstruction. This survey checks all 25 cities/operators in the fleet &mdash; not just the ones already flagged &mdash; by sampling three static GTFS snapshots per city and measuring how much of <code>trip_id</code>, <code>route_id</code> and <code>stop_id</code> actually survives between publications, and how wide each feed's <code>calendar.txt</code> validity window really is.",
    diagIdxReport2Stat1: "9 / 25 cities: trip_id unstable",
    diagIdxReport2Stat2: "11 / 25: no calendar.txt at all",
    diagIdxAboutHeading: "What this is (and isn't)",
    diagIdxAboutTextHtml: "These are internal engineering diagnostics, not a claim that any published realized-GTFS feed in this dashboard is wrong. They exist to make the pipeline's assumptions explicit, find where they break, and decide what to fix next &mdash; in the open, the same way the rest of this project is developed. Findings that turn into fixes get folded back into <code>family_a_reconstruction</code>'s own README and test suite; findings that are still open questions are tracked as review documents in the <a href=\"https://github.com/GISBoost/easy-OTP/tree/main/docs/reviews\" target=\"_blank\" rel=\"noopener\"><code>docs/reviews</code></a> folder of <code>easy-OTP</code>.",

    diagRdCrumb: "Recording duration",
    diagRdTitle: "How much GTFS-RT recording is enough?",
    diagRdKicker: "family_a_reconstruction — diagnostic report",
    diagRdLede1Html: "Family A turns raw GTFS-RT vehicle-position recordings into a &ldquo;realized&rdquo; GTFS feed: for every stop-to-stop <strong>segment</strong> (a route, a direction, a pair of stops, a day type, a time-of-day bucket), it pools every observed crossing time it has and reports the 50th and 85th percentile (P50/P85) as the corrected arrival/departure time. More recording days mean more observations per segment — so in principle, the estimate should stabilize as you record longer. This report measures how much it actually moves, across two rounds of real-data experiments: 1/3/5-day windows on 4 cities, then 5/14/20-day windows on 5 more.",
    diagRdLede2Html: "The headline result was not really about dispersion at all: about half of the nine cities tested turned out to silently break the whole premise, because a single static GTFS file was reused across a multi-day recording window while the city's real static feed had already moved on underneath it. That finding is at least as important as the convergence curve itself, so it's reported first.",
    diagRdGlossaryHtml: "<b>Terms used below</b> — <b>segment key</b>: (route, direction, stop pair, day type, time-of-day bucket) — the unit every observation is pooled into. <b>P50/P85</b>: the 50th/85th percentile crossing time for a segment key, i.e. a &ldquo;typical&rdquo; run vs. a &ldquo;slower but still common&rdquo; one. <b>Reject share (FA-15)</b>: the share of raw GTFS-RT positions that could not be matched to any scheduled trip in the static GTFS used for that run — the telemetry this report leans on to detect a broken static/recording pairing.",
    diagRdStat1Label: "cities tested across both rounds",
    diagRdStat2Label: "cities where static↔window pairing breaks (rising rejections, not dispersion)",
    diagRdStat3Label: "median ΔP50 and ΔP85 at the 14→20 day step, in all 4 healthy cities",
    diagRdStat4Label: "practical minimum (3 days) to near-saturation point (10–14 days)",
    diagRdS1Heading: "1 · Matched observations vs. recording window length",
    diagRdS1SubHtml: "Log scale. A flat line means extra recording days added zero newly matched positions — the static GTFS had already drifted out of sync with the data. A rising line means recording actually pays off.",
    diagRdS1Caption: "Round 2 matched-observation counts are computed as (segment keys) × (mean observations per key) from the underlying report — exactly equal to the total observation count.",
    diagRdS2Heading: "2 · Match rejection matrix (FA-15 telemetry, %)",
    diagRdS2SubHtml: "Darker cell = a larger share of GTFS-RT positions rejected during matching. Cities flagged ⚠ have a confirmed &ldquo;one static covers the whole window&rdquo; problem (either a <code>trip_id</code> renumbering or a narrow <code>calendar.txt</code> validity window) — rising rejections there are a symptom of that defect, not a measure of recording quality.",
    diagRdS3Heading: "3 · Observation-depth matrix — % of segment keys with <5 observations",
    diagRdS3SubHtml: "Below about 5 observations per segment key, the choice of percentile method materially changes the result. Darker cells hold more thinly observed keys.",
    diagRdS4Heading: "4 · Diminishing-returns curve — median |ΔP50| / |ΔP85| between windows",
    diagRdS4SubHtml: "Only &ldquo;clean&rdquo; transitions are shown (no static-staleness artefact, no brand-new segment-key population). Bar = median change in a segment's value when more days are added; the thin line above it is p90 (the tail). Groups run from the shortest to the longest recording step tested.",
    diagRdS4Caption: "The 14→20 day step (round 2, all 4 cities with a complete dataset, including Poznań) gives a median of exactly 0.0 s for both P50 and P85 — the first clean convergence proof in either round, not just an absence of new data.",
    diagRdS5Heading: "5 · Segment-key composition by day of week (largest window tested per city)",
    diagRdS5SubHtml: "A segment key includes <code>day_type</code>, so weekend observations never mix with weekday ones — adding weekend days to a window adds a separate, parallel population of keys rather than diluting the weekday estimate.",
    diagRdRound1Windows: "Round 1 — 1 / 3 / 5-day windows",
    diagRdRound2Windows: "Round 2 — 5 / 14 / 20-day windows",
    diagRdSourceNoteHtml: "Source: <code>docs/reviews/family-a_recording-duration-experiment.md</code> (round 1) and <code>-v2.md</code> (round 2) in <a href=\"https://github.com/GISBoost/easy-OTP\" target=\"_blank\" rel=\"noopener\">easy-OTP</a>. Related: the proposed fix for the static-pairing problem is written up in <code>docs/reviews/family-a_multi-day-static-pairing_plan.md</code> (not yet implemented).",

    diagCalCrumb: "Calendar & trip_id survey",
    diagCalTitle: "Fleet-wide calendar & trip_id stability survey",
    diagCalKicker: "family_a_reconstruction — diagnostic report, 25 cities",
    diagCalLede1Html: "Family A's <code>build</code> step resolves every observed GTFS-RT <code>trip_id</code> against exactly one static GTFS file. If that file's <code>trip_id</code> namespace has already been renumbered, or its <code>calendar.txt</code> validity window doesn't reach the day being reconstructed, the observation is silently rejected rather than pooled &mdash; a data-quality problem, not a crash, so nothing about it shows up unless you go looking. A companion report (<a href=\"recording-duration.html\">how much recording is enough?</a>) found this happening in about half of nine hand-picked cities. This survey checks whether that was a biased sample by characterizing <strong>all 25</strong> cities/operators currently tracked by the fleet &mdash; using only the static GTFS files themselves, no GTFS-RT recordings and no reconstruction pipeline runs, which keeps it cheap enough to run on the whole fleet at once.",
    diagCalLede2Html: "For every city, three static GTFS snapshots were sampled as evenly as the available release history allowed (earliest / middle / most recent), and compared on: how wide each snapshot's <code>calendar.txt</code>/<code>calendar_dates.txt</code> validity window is, and how much of the <code>trip_id</code>, <code>route_id</code> and <code>stop_id</code> namespace actually survives between the three snapshots (the Jaccard overlap of the three ID sets — 1.0 means identical, 0.0 means completely disjoint).",
    diagCalGlossaryHtml: "<b>Reading the numbers</b> — the <b>Jaccard overlap</b> is a simple similarity measure between two sets: the number of shared elements divided by the number of elements in either set. For two identical <code>trip_id</code> sets it's 1.0; for two completely disjoint sets, 0.0. Here it's computed pairwise between the three sampled dates and averaged, so a low value means most identifiers from one static snapshot simply don't exist in another. A wide <code>calendar.txt</code> window does <b>not</b> imply a stable <code>trip_id</code> namespace; the two are checked separately below, and several cities are wide on one axis and unstable on the other. 12 of the 25 cities only had 7 releases spread across 8 days available at survey time, so their &ldquo;3 dates&rdquo; are really only 3–4 days apart instead of weeks &mdash; those rows are marked as low-confidence rather than presented with false precision.",
    diagCalStat1Label: "cities covered, none skipped",
    diagCalStat2Label: "no calendar.txt at all (44% of the fleet — calendar_dates.txt only)",
    diagCalStat3Label: "trip_id-unstable — one static isn't safe for even &lt;2 weeks (36% of the fleet)",
    diagCalStat4Label: "route_id instability found (Brisbane, Jaccard 0.574 — previously assumed always stable)",
    diagCalS1Heading: "1 · Estimated safe single-static pooling window, per city",
    diagCalS1SubHtml: "Log scale, days. Bar = the estimated range (or a point estimate, when no range could be established). Faded bars = low confidence (a small sample spread — days instead of weeks). <span style=\"color:var(--red)\">✱</span> = the Jaccard pattern is non-monotonic over time — a possible cyclical renumbering, flagged as an unconfirmed hypothesis. <sup>†</sup> next to a name = no <code>calendar.txt</code> at all, only calendar_dates.txt.",
    diagCalS2Heading: "2 · Identifier-stability matrix (Jaccard overlap between the 3 sampled dates)",
    diagCalS2SubHtml: "1.0 = identical ID set across all 3 samples; 0.0 = completely disjoint sets. Cities are grouped by the regime from panel 1. <code>route_id</code>/<code>stop_id</code> are &ldquo;usually&rdquo; stable — Brisbane is the one city worth a second look.",
    diagCalS3Title: "3 · Fleet composition by regime",
    diagCalS3Caption: "One bar = 100% of the fleet (25 cities).",
    diagCalS4Title: "4 · Calendar window ≠ trip_id stability",
    diagCalS4Caption: "X: stated calendar window (days, log). Y: mean trip_id Jaccard. A wide calendar window (trusting <code>calendar.txt</code> alone) doesn't guarantee a stable <code>trip_id</code> namespace — see the cities in the bottom-right (wide window, low Jaccard).",
    diagCalAboutHeading: "What this means for the pooling-window plan",
    diagCalAboutTextHtml: "The <code>trip_id</code>-unstable bucket is 9/25 cities (36% of the fleet), not a margin case — worth prioritizing when the era-aware pooling fix described in <code>docs/reviews/family-a_multi-day-static-pairing_plan.md</code> gets built. But GZM, Suwałki and Kielce show a <em>non-monotonic</em> Jaccard pattern (finding #4 in the source report) that a purely date-based era detector could get wrong &mdash; that needs denser sampling (daily snapshots over 2+ weeks) before generalizing the fix to those cities.",
    diagCalSourceNoteHtml: "Source: <code>docs/reviews/family-a_calendar-window-fleet-survey.md</code> in <a href=\"https://github.com/GISBoost/easy-OTP\" target=\"_blank\" rel=\"noopener\">easy-OTP</a>. Companion report: <a href=\"recording-duration.html\">how much GTFS-RT recording is enough?</a>",
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
