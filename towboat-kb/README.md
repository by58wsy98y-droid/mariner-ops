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
procedures/               step-by-step jobs that work on any boat (with per-boat notes)
knowledge/                background explanations - the "why", written plain
templates/                blank forms for a new boat, issue or procedure
docs/                     finished deliverables: spreadsheets, forms, guides, photos
app-spec.md               the prompt for building the app on top of these files
```

## Rules for adding to it

- **One issue, one file.** Name it `YYYY-MM-DD-short-slug.md`. Keep the timeline going until
  it's closed. Never delete a dead end — a dead end is a finding.
- **Say which boat.** Every file under `boats/` is about that boat only. Anything that applies
  everywhere goes in `procedures/` or `knowledge/`.
- **Numbers over adjectives.** "25.8 V at the ECM, 26.6 V at the charger" beats "voltage looked a little low."
- **Write down what was ruled out,** not just what was found. The next engineer will try the same things otherwise.
- **If it got reported,** note who, when, and what they said back.

## Current boat

`boats/a-steven-crowley/` — M/V A. Steven Crowley, St. Louis Ship hull, twin EMD 12-710 with EMDEC.
Open issues as of 2026-10-27 are listed in `boats/a-steven-crowley/boat.md`.

## Building the app

Open this folder in Claude Code and paste `app-spec.md`. The files in here are the data;
the app reads them, searches them, and adds to them.
