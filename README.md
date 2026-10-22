# Daily Engine Maintenance log

A stand-in for the company's Daily Engine Maintenance website while it's down. Same sheets as the
printed log (fuel/lube/water, draft & tow, Main Engines, Gear Boxes, Generator Engines, Hot Ends,
Auxiliary Equipment, comments and issues). You type **Today**; **Prev** and **Total** fill themselves in.

## Using it
Open the web app link (it's in the chat where it was made) on your phone or laptop, signed in to Claude.
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

## For whoever maintains it
- `npm test` runs the tests (`src/calc.test.ts` checks the math against the printed 10/20/2026 log in
  `seed/`; `src/cloudStore.test.ts` covers saving with no signal; `src/pdf.test.ts` the printout).
- `npm run build` makes the page, `dist-web/engine-log.html`, which is published as a claude.ai artifact
  (with the `db`, `user` and `downloads` capabilities). React and jsPDF load from cdnjs.
- Code: `src/calc.ts` all arithmetic · `src/cloudStore.ts` saving/sync · `src/pdf.ts` printout ·
  `src/DayScreen.tsx`, `src/History.tsx`, `src/Setup.tsx` screens · `src/App.tsx` shell.
