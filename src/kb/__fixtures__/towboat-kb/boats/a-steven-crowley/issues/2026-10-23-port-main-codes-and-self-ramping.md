---
boat: M/V A. Steven Crowley
system: port main engine / EMDEC controls
title: Port main throws bursts of codes and ramps itself up with the lever untouched
opened: 2026-10-22
status: OPEN
severity: high (uncommanded throttle increase — no tow work on it clutched in until understood)
tags: [EMDEC, EMD 710, ERIM, CSIM, ground, throttle, Inland panel, codes, ramping]
reported_to: port engineer (2026-10-23, 2026-10-26); experienced chief (2026-10-26)
related: 2026-10-23-battery-charger-choke-residue.md
---

# Port main — code bursts and self-ramping

## Symptoms
- Inland panel alarms in bursts ("MULTIPLE ALARM CODE"), different codes each time, clearing
  themselves within seconds. Worst when shifting gears; also on a 4–5 minute cycle underway.
- Engine ramps itself from 350 toward 900 (sometimes partway) with the lever untouched, **in gear
  only**, settles back on its own. Captain feels it; the physical lever never moves.
- Throttle codes also log **in neutral, tied to the bank, nobody touching anything** — the neutral
  clamp just keeps the rpm from following.
- Engine parameters normal throughout: 350 rpm, 181°F coolant, 42 psi oil, trans 96°F / 308–310 psi,
  25.8–26.2 V. Starboard engine clean.

## Codes logged
Unknown diagnostic (00 most common; 21/128, 11/128, 34/0, 76/60, 132/135) · barometric pressure
sensor high · turbo boost sensor low · throttle response time short · throttle response time low ·
code 71 injector 16 response time short (12-cyl engine).

## History before this
Boat has had "ghost alarms" for ~2 years per the regular chief; ERIM was changed once for it with
no improvement. Chief looked at this week's videos and said this is different from what he'd seen.

## Timeline
| Date | What happened |
|---|---|
| 10/22 night | Underway: panel alarming every 4–5 min, worse shifting gears. Shut down, reset ECM, cycled gears — clean. |
| 10/23 ~01:00 | Tied up waiting on traffic; alarms returned ~20 min after going to neutral. |
| 10/23 05:00 | ERIM had just been replaced. Port engineer briefed. Captain told: no tow work on the port clutched in. |
| 10/23 06:49 | In neutral, not moving: throttle response short, throttle response low, injector 16 response short. |
| 10/23 07:31 | More: baro high, unknown 21/128, 00, 76/60, 34/0, 132/135, 11/128. |
| 10/23 14:30 | Battery charger inspected — amber blistered film on potted choke (separate issue file). Charger 26.6 V / 4.5 A. |
| 10/23 16:45 | **Found both CSIM ground wires as fork terminals NOT under the nut, prongs splayed, barely touching the stud.** Re-terminated [confirm: ring terminals, stud cleaned, verified mV to battery neg]. |
| 10/24–10/25 | Zero alarms, zero ramps. Longest clean stretch on record. |
| 10/26 ~18:00 | 15 loads, full load for hours. Captain called down: **engine ramped**; codes started right after. |
| 10/27 | Discussing throttle retraining (manual 9.3.3/9.4). Step sheet written. Not yet performed. |

## What's been ruled out / learned
- Not a single bad sensor — multiple unrelated circuit codes land in the same instant.
- Not the governor/speed sensing alone — never ramps in neutral (neutral clamp holds it).
- A throttle-input fault and an injector-driver fault landing together at steady idle = something
  upsetting the ECM's whole electrical environment (power, ground, sensor return), not one wire.
- Ground workmanship on this boat is a proven failure mode (CSIM forks). The same hands likely did
  other grounds the same way.
- Three clean days after the ground fix, then a return under full load/heat/vibration = still a
  marginal connection or a thermal intermittent, not a solved problem.

## Open leads, in order
1. **Throttle retraining** (9.3.3) — never done after the ERIM swap. Cheap, an hour at the dock.
2. **Inland reader session with history intact:** pull stored codes with counts and snapshot
   voltage; decode the unknown pairs; confirm receiver ECM programmed for 12 cylinders; **read out
   the throttle-fault response setting**; ask for a data-link log over hours in gear.
3. **Chase the half-volt drop** charger (26.6) → ECM (25.8–26.2): battery posts vs ECM connector,
   voltage-drop the ground path while shifting, AC ripple across the battery.
4. **Go over every other ground** the way the CSIM's was found: ECM power/ground bus studs, ERIM
   ground, panel ground, Inland interface panel connector pins (corrosion, backed-out pins, flex at the plug).
5. Min/max meter on the ECM feed for an hour; charger alarm log at the times of the bursts.
6. If codes track engine-room temperature: sender ECM thermal intermittent → swap with starboard's (Inland, programming moves with it).
7. CSIM port/stbd swap as a test if the above comes up empty (config must move with the position, not the box).

## Operating restriction while open
No tow work with the port clutched in. Transit only with the pilot briefed, ready to clutch out and
kill it, somebody at the local stop. Engine-protection alarm = shut down now. Codes stacking,
stumble, "timing" codes = tell the pilot, let him pick the moment.

## Briefing scripts used
See `/knowledge/briefing-the-port-engineer.md`.
