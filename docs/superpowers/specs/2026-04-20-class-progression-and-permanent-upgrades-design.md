# Stormvault Courier Progression Split Design

## Goal

Split progression into exactly two upgrade families:

1. Per-solar-system progression
2. Permanent upgrades

The per-solar-system layer should carry across multiple runs inside the current solar system, then reset when the player jumps to the next solar system. The permanent layer should persist forever and be expensive enough that meaningful advancement usually takes multiple completed solar systems.

## Design Summary

The game will use two parallel economies:

- `Orbs / credits`
  Used for permanent contract bay upgrades
- `Enemy drop points`
  Used for per-solar-system combat progression

This keeps exploration and hauling tied to long-term account progress while combat feeds the current system build.

## Progression Layers

### Per-Solar-System Progression

This layer resets on jump to a new solar system.

It includes:

- combat stats
- ship class selection
- later class branches and ship type evolution

This progression is earned from enemy drop points and spent during runs. Points remain attached to the current solar system build across runs until the player jumps away.

### Permanent Upgrades

This layer never resets.

It includes contract bay upgrades that support:

- scanning
- harvesting
- economy
- hauling support
- class depth unlocks

These upgrades should be expensive and intentionally slower than solar-system progression. Early ranks should be reachable, but meaningful permanent growth should usually require several system completions.

## Per-Solar-System Stats

The combat stat pool for the current solar system is:

- `Max Health`
- `Health Regen`
- `Body Damage`
- `Bullet Speed`
- `Bullet Penetration`
- `Bullet Damage`
- `Reload`

These stats are not permanent. They represent the current ship build for the current solar system only.

### In-Run Spending UX

Combat points should be spendable during normal gameplay through a persistent bottom-left stat panel inspired by the clear `diep.io` style shown in reference screenshots.

Requirements:

- show all combat stats in a compact vertical list
- show currently available spendable points as a visible counter such as `x2`, `x3`, and so on
- let the player spend points immediately during the run without pausing normal play
- keep the panel small and readable enough that it does not smother the playfield

Normal stat upgrades should feel fast and reactive. The player should be able to fight, earn points, and invest them on the fly.

## Per-Solar-System Class Progression

Class progression is also solar-system-scoped and resets on jump.

The player starts each solar system as the base ship:

- `Courier`

Class upgrades unlock at progression thresholds funded by enemy drop points. When the player reaches a class threshold, the game pauses and presents the next class selection. The player must choose before play resumes.

This class selection UX is important because it makes branching feel deliberate and readable rather than hidden in a busy combat HUD.

Only tier branching should pause the game. Regular stat spending should not.

## Tier 2 Identity Pass

The first implementation pass should focus on making the four Tier 2 classes visually and mechanically distinct before deeper tier reworks.

### Twinframe

- visual design: two forward parallel cannons
- attack behavior: both cannons fire simultaneously
- firing pattern: straight parallel lines, not alternating

The class should immediately read as a stable dual-cannon generalist.

### Longshot

- visual design: slimmer ship body with a longer barrel and larger muzzle
- projectile behavior: slower, visibly larger, heavier shell
- camera behavior: wider point of view at all times while the class is active

The class should feel like a range-specialist platform that can take advantage of seeing farther than the default chassis.

### Drone Bay

- visual design: carrier-like body with a visible launch bay
- attack behavior: no normal gun
- weapon behavior: deploys one autonomous attack drone instead of firing bullets
- drone behavior:
  - drone automatically seeks nearby enemies
  - drone has its own HP
  - repeated collisions eventually destroy it
  - when a drone breaks, the bay reloads and launches the next one automatically

For this class family, `Reload` stays as `Reload`.

Its meaning changes to drone-cycle speed:

- higher reload means the replacement drone launches faster after destruction
- the stat name and slot do not change

### Bulwark

- visual design: larger, broader, heavier hull
- attack behavior: intentionally weak gun
- class identity: tanky ram-focused bruiser with stronger body-damage play

The class should feel physically imposing and obviously less shooting-focused than the other Tier 2 options.

## Tier 2 Class Selection Screen

The class selection prompt should show more than text.

Requirements:

