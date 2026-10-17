# Towboat Daily Fuel Log

Phone-first daily fuel / lube oil / water log for a towboat. Replaces the
`master_empty_copy_copy.xlsx` workbook.

## Web app (the easy way)
Open **https://claude.ai/artifact/XPaBN3wnqsaH7BVtnScT3p** on your phone or laptop, signed in to Claude.
Nothing to install. The link is private to you.

- Your log is saved to your Claude account, in a space only you can read, so the same log shows on
  your phone and your laptop and survives a lost phone.
- The page needs signal to open. If the signal drops while it's open, your saves are kept on the phone
  and go out by themselves when signal returns (the line under the boat name says so).
- Unsaved typing on the Entry screen is kept too, so leaving the page mid-entry doesn't lose it.
- **Fuel / Settings → Back up** saves a spare copy as a file; **Restore from file…** loads one.

Updating the web app after a code change: `npm run build:web`, then publish `dist-web/fuel-log.html`
to the same link (Claude does this for you).

## Phone app version (works with no signal at all)
The same app can also be put on free static hosting as an installable app that keeps everything on
the phone and opens with no signal. Steps below.

## Run it on a computer
1. Install Node.js (LTS) from nodejs.org.
2. In this folder: `npm install` (first time only), then `npm run dev`.
3. Open the address it prints (e.g. http://localhost:5173). Phones on the same Wi-Fi can use the "Network" address.

- `npm test` runs the tests (`src/calc.test.ts`, `src/cloudStore.test.ts`).
- `npm run build` makes the phone app in `dist/` (that folder is what gets hosted).
- `npm run build:web` makes the web app page, `dist-web/fuel-log.html`.

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
- `src/storage.ts` – data shape, backup files, unsaved drafts, and the `Store` interface.
- `src/localStore.ts` – phone app: saves in the browser on the device.
- `src/cloudStore.ts` – web app: saves to your Claude account, holds changes on the device until they're sent.
- `src/Today.tsx`, `src/Log.tsx`, `src/SettingsPage.tsx` – the three screens. `src/Confirm.tsx` – yes/no dialog.
- `src/main.tsx` / `src/web-main.tsx` – start the phone app / the web app.
- `public/sw.js` – offline support for the phone app.

Readings are stored per tank with the sounding as typed (inches are computed by
`parseSounding`), so tank tables / sounding→gallons can be added later in `calc.ts`.
