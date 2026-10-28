---
boat: M/V A. Steven Crowley
system: fuel
last_updated: 2026-10-27
---

# Fuel system — how THIS boat is plumbed

## Tanks
| Tank | Side | Table max | Steve's fill mark | Binder boxed mark | Notes |
|---|---|---|---|---|---|
| #2 | P & S | 116" (17,050 gal) | 106" | 104" | Lowest fill; rarely used for burn-down |
| #3 | P & S | 125" (13,385 gal) | 118" | 118" | Burns down with the 4s |
| #4 | P & S | 125" (10,192 gal) | 118" | 118" | **Engine supply.** Suction always open |
| #5 | P & S | 125" (9,817 gal) | 118" | 117" | Opened at 40" in the 3s/4s |

Tank tables (inches → gallons) are in `../fuel/tank-tables/*.csv`. Port and starboard share the same
table for a given tank number. Note: the binder's #3 table has a misprint at 41" (printed 4,555;
handwritten correction 4,156 — the correction is what's in the CSV).

Capacity at the fill marks, all 8 tanks: ~93,900 gal. Usual top-off: **~91,500 gal** (company 12" rule).

## Valves — the part that's different on this boat
Each tank has a **fill** valve, a **suction** valve, and (3s and 4s) a **high suction**.

- **The fill header runs low enough that fuel gravitates between tanks through the FILLS.**
  Two tanks with their fills open equalize. That is the normal burn-down lineup.
- **Suctions** are for pulling fuel OUT with a pump: engine supply (#4s), transfer pump source,
  offloading, stripping, isolation. Only the #4 suctions are part of normal running.
- **High suctions** on the 3s and 4s feed the centrifuge from above the sludge line. Always open,
  which also means the 3s and 4s share that header no matter what the fills are doing — a full #3
  can drift down slowly into a lower #4 through it. Sound the 3s over a watch if you need to know.
- Day tank fills from the #4 suctions and **returns to #4**.

## Normal running lineup (from Steve's sheet)
1. Fills open on **P3, S3, P4, S4**. Everything else closed. 3s and 4s burn down together.
2. At **40"** in the 3s/4s, open the **5s'** fills. They join in.
3. 2s only if you have to.
4. #4 suctions and the 3s/4s high suctions: **never touched.**

Alternative the crew sometimes runs: fuel into the 3s, close them, burn the 4s alone, re-open
the 3s when the 4s get low. Works, but somebody has to remember — put the mark on the board.
Open P and S together so the list doesn't swing. A 118" tank into a 40" tank settles around 79".

## Taking on fuel (this boat)
See `../fuel/fueling-procedure.md`. Short version: all fills closed → open only the tanks being
filled + deck fill → next tank open BEFORE closing the current one → never shut the last open fill
with the dock pumping → slow the dock before the last tank tops off.

## Fuel log
Daily log workbook: `/docs/Steven_Crowley_Fuel_Log.xlsx` (type inches, gallons look up from the
tables, alerts when a truck load fits). Company form fields: previous → received → total → on hand
→ used, for fuel, lube oil and potable water.
