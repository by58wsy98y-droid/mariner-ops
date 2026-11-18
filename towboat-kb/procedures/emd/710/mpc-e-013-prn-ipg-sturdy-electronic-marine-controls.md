---
title: IPG Sturdy Electronic Marine Controls — System Guide
mpc_code: MPC-E-013-PRN
code_label: TRC code
card: Technical Reference Card
department: Engineering
frequency: As Needed / Reference
applies_to: MTC Vessels with EMD 710 Electronic Engines
revision_date: 4/22/2026
revision: Rev. 0 (4/26)
marking: Internal Use Only
source: Marquette Transportation Co. Technical Reference Card
---

# IPG Sturdy Electronic Marine Controls — System Guide

## Reference Steps

### 1. Document Overview
Source Document: IPG Sturdy Electronic Marine Controls - Control System Application and Operation (EMD Applications).\
System: IPG Sturdy Bridge Control System for EMD-powered vessels.\
Applies To: Marine vessels using EMD electronically controlled engines with IPG Sturdy control interface.\
Vessel Type: Any MTC Vessel equipped with EMD 710 Electronic Engines.\
Key Modules: ERIM-GI, MIM, CSIM, CBP, EDM, EBCP.

### 2. System Introduction and Architecture
The IPG Sturdy Control System interfaces one EMD electronically controlled engine and one marine gear from up to six independent control stations. It coordinates operator throttle and gear commands, manages ECM communication, and provides protective logic for the marine gear and engine. A panel-mounted Electronic Display Module (EDM) provides continuous operational data at each station.

SYSTEM ARCHITECTURE:
1. Each engine and marine gear has its own dedicated IPG Sturdy control system. Multiple engines = separate control systems.
2. ERIM-GI (Engine Room Interface Module / Gear Interface) is the master module. Coordinates station transfer, routes ECM commands, manages gear shift logic.
3. MIM (Marine Interface Module) is the interface point to the engine ECM. Monitors marine gear temperature and oil pressure; provides local control panel logic including Check Engine Light (CEL) and Stop Engine Light (SEL).
4. Each control station uses a CSIM (Control Station Interface Module) as the local junction box, converting operator lever and button inputs to digital data for transmission to the ERIM-GI.

OPERATING MODES:
1. NORMAL MODE: ERIM-GI controls engine speed via variable Frequency Throttle signal to the ECM. ERIM grounds the Sync Enable line, instructing ECM to follow frequency-based throttle commands.
2. BACKUP MODE: Battery voltage applied to Sync Enable line switches ECM to analog Backup Throttle potentiometer signal (0-5 VDC) from the EBCP. All system enhancement features (gear shift protection, throttle up delay) are bypassed in backup mode.

### 3. Section 2 — Precautions
**WARNING:** WELDING. Before any welding, disconnect BOTH positive (+) and negative (-) battery leads. Ground the welding cable in close proximity to the weld location. Never use the engine as a grounding point. Welding on the engine or engine-mounted components is NEVER recommended.

### 4. Section 4 — System Features and Protection Logic
LOW VOLTAGE MONITORING (4.3): EDM continuously monitors battery voltage at MIM and ECU.
1. LEVEL 1: Voltage below minimum acceptable at MIM - EDM displays a low voltage code.
2. LEVEL 2: Voltage below minimum acceptable at ECU(s) - EDM displays a different low voltage code.
3. LEVEL 3: Voltage drops below 10.5 V at the active CSIM - all button panel lamps flash; EDM displays a third low voltage code.

HIGH ENGINE SPEED SHIFT PROTECTION (4.5):\
**WARNING:** Gear shifts above recommended RPM may cause severe damage to marine gears.
1. ERIM-GI monitors engine speed continuously. On opposite-direction shift command, ERIM first shifts to NEUTRAL immediately.
2. ERIM waits until engine RPM drops to safe shift speed (default 450 RPM) before completing direction change and returning to commanded throttle.
3. Maximum allowable shift speed is adjustable only via Mariner diagnostic software (P/N 39-00585A). Default: 450 RPM.

