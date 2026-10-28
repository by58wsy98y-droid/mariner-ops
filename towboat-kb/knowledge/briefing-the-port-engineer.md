---
title: Briefing the port engineer (and an experienced chief)
---

# How to brief it so the right tech gets sent

**Lead with the thing that gets someone dispatched**, not the thing that's loudest. "Panel's
throwing codes" gets a shrug. "It throttles itself up with the lever at idle" gets a truck.

Order: headline → timeline → what the panel/meter actually showed (numbers) → history → your read
(don't oversell) → what you've done → asks → what you need from him on operations.

## Example — port main, 2026-10-23 (phone)
> Port main's been throwing bursts of ECM codes since last night, and the bigger issue is it's been
> ramping itself from idle up to 900 with the lever untouched. Only does it in gear. We're tied off
> at [location] waiting on traffic, [X] miles from tow work. Captain's aware and we're not doing tow
> work on it clutched in until it's sorted.
>
> Timeline: last night underway, alarms every 4–5 min, worst shifting. Shut down, reset, cycled gears, clean.
> Four hours later at the bank, back. This morning several bursts in neutral, nobody touching anything.
>
> Codes: baro sensor high; throttle response short and low; code 71 injector 16 response short — on a
> 12-cylinder, so that number's suspect; unknown 21/128, 76/60, 34/0, 132/135, 11/128; unknown 00 most often.
> 181°F, 42 psi, trans 96°F / 308 psi, 25.8–26.2 V. Starboard clean.
>
> History: regular chief says two years of ghost alarms, ERIM changed for it. He's seen the videos, says this is different.
>
> Read: throttle-input and injector-driver codes in the same instant at steady idle in neutral says
> ECM electrical — power, ground, sensor return, or the ERIM-to-ECM run — not individual sensors.
> Nothing cleared since the first reset.
>
> Asks: Inland with the reader soonest — stored codes with counts and snapshot voltage, decode the
> unknowns, confirm 12-cyl programming, throttle-fault response setting. A data-link log over hours in gear.
> OK to swap CSIMs as a test? What do you want on running it and tow work?

**Two-line text version:** "Port main is intermittently ramping itself to 900 in gear with the lever
at idle, and throwing throttle and injector codes in neutral at the bank. Engine's healthy,
starboard's clean, codes preserved, need Inland with the reader and a plan for tow work."

## Example — steering, 2026-10-26 (written)
> Starboard steering rudder's not turning the wash — tiller moves, rudder doesn't. Boat swings port,
> hard to bring to starboard with 15 loads. Tiller-to-stop even both sides at zero, hydraulics
> normal. Captain's aware we're on one steering rudder. Need a diver. Flagging that this may be a
> USCG-reportable loss of maneuverability — your call, you need it today.

## Example — to an experienced chief (short, asking for his read)
> Port main (EMD 710 / EMDEC, CSIM-ERIM): ramps itself 350 → 900 lever untouched, in gear only,
> settles on its own; code burst follows each ramp (throttle response low/short, injector 16 response
> short on a 12-cyl, baro high, unknowns). Throttle codes also log in neutral at the bank. Two years
> of ghosts, ERIM changed once before. Friday found both CSIM grounds as splayed forks not under the
> nut — fixed, swapped the ERIM, three clean days. Monday, 15 loads at full load, ramped again, codes
> followed. Charger 26.6 V, panel 25.8–26.2 at the ECM. Starboard clean. My read: still power/ground
> on the engine-room end that heat and load bring back; want the ECM's throttle-fault response
> setting. What would you go after next?
