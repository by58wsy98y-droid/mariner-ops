---
title: Chasing random ECM codes — electrical checks in order
applies_to: EMDEC / DDEC-family electronic engines
---

# Random multi-code bursts on an electronic engine

The pattern that says "electrical, not a sensor": several unrelated circuit codes landing at the same
instant, clearing themselves, triggered by load steps, gear shifts, vibration or heat. A bad sensor
throws the **same** code every time.

## Checks, cheapest first
1. **Panel volts vs battery posts**, engine running. More than ~0.5 V apart = drop in the ECM power
   or ground path (terminal, ground strap, breaker/relay, in-line fuse holder).
2. **Voltage-drop the ground**: meter battery negative post → engine block / ECM ground stud, running,
   while somebody shifts. <0.2 V and no jump when the clutch solenoids fire. Same on the positive side.
3. **AC ripple** across the battery, running. >~0.5 V AC = failed alternator diode or noisy charger.
4. **Wiggle test** at idle with someone watching the panel: ECM connectors, harness where it crosses
   the engine and near the gear, sensor plugs, data-link plug, battery cables. Pull a couple and look
   for green or moisture.
5. **Note what kicks on** when a burst hits (compressor, steering pump, bilge pump, charger cycling).
6. **Grounds, every one of them.** Fork terminals on a stud are a known failure — a fork that's
   touching but not clamped gives you years of ghosts. Cut forks off, crimp marine heat-shrink **ring**
   terminals sized for the stud, clean to bright metal, star washer, verify millivolts to battery neg.
7. **Min/max meter** on the ECM feed as close to the connector as you can get. Let it sit an hour.
8. **Data link**: power off, resistance across CAN high/low at the panel plug ≈ 60 Ω (120 = missing
   terminator, much lower = short).
9. **Interface/distribution box** connectors (where sender, receiver and the interface module share
   power): pins, locking tabs, moisture, flex at the plug.
10. **Reader session with history intact** — inactive codes with counts and snapshot voltage. Don't
    reset the ECM before the tech reads it.

## Interpreting a self-ramping engine (electronic throttle)
- Lever never moves, engine settles on its own → transient on the command path, not a latched command.
- Only in gear → neutral clamp is hiding the fault; it's downstream of wherever that clamp lives.
- Also in neutral → fault is on the wire the ECM actually reads (interface → ECM run, ECM input, ECM power/ground).
- Ask what the ECM's **throttle-fault response** is programmed to (idle / hold last / default speed).
  A dropout driving to a default speed explains ramps without the signal ever reading high.
- After any control-module swap: **retrain the throttles** (see throttle-retraining procedure).
- Never unplug the throttle input on a running engine to "see what happens" — some ECMs read open as full throttle.

## Operating rules while it's open
Uncommanded throttle increase = no tow work on that engine clutched in. Transit only with the pilot
briefed and the engine ready to be clutched out/killed. Engine-protection alarm = shut down now.
