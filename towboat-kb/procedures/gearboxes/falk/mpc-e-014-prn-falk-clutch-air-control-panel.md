---
title: Falk Clutch Air Control Panel — Operational Guide
mpc_code: MPC-E-014-PRN
code_label: TRC code
card: Technical Reference Card
department: Engineering
frequency: As Needed / Reference
applies_to: MTC Vessels with Falk Reduction Gear Clutch Assemblies (26"-48")
revision_date: 4/22/2026
revision: Rev. 0 (4/26)
marking: Internal Use Only
source: Marquette Transportation Co. Technical Reference Card
---

# Falk Clutch Air Control Panel — Operational Guide

## Reference Steps

### 1. Document Overview
Source Document: Falk Air Control Panel Manual, Service Manual 858-160.\
Equipment: Falk Clutch Air Control Panel (Lock-Up and Slip Configurations).\
Applicable Systems: Falk Reduction Gear Clutch Assemblies (26" through 48").\
MTC Policy: Lock-Up Control configuration only. Do not use Slip Control settings.

Scope: Operational summary of the air control panel and its pneumatic components, standard operating conditions, control setup procedures, maintenance intervals, and troubleshooting guidance.

### 2. Section 1 — System Overview
The Falk Air Control Panel is a pneumatic control assembly that manages engagement and direction of Falk clutch-driven reduction gears. It provides speed and direction control through a single hand lever per propeller. Forward lever movement selects the ahead clutch; backward movement selects the astern clutch. The center position is neutral, disconnecting the engine from the propeller shaft.

Two standard configurations exist: lock-up and slip. Per MTC policy, only the lock-up configuration is authorized. The slip configuration (controlled clutch slippage for low-speed maneuvering) is not to be used on MTC vessels.

All intermediate steps of clutch engagement, pressure regulation, and speed control are handled internally by the air panel. The operator controls only the final operating speed and direction via the hand lever.

### 3. Section 2 — Lock-Up Control System Operation
In lock-up configuration, moving the control handle to the first detent on either side of neutral shifts the 4-way valve, selecting either the ahead or astern clutch for inflation. Simultaneously, a 30 psig speed signal is sent to the control panel.

CLUTCH INFLATION SEQUENCE:\
Clutch air passes through the H-5 inflation valve during all phases of inflation. Initially, air flows through an orifice, providing soft engagement. When clutch pressure reaches 45 psig, the governor signal begins increasing in proportion to clutch pressure. At 70 psig, the boost valve opens, allowing supply air to bypass the orifice and flow directly into the clutch, minimizing time to full clutch pressure.

Once the clutches are fully inflated, control handle movement past the first detent regulates engine speed between idle and full speed.

PRESSURE LOSS PROTECTION:\
If supply air pressure drops, the maximum engine speed is reduced in proportion to clutch capacity, preventing inadvertent clutch slippage. At 75 psig or less, the controls shift into neutral with the governor signal line vented. At any intermediate pressure, full control is available below the limiting speed allowed by the governor limit valve.

The control system prevents simultaneous engagement of both clutches during normal operation.

### 4. Section 3 — Standard Operating Conditions
CLUTCH AIR SUPPLY:\
Supply Pressure (Nominal): 140 +/-5 psig\
Low Pressure Alarm Setpoint: 125 psig (falling)\
Air Tank Capacity (per clutch): Minimum 2.5 cubic feet\
Air Quality Requirement: Clean and dry (filtered)

