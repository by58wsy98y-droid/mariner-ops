---
boat: M/V A. Steven Crowley
company: Marquette Transportation Company, LLC
builder: St. Louis Ship
type: Twin-screw river towboat, upper Mississippi
engines: 2 x EMD 12-710 (EMDEC electronic, sender + receiver ECM per engine)
controls: Single-lever electronic controls (STATION ACTIVE / SYNC / LO IDLE panel), CSIM + ERIM, Inland Power Group interface panel
rated_rpm: 900
idle_rpm: 350
dc_system: 24 V (SENS battery charger)
steering: Hydraulic, 2 steering rudders behind the wheels + 4 flanking rudders ahead, 2 steering pumps alternated every turnaround
fuel_capacity_full: ~91,500 gal usual top-off (company 12" rule; ~93,900 gal at the fill marks on the tank tables)
last_updated: 2026-10-27
---

# M/V A. Steven Crowley

## Quick facts
- Fuel: 8 main tanks, 4 per side, numbered **#2, #3, #4, #5** port and starboard, plus day tank(s).
  Engines feed from the **#4s**. Fuel log also tracks lube oil (port/stbd) and potable water.
- Truck loads on the upper Mississippi: **7,500 gal** (1 truck) or **15,000 gal** (2 trucks). Nothing in between.
- Crew-facing docs made for this boat are in `/docs` — daily fuel log workbook, ballast water
  form, rudder room trainee guides, throttle retraining steps.

## Open issues (2026-10-27)
| Issue | Status | File |
|---|---|---|
| Port main throws code bursts and ramps itself up with the lever untouched | OPEN — Inland reader + retraining pending | `issues/2026-10-23-port-main-codes-and-self-ramping.md` |
| Starboard steering rudder not turning the wash — boat swings to port under load | OPEN — needs diver, reported to port engineer | `issues/2026-10-26-starboard-steering-rudder-not-turning.md` |
| Deck winch station: no control power | UNKNOWN — last seen chasing 120 V control circuit | `issues/2026-10-23-deck-winch-no-control-power.md` |
| Battery charger: amber residue on potted choke | UNKNOWN — heat/oil check not confirmed | `issues/2026-10-23-battery-charger-choke-residue.md` |

## Things to know walking aboard
- **The fills are the gravity path on this boat.** Tanks tie together through the fill header,
  not the suction header. See `systems/fuel-system.md` before touching a valve.
- **#4 suctions never close. High suctions on 3s and 4s never close** (centrifuge pickup).
- **Steering pumps get swapped every turnaround** (southbound → northbound and back).
- **The port main has been "weird" for about two years** by the regular chief's account. Any new
  alarm on it goes in the issue file with date, time, rpm, load, and what else was running.
- The Inland panel in the engine room is the diagnostic port for the EMDEC reader (round
  connector marked DIAGNOSTIC CONNECTOR). The ECMs keep inactive codes with counts — **don't
  clear them before the tech reads them.**
- Company ballast water report form is digitized in `/docs` (rev June 30, 2020).

## People / contacts (fill in)
- Captain:
- Regular chief:
- Port engineer:
- Inland Power Group service:
- Safety dept (ballast reports): riversafety@marquettetrans.com