GEAR SHIFT THROTTLE UP TIMING DELAY (4.6):
1. Programmable time delay holds engine RPM at idle after a gear shift command. Protects slow-shifting gears and high-mass propulsion systems. Default: 0 sec. Adjustable only via Mariner software.
2. Adjustable normally open pressure switch can interrupt throttle signal from ERIM-GI to ECM, preventing engine from exceeding Low Idle RPM until clutch pressure reaches a safe level.

**WARNING:** All three enhancement features (High Speed Shift Protection, Throttle Up Delay, Pressure Switch Interrupt) are BYPASSED when using either Emergency Backup Panel.

EMERGENCY BACKUP (4.7):
1. EBCP (Emergency Backup Control Panel) provides independent throttle and gear shift control if the primary system fails.
2. When backup mode is active: all control stations go inactive, all EDMs display a backup mode alert, and the backup throttle potentiometer controls engine speed once cycled to idle.
3. Backup is designed as a temporary stop-gap. Restore primary operation as soon as possible.

GEAR SHIFT LOCKOUT (4.2.5):
1. Marine gear can be commanded to NEUTRAL using the gear shift lockout feature. Allows throttling the engine without engaging the gear - useful for dockside troubleshooting and checkout.

### 5. Section 6 — Electronic Display Module (EDM) Operation and Alarms
EDM STANDARD DISPLAY (6.1): Continuously displays Engine RPM, Coolant Temperature, Oil Pressure, Battery Voltage, Marine Gear Oil Temperature, and Marine Gear Oil Pressure. Additional parameters via the four-menu keypad system.

ALARM CONDITIONS (6.1.4):
1. On alarm: internal 90 dB audible alarm sounds, a word description scrolls through the text window, ALARM CODE appears in the lower-left corner, CHECK blinks in the upper-left corner.
2. If a permanently displayed item is affected (oil pressure, coolant temp), that value blinks on the main display.
3. Press ALARM OFF to silence the audible alarm. The alarm condition remains displayed until the fault is resolved.

PROGRAMMABLE ALARM SETPOINTS (6.2):\
Marine Gear Oil Pressure Alarm - Set Point 1 (Default): 100 psi (689 kPa) @ 550 RPM\
Marine Gear Oil Pressure Alarm - Set Point 2 (Default): 150 psi (1,034 kPa) @ 750 RPM\
Marine Gear Oil Temperature Alarm (Default): 195 °F (90.6 °C)\
Battery Voltage Alarm Setpoint: Programmable per vessel specification\
Maintenance Reminder A: Default Disabled. Interval 500 hrs. Range 0-5,000 hrs in 10-hr steps.\
Maintenance Reminder B: Default Disabled. Interval 500 hrs. Range 0-5,000 hrs in 10-hr steps.

**NOTE:** Verify oil pressure and temperature alarm values match marine gear manufacturer specifications before placing vessel in service.

### 6. Section 7 — Marine Backup System Operation
ACTIVATING EMERGENCY BACKUP (7.1):\
**WARNING:** Gears immediately follow EBCP transmission settings when backup mode is activated. Before activating: rotate throttle knob to full counter-clockwise (idle) and gear switch to center (neutral).
1. Rotate the EBCP throttle knob to full counter-clockwise (idle).
2. Set the EBCP gear switch to center (neutral).
3. Activate the backup control switch on the EBCP.
4. Once activated: marine gear responds to EBCP gear shift switch. All control stations go inactive. EDMs display backup mode alert.
5. Cycle the backup throttle potentiometer to idle; it will then command engine speed normally.

RETURNING TO NORMAL OPERATION (7.1.2):
1. Set the EBCP throttle knob to idle and gear switch to neutral.
2. Turn off the backup control switch.
3. Press STATION ACTIVE at the desired primary control station to resume normal control.
4. Qualify the throttle levers at the resumed station before increasing engine speed.

