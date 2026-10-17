# Towboat Daily Fuel Log

Phone-first, offline daily fuel / lube oil / water log for a towboat. Replaces the
`master_empty_copy_copy.xlsx` workbook. All data stays on the device (browser storage);
use **Fuel / Settings → Back up** to save a copy.

## Run it on a computer
1. Install Node.js (LTS) from nodejs.org.
2. In this folder: `npm install` (first time only), then `npm run dev`.
3. Open the address it prints (e.g. http://localhost:5173). Phones on the same Wi-Fi can use the "Network" address.

- `npm test` runs the math tests (`src/calc.test.ts`).
- `npm run build` makes the finished app in `dist/` (that folder is what gets hosted).

## Put it on your phone (free hosting)
**Netlify Drop (easiest):** run `npm run build`, go to https://app.netlify.com/drop and drag the
`dist` folder onto the page. It gives you an https link. Open that link on your phone.

**GitHub Pages:** in the repo on GitHub go to Settings → Pages → Source: "GitHub Actions".
Every push to `main` then publishes the app (`.github/workflows/pages.yml`).
(Pages on a private repo needs a paid GitHub plan; Netlify Drop doesn't.)

## Add to home screen
- iPhone (Safari): Share button → "Add to Home Screen".
- Android (Chrome): ⋮ menu → "Install app" / "Add to Home screen".
Open it once with signal; after that it works with no signal.

## Code layout
- `src/calc.ts` – all the math (tank totals, fuel/lube/water chain, truck alerts, sounding parsing). Tested in `src/calc.test.ts`.
- `src/storage.ts` – save/load on the device, backup/restore file.
- `src/Today.tsx`, `src/Log.tsx`, `src/SettingsPage.tsx` – the three screens.
- `public/sw.js` – offline support.

Readings are stored per tank with the sounding as typed (inches are computed by
`parseSounding`), so tank tables / sounding→gallons can be added later in `calc.ts`.
