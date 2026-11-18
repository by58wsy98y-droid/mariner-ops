# Marquette Engineering Knowledge Base

**https://by58wsy98y-droid.github.io/mariner-ops/kb/**

The engineering department's knowledge base for Marquette Transportation Company's River Division fleet:
each boat's spec sheet, the company's maintenance procedure and technical reference cards filed by the
equipment they're for, each boat's troubleshooting log and fuel log, and search across all of it. It works on
a phone with no signal once opened (add it to the home screen: iPhone Safari → Share → Add to Home Screen;
Android Chrome → ⋮ → Add to Home screen) and prints the cards like the paper originals.

The site is public, like this repository.

## Using it
- **Fleet** (opens first): every boat. A boat's page has its spec sheet, the procedures for its equipment, its
  troubleshooting log and its fuel log. Z drive boats are labelled.
- **Library → Procedures**: General equipment (every boat), then by main engine (CAT, Cummins, EMD → 645/710 →
  12/16/20 cyl), Gearboxes and Generators. A card in a folder shows on every boat with that equipment; one in a
  higher folder (e.g. EMD → 710) shows on every boat below it. **Follow tick by tick** works through a card one
  step at a time on the phone; **Done** at the bottom finishes it; **Print** gives the paper layout.
- **Search**: across every boat and card. A boat's troubleshooting entries show only on its own page and in search.
- **Fuel log** (from a boat's page): soundings in inches → gallons from the boat's tank tables, the
  fuel/lube/water chain and truck alerts, saved to `fuel/log-YYYY-MM.md` and `.csv`.
- **Docs**: finished documents to open or print.
- **Saving to GitHub** (Settings): with a fine-grained GitHub token (this repository only, Contents: Read and
  write) new fuel days and troubleshooting entries save back into the files as commits; with no signal they
  wait on the device. Editing and deleting are switched off for now (`EDITING` in `src/kb/features.ts`).

## Where things are
| | |
|---|---|
| `towboat-kb/` | **The content**: boats, procedure cards and their pictures, documents, templates (see `towboat-kb/README.md`) |
| `src/kb/` | The app: `screens/` (one file per screen), `fleet.ts` (spec sheets, procedure folders), `search.ts`, `fuel.ts`, `markdown.ts`, `sync.ts` (saving to GitHub), `kb.css` (the Marquette look) |
| `kb/index.html`, `public-site/` | The app's page, icons and logo; `public-site/index.html` forwards the site's top address to `kb/` |
| `scripts/build-site.mjs` | Packs `towboat-kb/` into the site and writes the offline helper |
| `.github/workflows/pages.yml` | Tests, builds and publishes the site every time `fuel-log-app` changes |

## For whoever maintains it
- `npm install`, then `npm test` (the tests use a frozen copy of the files in `src/kb/__fixtures__/`, so
  editing the real ones never fails a publish) and `npm run build` (the site in `dist-site/`).
- GitHub → Settings → Pages → Source should be **GitHub Actions**; until then GitHub also publishes the raw
  branch on each push, and the workflow waits for it so the built site lands last.