### 7. Section 9 — System Configuration and Dockside Checkout
**NOTE:** Dockside checkout must be completed before any sea trial. Do not proceed with sea trial until all checklist items are verified.

POWER-UP VERIFICATION (9.3):
1. Verify ECM powers on with ignition key.
2. MIM runs a 5-second bulb check at ignition ON; green ignition light remains ON and steady after check.
3. EDM for each engine turns on, completes self-check, and displays live engine data within 10 seconds.
4. Press STATION ACTIVE: light illuminates steadily if all inputs are within proper range. Cycling the STATION ACTIVE button cycles through four LED intensity levels.

THROTTLE TRAINING (9.3.3):
1. At each CSIM, perform the train the throttle levers routine to store idle and full-throttle potentiometer position values. Separate values stored for ahead and astern.
2. After throttle training: turn off ignition key and wait 30 seconds minimum before powering on again. Allows CSIM to write new values to nonvolatile memory.

**NOTE:** If training is not done or done incorrectly, engine may not reach rated RPM, idle may not match, dead band regions may be incorrect, or ERIM may log a fault.

### 8. Dockside Checklist (9.6)
1. Key turns ON ECM.
2. MIM 5-second bulb check runs at ignition ON; green ignition light ON steady.
3. EDM for each engine turns ON, checks OK, displays live data.
4. STATION ACTIVE light illuminates when STATION ACTIVE button is pressed.
5. STATION ACTIVE light intensity changes correctly with button presses.
6. Throttle levers trained at each CSIM for minimum and maximum positions.
7. EDMs programmed for marine gear max temperature and oil pressure alarm setpoints (wait for sea trial to set oil pressure alarms under load).
8. Clutch lockout mode verified: throttle can be increased without gear engagement.
9. Backup panel throttle and gear controls verified.
10. Gear engagement verified with engine running: ahead, neutral, astern confirmed.
11. Station transfer verified between all installed control stations.

### 9. Operational Troubleshooting Index
For EMDEC-specific fault codes, see MPC-E-011-PRN.

Engine does not respond to throttle commands: CSIM throttle training not completed, or ERIM-GI throttle frequency signal fault. Retrain throttle levers at the active station. Check ERIM-GI power and data link connections.

Gear will not shift from neutral: Clutch lockout mode may be active. Deactivate by pressing LO IDLE and SYNC buttons simultaneously. Verify gear shift solenoid wiring to ERIM-GI.

Gear shifts at high RPM (jolt or clunk): High speed shift protection may be set too high or bypassed. Verify Max Shift RPM in Mariner software (default 450 RPM). Confirm EBCP backup switch is OFF.

EDM displays low voltage alarm: Battery or charging system issue. Check battery voltage at MIM. Verify all ground connections. Review EDM programmed low voltage setpoint.

EDM does not power on: EDM is wired for continuous power. Check power supply connector at rear of EDM. EDM enters sleep mode only when data bus is inactive (ignition off).

Station transfer not working: Verify STATION ACTIVE at destination station. Check station transfer lockout - a lockout switch at the master station may be preventing transfer. Each control station link is independent; a failed link affects only that station.

Engine RPM does not reach rated speed: Throttle not trained to correct maximum position. Retrain CSIM throttle levers. Verify no ERIM fault related to throttle out of range.

Backup panel not controlling engine speed: Ensure EBCP is in backup mode (switch ON). Verify backup throttle potentiometer is cycled to idle before commanding speed. Verify Sync Enable wiring from ERIM-GI to MIM.

Alarm condition displayed on EDM (oil pressure): Marine gear oil pressure below programmed setpoints. Verify gear lube system. Check EDM programmed oil pressure alarm setpoints match gear manufacturer specs.

Maintenance reminder alarm active: Service interval reached. Complete maintenance, then reset Maintenance Reminder A or B via EDM Programming Choices menu.
