# Towboat Engineer's Knowledge Base

A per-boat database of systems, issues, resolutions, fuel logs and procedures, kept as plain
files so it works with or without the app. Everything in here came out of real work on the
boat; nothing is generic unless it says so.

## How it's organized

```
boats/<boat-name>/
  boat.md                 who she is: builder, engines, controls, tanks, quirks
  systems/                how each system is plumbed/wired ON THIS BOAT
  fuel/                   tank tables (CSV), fueling procedure, monthly log notes
  issues/                 one file per problem, dated, with a status and a timeline
procedures/               step-by-step procedures and maintenance cards, in folders:
  general/                  equipment every boat has
  cat/3612/, emd/710/16cyl/… one folder per main engine (CAT by model, EMD by series and cylinders)
  generators/<model>/       one folder per generator model (e.g. generators/cat-3306/)
templates/                blank forms for a new boat, issue or procedure
docs/                     finished deliverables: spreadsheets, forms, guides, photos
app-spec.md               the prompt for building the app on top of these files
```

## Rules for adding to it

- **One issue, one file.** Name it `YYYY-MM-DD-short-slug.md`. Keep the timeline going until
  it's closed. Never delete a dead end — a dead end is a finding.
- **Say which boat.** Every file under `boats/` is about that boat only. Anything that applies
  everywhere goes in `procedures/`.
- **Numbers over adjectives.** "25.8 V at the ECM, 26.6 V at the charger" beats "voltage looked a little low."
- **Write down what was ruled out,** not just what was found. The next engineer will try the same things otherwise.
- **If it got reported,** note who, when, and what they said back.

## The fleet

One folder per boat under `boats/`, each with its spec sheet in `boat.md`.

## Building the app

Open this folder in Claude Code and paste `app-spec.md`. The files in here are the data;
the app reads them, searches them, and adds to them.
