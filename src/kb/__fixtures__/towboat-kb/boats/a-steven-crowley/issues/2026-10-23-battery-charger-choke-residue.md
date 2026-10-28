---
boat: M/V A. Steven Crowley
system: DC power — SENS battery charger (24 V)
title: Amber, blistered film on the potted choke inside the charger
opened: 2026-10-23
status: UNKNOWN — heat/oil/ripple checks not confirmed
severity: low on its own; matters because the port main's ECM problems smell like DC-bus noise
tags: [charger, SENS, ripple, choke, battery, DC bus]
related: 2026-10-23-port-main-codes-and-self-ramping.md
---

# Battery charger — residue on the potted choke

## Observation
Top-left potted block (labeled SENS POTTED, likely the DC filter choke) has an amber, wet-looking,
blistered/dimpled film over its lamination face, thicker toward the bottom. Main transformer below
it is dry and dusty. Charger displayed **26.6 V, 4.5 A**; BATTERY and BATT CHCK lights dark (no
battery test run). Pipes run over the cabinet, perforated top panel.

## Two explanations
- **Heat** — cooked varnish/potting. At 4.5 A the choke should be barely warm; hot means internal
  trouble (failing filter cap or SCR pushing ripple through it). A charger putting ripple on the 24 V
  bus is exactly what upsets a DDEC-family ECM.
- **Weeping / drip** — silicone potting bleeding oil, or a drip from above. Mostly cosmetic.

## Checks (5 minutes)
1. IR gun / back of hand near it, charger running, compared to the dry transformer.
2. Smell at the louvers for cooked varnish.
3. Both breakers off, wait 5 min, fingertip: oily = oil; tacky = softened resin; hard bubbles = old event.
4. Look above the cabinet for a drip source.
5. **AC volts across the battery posts**, charger DC output ON then OFF for a minute. >~0.5 V AC with
   the charger on, dropping when off = noise source found.
6. Press **BATT CHCK** (tied up, neutral) — a battery with a bad cell can't absorb transients.
7. Charger LCD → Alarms / Data log: low-volts, high-ripple, AC-fail events at the times of the ECM bursts.

Also: panel reads 25.8–26.2 V at the ECM vs 26.6 at the charger — meter battery posts and ECM
connector back to back to find where it's lost.

## Results
[ fill in ]