- every class option should show a visual ship preview
- the preview should be a small animated preview, not a static card
- the preview should communicate the class attack style where possible

Examples:

- Twinframe preview shows two parallel muzzle shots
- Longshot preview shows a slower heavy shell
- Drone Bay preview shows the launch/drone behavior
- Bulwark preview shows the heavier silhouette and weaker firing emphasis

The class choice should feel like selecting a real chassis, not picking from plain text descriptions.

## Point Drop Tuning

Enemy progression points should remain collectible drops rather than instant rewards.

The values should be tuned down drastically from the current implementation so that:

- many basic enemies drop nothing at all
- stronger enemies only sometimes drop a point
- boss-type enemies are still the clearest source of combat progression
- progression does not spike from only one or two strong runs

The intended feeling is slow, deliberate build growth across a solar system, not explosive early snowballing inside a single run.

## Stat Panel Size

The bottom-left in-run stat panel should be reduced in visual footprint.

Goals:

- preserve readability
- keep the `xN` available-points indicator visible
- avoid taking too much of the lower-left playfield
- still support live stat spending during combat

## Class Tier Gating

The design goal is to prevent players from reaching full Tier 4 evolution too early, especially in the first solar system.

Tier access is controlled by the permanent `Class Matrix` upgrade:

- `Class Matrix Lv 0`
  Tier 2 classes available
- `Class Matrix Lv 1`
  Tier 3 classes available
- `Class Matrix Lv 2`
  Tier 4 classes available

Tier 4 should be tuned so that, in practice, the player does not reasonably reach it until roughly solar system 2 or 3, often around run 3 or 4 of that system depending on skill and permanent progress.

This gating supports replayability:

- early systems let players sample classes
- later permanent growth lets them revisit those same class lines and finally see Tier 4 outcomes

## Enemy Drop Points

Enemies drop solar-system progression points on death.

Those points:

- are spent during runs
- contribute to combat stat upgrades
- contribute to class tier unlock thresholds
- do not convert into permanent contract-bay currency

Stronger enemies should drop more points than basic enemies, and boss-type enemies should drop significantly more.

## Permanent Upgrade List

The approved permanent upgrade pool is:

- `Scan Suite`
  Bigger scan radius and faster scan cooldown
- `Harvester Rig`
  Faster orb extraction from nodes
- `Orb Appraisal`
  Higher-value orb colors pay more credits
- `Insurance Core`
  Better credit payout when a run fails
- `Mass Stabilizers`
  Carrying orbs slows the ship less
- `Cruise Thrusters`
  Raises the ship's permanent baseline cruise speed
- `Prospecting Array`
  Better chance for high-value orb colors to appear farther out
- `Class Matrix`
  Unlocks deeper class tiers permanently

## Permanent Upgrade Philosophy

Permanent upgrades should not duplicate the combat identity already provided by solar-system stats.

That means the permanent layer intentionally avoids:

- max health upgrades
- health regen upgrades
- direct bullet damage upgrades
- reload upgrades
- direct combat stat replacements

`Cruise Thrusters` is the dedicated home for cruise speed. That stat should not also appear in the per-solar-system stat list.

This keeps the system-build layer focused on combat specialization while the permanent layer handles traversal support for the haul-and-return loop.

The permanent layer exists to improve the long-term structure around runs, not replace the system build.

## Economy Split

The two progression layers should stay visually and mechanically distinct:

- `Orbs delivered / credits`
  Permanent upgrade economy
- `Enemy drop points`
  Solar-system progression economy

Players should always be able to tell:

- what makes them stronger forever
- what only powers up the current solar system build

## Run Length Target

The debris timer should be increased to `5 minutes` per run.

This longer run length is intentional. It gives the player enough time in a single run to:

- fight multiple waves
- earn and spend combat points during active gameplay
- push farther from the extraction ship for better orb value
- enjoy the current solar-system build instead of feeling rushed too early by the debris field

The debris timer is not just pacing. It is a hard anti-greed pressure system that exists to stop the player from safely exploring forever, reaching the farthest orb fields, and returning without meaningful risk.

That pressure works together with orb carry weight:

