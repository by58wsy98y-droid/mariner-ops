# Build: Towboat Engineer's Knowledge Base app

## What this is
A personal app for a towboat engineer who moves between boats. It's a searchable database of
boats, their systems, the problems each one has had and how they were solved, plus fuel logs and
procedures. The data already exists as the markdown/CSV files in this repo (read `README.md` for
the layout and `boats/a-steven-crowley/` for a fully worked example). **The files are the source
of truth** — the app reads them, searches them, and writes new entries back as files in the same
format, so the repo stays useful with no app at all.

I'm a marine engineer, not a developer. Keep the stack simple, explain how to run and deploy it in
plain words, and ask before adding anything not listed here.

## Screens

1. **Home / search.** One search box across everything: boats, systems, issues, procedures,
   knowledge. Typing "ramping" or "fork terminal" or "gravitate" finds the issue files, procedures
   and boat notes that mention it, grouped by type, with the boat name on each hit. Full-text, with
   tag filters. This is the main reason the app exists: "have I seen this before, on any boat?"

2. **Boat page.** Profile from `boat.md` frontmatter, the "things to know walking aboard" list,
   open issues (status != RESOLVED) at the top, then systems, fuel, and all issues (newest first).

3. **Issue page.** Renders the markdown. An **Add to timeline** button appends a dated row (date/time,
   what happened) and a **Change status** control; both edit the file. A **New issue** form creates a
   file from `templates/issue.md` with the frontmatter filled in. "Similar issues" sidebar: other
   issues sharing tags or system, across all boats.

4. **Fuel.** Per boat: the tank tables (from `fuel/tank-tables/*.csv`) and a daily entry form that
   takes **inches** for each tank and looks up gallons (interpolate half inches), totals port/stbd,
   computes previous → received → total → on hand → used for fuel, lube oil and water, exactly like
   the workbook in `docs/Steven_Crowley_Fuel_Log.xlsx` (read its Daily Log formulas). Alert when a
   truck load fits: on hand ≤ capacity − 7,500 → "room for 1 truck"; ≤ capacity − 15,000 → "room for 2".
   Capacity and truck size are per-boat settings. Entries save to `fuel/log-YYYY-MM.md` (table rows)
   and a CSV alongside it. Fueling procedure page from `fuel/fueling-procedure.md`.

5. **Procedures & knowledge.** Rendered markdown with search. Print view (black-and-white printer).

6. **Documents.** Lists `docs/` with download links.

## Technical requirements
- Phone-first (entries get made in the engine room on a phone), fine on a laptop.
- **Works offline.** Installable PWA. Cell coverage on the river is spotty.
- Data model is the repo: parse frontmatter + markdown, CSV tank tables. Static site generator or
  a small Node app — whichever is simpler to host for free (GitHub Pages is fine for read-only;
  explain the simplest way to also get writes back into the repo — e.g., edits commit via the
  GitHub API with a personal token, or a local-first store that exports files I commit myself).
- No login beyond whatever GitHub needs. Single user.
- Vite + React + TypeScript or plain HTML/JS. Keep the fuel math in one tested module.
- Tests for: tank-table lookup/interpolation, fuel/lube/water chain, truck alerts, search returns
  cross-boat hits, issue file round-trips (parse → edit → write) without mangling the markdown.

## Not now
Photos upload (link to files for now), multi-user, cloud sync beyond the repo, charts.
Structure it so these can be added.

## When done
Run the tests, start it, and tell me: how to put it on my phone, how to add a boat, how to add an
issue from the engine room, and how my edits get back into GitHub.
