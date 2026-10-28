---
boat: M/V A. Steven Crowley
system: engine controls / EMDEC
last_updated: 2026-10-27
---

# Engine controls — EMDEC and the throttle chain

## The chain, pilothouse to injector
```
Lever (single-lever station: STATION ACTIVE / SYNC / LO IDLE buttons, Murphy MT-90 tach)
  → CSIM  (Control System Interface Module — pilothouse side; its two ground wires were found
            as splayed fork terminals barely touching the stud, 2026-10-23)
  → ERIM  (Engine Room Interface Module — red circuit board with LEDs in the stainless enclosure;
            replaced 2026-10-23, and at least once before that over the prior two years)
  → Inland Power Group interface panel (black box: IGNITION green, CHECK ENGINE amber, STOP ENGINE red,
            DIAGNOSTIC CONNECTOR round plug; connectors labeled SENDER ECM / ERIM / POWER / RECEIVER ECM —
            the one place sender ECM, receiver ECM and ERIM share a power feed)
  → Sender ECM and Receiver ECM (the two finned grey modules in the enclosure; power/ground bus
            studs at the top of the enclosure with stacked ring terminals, red and white/blue)
  → injectors
```
Idle 350 rpm, rated 900. 24 V system: charger reads 26.6 V, Inland panel reads 25.8–26.2 V at the
ECM — **a half-volt-plus drop not yet chased** (2026-10-27).

## What the ECM does on a throttle fault
Unknown on this boat — programmable (go to idle / hold last / default speed). **Ask for this setting
on the next Inland reader session.** A signal dropout driving the engine to a default speed would
explain the self-ramping without the signal ever reading high.

## Codes seen (port main, Oct 2026)
Throttle response time short; throttle response time low; code 71 injector 16 response time short
(12-cylinder engine — cylinder number suspect); baro pressure sensor high; turbo boost sensor low;
unknown 21/128, 11/128, 34/0, 76/60, 132/135; unknown 00 (most common — likely the panel alarming on
an empty code; probably the two-year "ghost alarm"). Number pairs look like raw SID/FMI bytes the
panel can't decode — read them to Inland as-is.

## Retraining the throttles
Manual section 9.3.3 (learn min/max at four lever positions, engine OFF / ignition ON) and 9.4
(check running). Plain-language step sheet: `/docs/Throttle_Retraining_Simple_Steps.docx`.
**Not yet performed as of 2026-10-27.** Should be done after any ERIM/CSIM change.

## Diagnostic access
Reader plugs into the DIAGNOSTIC CONNECTOR on the Inland panel. ECMs keep inactive codes with
counts and a snapshot (incl. battery voltage at the fault). A power cycle does not erase them.
**Do not clear before they're read.**
