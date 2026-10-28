# Daily Engine Maintenance log

A stand-in for the company's Daily Engine Maintenance website while it's down. Same sheets as the
printed log (fuel/lube/water, draft & tow, Main Engines, Gear Boxes, Generator Engines, Hot Ends,
Auxiliary Equipment, comments and issues). You type **Today**; **Prev** and **Total** fill themselves in.

## Using it
Open **https://claude.ai/artifact/XVneZtspBkQY2DRkb9nwiu** on your phone or laptop, signed in to Claude (the link is private to you).
Put it on your home screen: iPhone Safari → Share → **Add to Home Screen**; Android Chrome → ⋮ → **Add to Home screen**.

- **Day**: pick the date (‹ › step a day). On a new day, **Start from [last day]** copies the hours run,
  chief, draft & tow and open issues; change what's different. **Ran __ hrs → Fill hours** puts the same
  hours on every hours line of a sheet (lube-oil-added lines are left for you). Everything saves as you type.
- **Reset** on any line: when a filter is changed, an overhaul is done or an oil sample is taken. The count
  starts again from the number you give (usually 0), and your note prints under Reset Comments.
- **Fuel/Lube/Water**: type Used, or type the Ending balance from soundings and Used works itself out.
  Transferred means transferred off the boat.
- **History**: every saved day; tap one to open it. **Print several days** makes one PDF of a date range.
- **Setup & Backup**: boat name, default chief engineer, rename/add/remove lines and sheets, and
  **Back up** (saves a .json file) / **Restore from file**.

Printing: the page can't open a print dialog itself, so **Save printable PDF** saves the log as a PDF
laid out like the company sheets; open it and print from there.

## Where the data lives
Your Claude account, in a space only you can read: the same log on phone and laptop, and a lost phone
doesn't lose it. The page needs signal to open; if signal drops while it's open, changes are kept on the
device and sent when signal returns (the line under the boat name says which). Back up now and then anyway.

## Own-site version (GitHub Pages)
The same app also runs as its own website: **https://by58wsy98y-droid.github.io/mariner-ops/**
It's published by `.github/workflows/pages.yml` whenever `main` or `fuel-log-app` changes
(Settings → Pages → Source must be **GitHub Actions**).

That version keeps the log on the device (no Claude account), opens with no signal once the line under
the boat name says "Opens with no signal", and has a **Print** button (or use the browser's own Print).
Move a log between devices or versions with Backup → Restore.
On iPhone, add it to the home screen first and use it only from the icon: the icon keeps its own copy of
the log, and Safari can erase a site's data in a tab after a week unused.

## Towboat Knowledge Base
**https://by58wsy98y-droid.github.io/mariner-ops/kb/** (public, like the rest of this repository).
A searchable record of boats, their systems, issues and how they were solved, fuel logs and procedures.
The files in `towboat-kb/` are the source of truth (see `towboat-kb/README.md`); the app reads them, and
its edits are saved back into those same files as commits.

- **Search** across every boat; **boat pages** with open issues first; **issue pages** with
  *Add to timeline*, *Change status* and similar issues; **New issue** and **Add a boat** forms;
  **Fuel**: soundings in inches → gallons from the boat's tank tables, the fuel/lube/water chain and
  truck alerts like the workbook, saved to `fuel/log-YYYY-MM.md` and `.csv`; procedures with Print; documents.
- **Edit and delete:** every page has **Edit** (details as boxes, the text as one big box) and **Delete**;
  boat pages have **Delete this boat**; fuel days, documents too. **Settings → All files** lists everything
  to edit, delete, or add a page to any folder. Deleted files stay in GitHub's history. If a file changed
  on another device while you edited it, both sets of changes are kept (yours win where the same lines changed).
- **Saving to GitHub:** Settings → paste a fine-grained GitHub token (this repository only,
  Contents: Read and write). Edits made with no signal wait on the device and save when there's signal.
  Each save is a commit; the site republishes itself a few minutes later.
- **Tank tables for a new boat:** upload CSVs (`inches,gallons`) to `towboat-kb/boats/<boat>/fuel/tank-tables/`
  as `tank-2.csv`, `tank-3.csv`… (`tank-2p.csv` / `tank-2s.csv` if port and starboard differ).

## For whoever maintains it
- `npm test` runs the tests (`src/calc.test.ts` checks the math against the printed 10/20/2026 log in
  `seed/`; `src/cloudStore.test.ts` covers saving with no signal; `src/pdf.test.ts` the printout).
- `npm run build:claude` makes the claude.ai page, `dist-web/engine-log.html` (an artifact with the `db`, `user`
  and `downloads` capabilities; React and jsPDF load from cdnjs). `npm run build:site` makes the own-site version
  in `dist-site/` (everything bundled, offline helper `sw.js`, saves on the device via `src/localStore.ts`).
- Code: `src/calc.ts` all arithmetic · `src/cloudStore.ts` saving/sync · `src/pdf.ts` printout ·
  `src/DayScreen.tsx`, `src/History.tsx`, `src/Setup.tsx` screens · `src/App.tsx` shell.
- Knowledge base app: `kb/index.html`, `src/kb/` (`fuel.ts` fuel math, `search.ts`, `edits.ts` file edits,
  `sync.ts` saving to GitHub, `screens/`); tests in `src/kb/kb.test.ts`. `scripts/build-site.mjs` packs
  `towboat-kb/` into the site (`kb/kb-data.json` + `kb/files/`) and writes each app's offline helper.
