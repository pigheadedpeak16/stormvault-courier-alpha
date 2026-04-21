# Orb Economy Balance Design

Date: 2026-04-20
Project: Stormvault Courier Alpha

## Goal

Rebalance the run loop so that:

- solar-system progression is based on raw orb delivery, not payout value
- upgrade credits still come from orb rarity/value
- the ship has no heat mechanic at all
- there is no hard orb carry cap
- carrying more orbs linearly slows the ship down
- a system can only be cleared after both conditions are met:
  - `40` total orbs delivered
  - `4` runs completed in that solar system

The game should preserve the current core loop: leave the extraction ship, collect orbs, survive enemy waves and the debris field, and decide when to return.

## Desired Player Experience

- Early nearby orbs feel safe but low-yield.
- Better-value orb colors appear farther from the extraction ship.
- The player can attempt a huge greedy haul, but every extra orb makes the return trip slower and more dangerous.
- Even if the player delivers a huge number of orbs early, they still must experience enough runs in the current solar system to see the enemy pool and wave escalation.
- Upgrade progression stays meaningful because rare orb colors pay more credits, even though every orb only counts as `1` toward quota.

## Core Rules

### Orb quota

- Each delivered orb contributes exactly `1` point toward solar-system completion.
- The current solar system requires `40` delivered orbs total.
- System completion also requires at least `4` completed runs in that system.
- The player cannot jump early by over-performing in a single run.

### Credits

- Orb color determines upgrade credit payout.
- Common, rare, and artifact orb colors should remain visually distinct.
- A higher-value orb still contributes only `1` toward the `40`-orb system quota.
- Credits are still the currency spent on permanent upgrades between runs.

### Carrying weight

- Remove the hard cargo cap.
- Remove the cargo capacity upgrade entirely.
- Each orb adds the same amount of carry weight.
- Carry slowdown is linear:
  - low orb counts create a small speed penalty
  - large hauls create a proportionally larger penalty
- The slowdown should apply to normal travel and boost movement so the return trip remains risky.

### Heat removal

- Remove the heat mechanic completely.
- Remove the heat bar and all heat-related HUD text.
- Remove heat generation from firing, boosting, harvesting, and enemy effects.
- Remove all heat-related pickups, abilities, and messages.
- Remove the `Heat Sink Grid` upgrade.

## Orb Distribution

### Near-ship supply

- Safe, near-ship nodes should be limited and should dry up quickly.
- The player should not be able to comfortably finish the `40`-orb quota by hovering close to the extraction ship across the whole system.

### Distance scaling

- Better-value orb colors should spawn farther away than they do now.
- Distance-based value escalation should be pushed outward so the strongest credit income requires deeper runs.
- This should make high-credit farming possible, but dangerous because the player must survive the trip back while carrying a slower, heavier haul.

### One orb equals one orb

- Node output should be interpreted as orb count, not “fuel” or abstract cargo.
- Delivered orb count and run payout must be tracked separately.

## Enemy and Run Pacing

### Solar-system completion pacing

- The player should experience at least `4` runs before a system can complete.
- The current structure of “survive the waves while gathering” should remain unchanged.
- There is no separate “defend the ship” mode.

### Enemy pool exposure

- The first `4` runs in a solar system should expose the player to the full local enemy pool before completion becomes possible.
- Enemy unlock pacing should be tuned so that by the end of run `4`, the player has encountered all enemy types assigned to that system.
- Wave pacing should make a typical successful system involve at least `4` meaningful wave escalations overall before jump readiness is likely.

## Upgrade Changes

### Remove

- `Expanded Hold`
- `Heat Sink Grid`

### Keep

- scan/radar upgrade
- movement/thruster upgrade
- shield/hull upgrade
- bullet damage upgrade
- fire-rate upgrade
- salvage/value upgrade
- plating/damage reduction upgrade

### Upgrade economy intent

- Permanent upgrades should continue to improve survivability and combat over multiple runs.
- Rare orb colors should accelerate upgrade growth without letting the player skip the system run requirement.

## HUD and UI

### Left HUD

- Replace any remaining fuel wording with orb wording.
- Show quota as `Orb Quota`.
- Show system runs as a simple count label rather than `0 / 5`.
  - Example intent: `System Runs` with the current completed count visible.
- Remove heat from the top-left panel entirely.

### Summary overlay

- Keep `Launch Next Run` visible.
- Summary should clearly separate:
  - orbs delivered this run
  - credit payout
  - insurance
  - available credits

## Data and Logic Changes

### Meta progression

- Store solar-system quota progress as delivered orb count.
- Store credits separately.
- Jump readiness must check both:
  - delivered orbs `>= 40`
  - runs in system `>= 4`

### Run summary

- Extraction summary should report:
  - delivered orb count
  - credit payout
- Failed-run summary should preserve the current insurance behavior unless implementation reveals a balance issue.

### Node generation

- Node generation should bias high-value colors farther away from the extraction ship than today.
- Close-range generation should remain useful early in a run but should not dominate the full-system progression loop.

## Testing and Verification

- Verify the HUD no longer shows heat anywhere.
- Verify the removed upgrades no longer appear in the upgrade list.
- Verify one extracted orb increments quota by exactly one.
- Verify a rare/high-value orb gives more credits but still increments quota by only one.
- Verify the player can carry beyond the old cap.
- Verify movement speed decreases linearly as orb count rises.
- Verify the system cannot complete before `4` runs even if `40` orbs are delivered sooner.
- Verify all local enemy types appear by run `4`.
- Verify the left HUD displays `System Runs` as a count label rather than `0 / 5`.

## Out of Scope

- No `diep.io`-style in-run stat tree in this change.
- No new defend-the-ship mode.
- No new solar-system themes or enemy families as part of this pass.