REQUIRED AIR SUPPLY COMPONENTS (order from ship's compressed air to control panel):

1. Pressure regulator
2. Filter and safety valve
3. Check valve (upstream of air tank)
4. Air tank (minimum 2.5 cu. ft. per clutch assembly)
5. Valve downstream from air tank

The filter and air tank should be suitably valved for draining. All connections should be made on top of the tank except the drain line. The air tank provides emergency inflation of the clutch upon loss of ship's supply air, allowing limited service during operation without declutching.

**CAUTION:** Use of air from the clutch supply system for other components such as horns may cause pressure drops resulting in clutch failure, especially without the recommended air tank.

### 5. Section 4 — Major Panel Components
| Ref | Component | OEM / Falk P/N | Function |
|---|---|---|---|
| 1 | Pilotair Valve (Type D) | P62572 / 916355 | 4-way valve; selects ahead or astern clutch by handle position |
| 2 | C-2 Relay Valve | 538975 / 916358 | Flow booster; amplifies speed signal to set clutch pressure during slip |
| 3/4 | H-5 Relayair Valve | Various / 916336+ | Inflation valve; orifice and boost stages |
| 5/6 | H-5 Relayair Valve (45/70 lb) | P59155-0045/0070 | Pressure-rated variants for governor proportioning and boost activation |
| 7 | Shuttle Valve (1/4") | P54350-2 / 916371 | Directs air to correct clutch circuit; prevents cross-flow |
| 8/9 | Check and Choke Valve | P55025 series | Metered orifice flow for soft engagement |
| 10 | Check Valve (3/8") | P55025 / 916339 | Prevents backflow in pneumatic circuit |

PANEL CONNECTIONS:\
A: Astern 1/4" - 18 N.P.T.\
B: Speed Line from Pilothouse 1/4" - 18 N.P.T.\
C: Ahead Pressure Gauge Line 1/4" - 18 N.P.T.\
D: Supply 1/2" - 14 N.P.T.\
E: Astern Pressure Gauge Line 1/4" - 18 N.P.T.\
F: Engine Governor 1/4" - 18 N.P.T.\
G: Ahead 1/4" - 18 N.P.T.\
H: Ahead Clutch\
J: Astern Clutch

### 6. Section 5 — Control Setup, Non-Slip (Lock-Up) System
Perform all steps with the engine shut down unless otherwise indicated.

1. Set tank pressure at recommended value. Blow out moisture. Clear filter.
2. Move each controller to minimum ahead setting to verify ahead pilot is installed correctly. Ahead clutch should inflate to full tank pressure. Verify by watching clutch and ahead pressure gauge.
3. Move each controller astern to check astern pilot. Astern clutch should inflate to full tank pressure. Verify by watching clutch and astern pressure gauge.
4. Disconnect both clutch air lines from the rotary seal and cap or plug them to assure complete clutch disconnect. Connect 0-100 psig test gauge in speed line of first control stand to be set up.
5. Start engine, set idle speed using mechanical governor stop, check that engine accelerates off idle at pressure marked on the governor. Record pressure.
6. Increase RPM to rated speed. Record speed line pressure for this condition. Shut down engine.
7. Set handle to minimum speed, 10 degree detent or Z slot. Adjust regulator to minimum speed pressure (Step 5). Move pressure full ahead (Step 6) and set stop. Move to full astern (Step 6) and set stop.
8. Repeat Step 7 for all stands.
9. Unplug and reconnect hoses.

**NOTE:** After mooring lines are secure and propeller is clear, start engine and move handle slowly to 30 degrees ahead, noting travel and pressure at which lock-up occurs. If substantially less than 30 degrees and 20-22 psig, regulator may be readjusted to reduce speedline pressure at 40 degrees by 2 psig maximum.

### 7. Section 6 — Emergency Shaft Locking Procedure
This procedure inflates both clutches simultaneously to lock the shaft. The engine must be shut down for the duration of this procedure. Do not attempt to start the engine until the control panel is reassembled for normal use.

1. Transfer the engine-gear control to the engine room and shut down the engine with the control in neutral.
2. Shut off the manual main engine starting supply valve near the starting air motors.
3. Remove the astern air hose from the control panel assembly. Remove the cap nut from the tee in the ahead clutch air line.
4. Reconnect them exchanging their locations.
5. With the engine shut down, place the engine room control handle in the full ahead position. Air pressure will inflate both clutches for a shaft lock.
6. Return the engine room propulsion control handle to neutral to vent the clutches before disconnecting this emergency shaft brake arrangement.

**CAUTION:** Engine must be shut down during this procedure. Do not attempt to start it again until the control panel is reassembled for normal use.

### 8. Section 7 — Suggested Maintenance
Continuous: Check air pressure to the clutch, maintaining 140 psig.\
Monthly: Operate all control systems to clear lines not frequently used.\
Annually: Inspect air control panel valve bodies. Clean and lubricate all operating rubber parts; replace damaged parts. Reassemble and operate all cycles while checking for leaks.

COMPONENT-SPECIFIC MAINTENANCE NOTES:

Pilotair Valve (Type D): No adjustment required. Periodically dismantle for inspection and cleaning. Wash metal parts with kerosene or equivalent solvent. Wash seals with soap and water and examine for cracks or wear. Dry with low-pressure air. Lubricate friction surfaces and seals with No. 1 grade graphite grease during reassembly.

H-5 Relayair Valve: No adjustments required. Remove from pipe bracket by removing nuts (pipe connections remain undisturbed). Disassemble for cleaning, inspection, lubrication. Pay particular attention to the diaphragm and O-ring. The diaphragm follower unit should not be removed unless spring replacement is required.

C-2 Relay Valve: No adjustment required. Dismantle periodically for inspection, cleaning, and lubrication. Inspect and replace diaphragm and rubber packing rings if cracked or worn. Lubricate friction surfaces with wide temperature range grease.

Check and Choke Valve: No adjustments necessary. Access internal parts through the body after removing the cap nut. Wash metal parts with non-flammable solvent, rubber parts with soap and water. Lubricate metal-to-metal with No. 107 Lubriplate, packing rings with No. 55 Pneumatic Grease (Dow Corning) or equivalents.

Shuttle Valve: No adjustment required. Remove cover (screws and washers) for easy diaphragm replacement without disturbing piping. Clean metal parts with nonflammable solvent; wash rubber parts with soap and water. No lubrication or special tools required.

### 9. Section 8 — Troubleshooting
Problems normally appear as sloppiness in one or more functions rather than abrupt loss of control. Usually caused by foreign material in valve bodies or developing leaks. Locate the valve associated with the poorly performing function using Section 2, then rebuild.

Clutch fails to inflate when handle is moved from neutral:\
Cause - No air supply; 4-way (Pilotair) valve stuck or not shifting; shuttle valve stuck.\
Action - Verify supply pressure (140 psig). Inspect Pilotair valve for debris or worn seals. Check shuttle valve diaphragm.

Clutch inflates slowly or engages harshly:\
Cause - Orifice in check/choke valve plugged or wrong size; H-5 inflation valve malfunction.\
Action - Remove and clean orifice assembly. Inspect H-5 diaphragm, O-ring, supply/exhaust valves.

Both clutches engage simultaneously:\
Cause - Shuttle valve stuck open to both sides; cross-leak in pneumatic circuit.\
Action - Disassemble and inspect shuttle valve. Replace diaphragm and gasket if worn. Check all hose connections for cross-leakage.

Engine speed does not respond to handle movement past first detent:\
Cause - Governor signal line blocked or leaking; speedline pressure incorrect.\
Action - Check governor signal line connections for leaks/obstructions. Verify speedline pressure with test gauge per setup procedure.

Controls shift to neutral unexpectedly:\
Cause - Supply air pressure dropping below 75 psig.\
Action - Check air supply for leaks. Verify air tank capacity. Inspect regulator and check valve upstream of tank. Confirm no other systems are drawing from clutch air supply.

Clutch slippage at full ahead/astern:\
Cause - Air pressure insufficient; H-5 boost valve not opening at 70 psig; worn clutch liners.\
Action - Verify supply pressure. Inspect H-5 for proper boost activation. If air system correct, inspect clutch liners and drums for wear.

Sloppy or erratic control response:\
Cause - Foreign material in valve bodies; worn seals; air leaks in control lines.\
Action - Perform annual inspection: disassemble all valves, clean, inspect seals/diaphragms, replace worn components, check all hose connections.

Pressure gauge reads low or zero with supply connected:\
Cause - Gauge line blocked or disconnected; faulty gauge; leak at connection.\
Action - Verify gauge line connections (Ref C and E). Test with known-good gauge. Check for air leaks at all fittings.

Clutch does not fully release when returned to neutral:\
Cause - Exhaust port blocked on 4-way valve; residual pressure in clutch line.\
Action - Inspect Pilotair exhaust ports for obstruction. Verify valve fully returns to center (exhaust) position. Check for kinks in clutch air hoses.

### 10. Quick Reference — Key Operational Limits
Clutch Air Supply Pressure: 140 +/-5 psig\
Low Pressure Alarm Threshold: 125 psig (falling)\
Neutral Shift Pressure: 75 psig or less\
Governor Signal at First Detent (Lock-Up): 30 psig\
Governor Signal at First Detent (Slip): 15 psig\
Clutch Lock-Up / Min. Slip Pressure: 22 psig\
Full Pressure Lock-Up (H-5 Valve): 25 psig\
Engine Acceleration Signal: 30 psig\
Orifice Soft Engagement Threshold: 45 psig clutch pressure\
Boost Valve Activation: 70 psig clutch pressure\
Air Tank Minimum Capacity: 2.5 cu. ft. per clutch assembly\
Speedline Pressure at 10 degree Detent: 15 +/-5 psig

**NOTE:** This card summarizes operational and troubleshooting data from the Falk Air Control Panel Manual (Service Manual 858-160). It does not replace the full OEM manual for detailed valve rebuild procedures or parts identification. Consult Falk before making any modifications to the control system.
