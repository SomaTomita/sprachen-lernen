# Sprachen lernen — Sammlung von Sprachlern-Apps

Eine Sammlung von Offline-Lern-Apps für Deutsch (Goethe A1/A2), Niederländisch (A1) und Französisch (A1) in einem einzigen Ordner. Kein Build, kein Framework, reines HTML/CSS/JS. Eine **Startseite (Launcher)** verlinkt zu allen Modulen.

## Starten

Im Hauptverzeichnis:

```
./serve.sh 8000      # Port optional, Standard 8000
```

Das Terminal zeigt Links zu allen Modulen an. Über die **Startseite** im Browser erreicht man alle Module:

```
  Startseite          →  http://localhost:8000/
  ├ Grundlagen        →  http://localhost:8000/#/exam-guide      (Prüfungsüberblick, Aufgabentypen)
  ├ Grammatik         →  http://localhost:8000/#/grammar         (Grammatik-Erklärungen 01–07)
  ├ Sprechen          →  http://localhost:8000/#/speaking        (Material, App in Arbeit)
  ├ Aussprache        →  http://localhost:8000/apps/pronunciation/
  ├ Wortschatz (DE)   →  http://localhost:8000/apps/vocabulary/
  ├ Wortschatz (NL)   →  http://localhost:8000/apps/vocabulary-nl/
  ├ Wortschatz (FR)   →  http://localhost:8000/apps/vocabulary-fr/
  └ Grammatikübungen  →  http://localhost:8000/apps/grammar-exercises/
```

`serve.sh` startet `python3 -m http.server` für den gesamten Ordner — ein Server für alle Module.

> `index.html` direkt per `file://` zu öffnen funktioniert nicht (ES Modules / fetch benötigen einen Server).
> `python3 -m http.server 8000` funktioniert auch direkt, zeigt dann aber keine Links im Terminal an.

## Module

| Modul | Typ | Ort | Sprache/Niveau | Inhalt |
|---|---|---|---|---|
| **Grundlagen** | Material | `content/exam-guide/` | Deutsch (Goethe A1/A2) | Prüfungsüberblick, Aufgabentypen, offizielle Übungsprüfungen mit Lösungen. |
| **Grammatik** | Material | `content/grammar/` | Deutsch | Grammatik von Grund auf: Personalpronomen, Verbkonjugation, Genus, Plural, Kasus, Artikel. |
| **Sprechen** | Material (in Arbeit) | `apps/speaking/` | Deutsch (A2) | Redemittel und Sprechtraining für den mündlichen Teil (Sprechen). Eigenständige App in Planung. |
| **Aussprache** | App | `apps/pronunciation/` | Deutsch | Annas Selbstvorstellung — Satz- und Wortebene mit Audio und Ausspracheschwerpunkten. |
| **Wortschatz (DE)** | App | `apps/vocabulary/` | Deutsch (A1/A2) | Karteikarten (Leitner-System) mit muttersprachlichem Audio und Fortschrittsverfolgung. |
| **Wortschatz (NL)** | App | `apps/vocabulary-nl/` | Niederländisch (A1) | Karteikarten, Audio, Beispielsätze nach dem Spiralprinzip, Fortschrittsverfolgung. |
| **Wortschatz (FR)** | App | `apps/vocabulary-fr/` | Französisch (A1) | Karteikarten, Audio, Beispielsätze nach dem Spiralprinzip, Fortschrittsverfolgung. |
| **Grammatikübungen** | App | `apps/grammar-exercises/` | Deutsch | Übungen zu den Grammatik-Lektionen 01–07 mit sofortiger Auswertung. |

- **Material** (`content/`) sind reine Markdown-Dateien, die der eingebaute **Reader** der Startseite unter `#/…` anzeigt (kein Seitenwechsel, mit Inhaltsverzeichnis).
- **Apps** (`apps/`) sind jeweils eigenständige HTML/CSS/JS-Anwendungen, die von der Startseite aus als eigene Seite geöffnet werden. Details stehen in der jeweiligen `README.md`.
- **Sprechen** ist aktuell nur Material (Reader-Ansicht), soll aber zu einer eigenen App werden — deshalb schon unter `apps/` abgelegt, mit „in Arbeit“-Badge auf der Startseite.

## Struktur

```
index.html              Startseite (Launcher) + Shell des Dokumenten-Readers
css/styles.css          BMW-Design-Tokens + Layout von Startseite/Reader
js/                      content (Modul-Definitionen), router, home, reader, markdown (eigener Renderer), main
tests/markdown.test.js   Unit-Tests für den Markdown-Renderer (node --test)
docs/design/             Design-Vorgabe (gilt für alle Apps)
content/                 Material, das der Reader der Startseite anzeigt (nur Markdown, kein Seitenwechsel)
  exam-guide/            Prüfungsunterlagen A1/A2 (Deutsch)
  grammar/               Grammatik-Lektionen 01–07 (Deutsch)
apps/                    Eigenständige Apps, von der Startseite aus verlinkt
  pronunciation/         Aussprache-App (Deutsch)
  vocabulary/            Wortschatz-App (Deutsch, A1/A2)
  vocabulary-nl/         Wortschatz-App (Niederländisch, A1)
  vocabulary-fr/         Wortschatz-App (Französisch, A1)
  grammar-exercises/     Grammatikübungen (Deutsch)
  speaking/              Sprechen-Material, App in Planung
serve.sh                 Wrapper, der alle Module zusammen ausliefert
CLAUDE.md                Kurzleitfaden für die Arbeit in diesem Repository
```

## Design

Alle Module folgen einheitlich dem BMW-corporate-automotive-Designkit. Referenz: **[`docs/design/bmw-corporate-automotive.md`](docs/design/bmw-corporate-automotive.md)** (weißer Canvas / BMW-Blau `#1c69d4` / rechteckige Formen ohne Rundung / Inter 700 & 300 / keine Drop-Shadows). Jede App teilt sich diese Tokens über ihr eigenes `css/styles.css`.

## Tests

```
node --test tests/*.test.js   # Markdown-Renderer der Startseite (Repo-Wurzel)
```

Die Tests der einzelnen Apps laufen jeweils mit `node --test` im entsprechenden App-Ordner.
