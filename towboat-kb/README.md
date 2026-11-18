# Marquette Engineering Knowledge Base — the files

Everything the app shows is in this folder, as plain text files (and pictures), so it works with or without
the app and every change is kept in GitHub's history.

## How it's organized

```
boats/<boat>/
  boat.md                 the boat's spec sheet (fields at the top) and notes
  systems/                how a system is plumbed or wired on this boat
  fuel/                   tank tables (CSV), fueling procedure, monthly fuel log
  issues/                 its troubleshooting log: one file per problem, dated, with a status and a timeline
procedures/               maintenance procedure and technical reference cards, in folders:
  general/                  equipment every boat has
  cat/<model>/, cummins/<model>/, emd/<645|710>/<12cyl|16cyl|20cyl>/   by main engine
  gearboxes/<maker>/        by reduction gear (conventional boats)
  generators/<make>/<model>/
templates/                blank forms for a new boat or troubleshooting entry
docs/                     finished documents to open or print (listed on the Docs tab)
```

## Rules for adding to it

- **Say which boat.** Every file under `boats/` is about that boat only. Anything that applies to every boat
  with the same equipment goes in `procedures/`.
- **Cards word for word.** A company card is copied exactly as printed; its code, frequency, revision date
  and what it applies to go in the fields at the top. See `procedures/README.md`.
- **One problem, one troubleshooting file.** Name it `YYYY-MM-DD-short-slug.md`. Keep the timeline going until
  it's closed. Write down what was ruled out, not just what was found.
- **Numbers over adjectives.** "25.8 V at the ECM, 26.6 V at the charger" beats "voltage looked a little low."
