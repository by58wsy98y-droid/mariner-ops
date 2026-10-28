---
boat: M/V A. Steven Crowley
system: deck machinery — electric winch (480 V 3-phase motor, 120 V control, reversing starter)
title: Winch IN button dead; then found no control power at the station at all
opened: 2026-10-23
status: UNKNOWN — last step was isolating the 120 V control circuit inside the starter
severity: medium (needed the winch to tighten up that night)
tags: [winch, starter, contactor, overload, control transformer, push button station]
---

# Deck winch — no control power

## What was tried, in order
1. IN button appeared dead. Plan: move the IN go-wire to the OUT contact block as a temporary fix
   (tagged "OUT BUTTON RUNS IN — TEMP"). By color: **red = IN go-wire, black = OUT go-wire, white = common.**
2. Didn't work. Meter at the station: **0 V across the wires** → station is dead, button wasn't the problem.
3. At the starter: **480 V on the line side** (top). Bottom terminals T1–T3 read 0 — **normal**, those are
   motor leads and only go live when a contactor pulls in.
4. Control circuit is 120 V (coils marked 120V 60HZ, red wires). Not yet found where the 120 V comes from.

## Where it stood
Find the 120 V control source: a control transformer with a fuse (door, side wall, or adjacent box) or
a separate feed from a lighting panel breaker. Meter across it. Zero = fuse/breaker. 120 V = meter
across the overload contact (small screws on the SIDES of the heater block, red wires up to the coils):
120 V across it = open (tripped/not reset, or failed — melting-alloy type needs 2–3 min to cool before
reset catches); 0 V = passing, break is in the red wire to the terminal strip or the strip itself.
Then coil check with somebody holding the button.

## Lessons
- Meter **across the wires**, not wire-to-box — a cast box on a boat may not be grounded and plenty
  of towboat 120 V systems are ungrounded.
- Read the station with a meter before moving wires. Dead station ≠ dead button.
- Jumpering the overload restores control but removes all motor protection — only for the job,
  someone at the breaker, pulled the minute it's done.
- Order two contact blocks when one goes; the other is a month behind it.

## Resolution
[ unknown — fill in ]
