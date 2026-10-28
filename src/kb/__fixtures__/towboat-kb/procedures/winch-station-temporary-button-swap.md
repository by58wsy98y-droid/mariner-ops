---
title: Winch push-button station — temporary swap when one direction's button dies
applies_to: two-button (IN/OUT) momentary stations on reversing starters
---

# Running a winch on the other button (temporary)

**First prove the button is the problem.** Meter across the two terminals of the dead button's
contact block, control power on: ~120 V with nothing pressed, near zero while pressed = block is
good, look at the starter. Stays 120 V pressed = block is bad. **Zero across everything = the
station is dead** — chase control power, not the button (see the winch issue file on the Crowley).

## Identify the wires with a meter, not by color
- **Common**: reads 120 V to the other wire with nothing pressed; on both blocks.
- **Go-wire**: that button's wire back to the starter; pulls in its contactor.
(Colors on the Crowley station: red = IN go-wire, black = OUT go-wire, white = common. Don't trust it elsewhere.)

## The swap (OUT button runs IN)
1. Control power off.
2. OUT block: leave the common. Remove the OUT go-wire, cap it, tuck it aside.
3. Move the IN go-wire from the dead IN block onto the OUT block where the OUT go-wire was.
4. Power up. OUT now runs IN; IN does nothing.
5. Tag the station: **OUT BUTTON RUNS IN — TEMP.** Reverse steps 2–3 when the new block comes.

Never land both go-wires on one block. If the contact blocks are the same part, moving the good
block onto the IN operator is cleaner — labels stay honest.

No stop button on a momentary station: release = stop. If a contact sticks, the only stop is the
breaker. Somebody at it the first time the winch is loaded.

Order two contact blocks.