- the longer the player stays out, the less safe the return becomes
- the farther the player goes, the more valuable the orbs become
- the more orbs the player carries, the slower the ship becomes

The intended result is that extremely profitable deep runs remain possible, but they should become progressively less safe and less recoverable as time and carry weight stack together.

The debris field should remain dangerous, but it should no longer cut off experimentation and fun before the class and stat systems have room to breathe.

## Late-Run Pressure Scaling

Enemy pressure should increase linearly as the debris timer approaches zero.

This means:

- enemy spawn pressure should be lighter early in the run
- enemy density should steadily rise as the timer falls
- the end of the run should feel visibly more crowded and hostile than the beginning
- the final minute should become effectively unsurvivable for most builds unless the player is already returning to extract

This scaling should support the same anti-greed goal as the debris field:

- early run = room to build and explore
- late run = increasingly dangerous return window
- final minute = panic phase where enemies arrive from all sides and the map stops feeling safe

The ramp should be linear and readable rather than suddenly spiking without warning, but the numbers should still become severe enough that greed is punished hard.

Practical outcome:

- by around `1 minute` remaining, enemy pressure should already feel overwhelming
- enemy cap should be much higher than the current build
- spawn bursts should become more frequent and larger as the timer falls
- the player should not feel like they can calmly keep farming deep space through the last minute

## Permanent Economy Targets

Permanent progression should be much slower than the current build.

Targets:

- `Class Matrix Lv 1` should usually not be reachable until solar system `2` or `3`
- that means roughly `10` runs of meaningful play before Tier 3 access becomes normal
- early permanent upgrades should still be buyable, but even those should require commitment
- permanent upgrade costs should ramp much more steeply per rank than they do now

`Class Matrix` should be among the most expensive permanent upgrades in the game.

The permanent economy should feel like long-term account growth, not something the player can brute-force in a single early solar system.

## Title Menu

The game should open on a proper start/title menu instead of dropping directly into a live run.

The title menu should include:

- `Play`
  Start or resume the current solar-system run
- `Codex`
  Open a reference section for enemies and solar systems
- `Tier 3`
  Marked clearly as `Coming Soon`

The menu should make the project feel like a real shipped alpha rather than a raw prototype.

## Codex Menu

The title menu should include a `Codex` section with two browsable panels:

### Enemy Codex

For each enemy, show:

- name
- visual preview
- short behavior summary
- where it appears

This codex should help the player understand threats without needing to memorize them mid-run.

### Solar Systems

For each solar system, show:

- system name
- theme / color presentation
- its enemy trio
- a short identity summary

This gives the player a stronger sense of progression and prepares them for what comes next.

## Tier 3 Menu Stub

The title menu should include a visible `Tier 3` entry marked `Coming Soon`.

Purpose:

- acknowledge future content intentionally
- make the menu feel like part of a growing roadmap
- avoid pretending deeper class content is already fully shipped

## HUD Placement

The extraction return vector should live near the top middle of the screen rather than low on the left HUD stack.

Goals:

- avoid the vector being covered by the in-run stat panel
- keep the heading readable while the player is in motion
- make the return direction easier to read at a glance during panic returns

## UX Requirements

The player should be able to understand class progression clearly.

Requirements:

- when class thresholds are reached, pause the game
- show the next available class choices
- show locked deeper tiers when blocked by `Class Matrix`
- explain the lock reason in plain language

This prevents players from missing new class options and supports the intended "come back later" replay loop.

## Balancing Targets

- Permanent upgrades should be costly enough that they are not casually maxed early
- `Class Matrix` should be one of the most meaningful and expensive permanent upgrades
- Solar-system progression should feel much faster than permanent progression, but still slow enough that a single run cannot trivially max a stat line
- Early solar systems should expose players to meaningful branching before full Tier 4 access becomes common
- The final minute should feel hostile enough that staying out deep becomes a desperate choice, not an obvious optimal farm

## Out of Scope For This Spec

This spec intentionally does not finalize:

- exact point drop rates per enemy
- exact permanent upgrade price curve values
- exact solar-system stat costs and caps
- exact class tree branch contents beyond the approved Tier 2 direction
- final visual styling of the title menu and codex

Those belong in the implementation planning phase.
