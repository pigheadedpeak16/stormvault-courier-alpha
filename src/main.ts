import "./style.css";
import { GameController } from "./game/core/GameController";
import type { HudSnapshot, MenuScreen, PermanentUpgradeKey, SystemStatKey } from "./game/core/types";
import { createGame } from "./game/game";

const controller = new GameController();

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("App root not found.");
}

const tutorialStorageKey = "stormvault-hide-howto";
let tutorialDismissed = window.localStorage.getItem(tutorialStorageKey) === "1";

app.innerHTML = `
  <div class="shell">
    <div id="game-root" class="game-root"></div>
    <div class="hud">
      <section class="panel primary-panel">
        <div class="eyebrow" id="system-name">Cinder Wake</div>
        <div class="stat-row">
          <div>
            <span class="label">Hull</span>
            <strong id="hull-value">100</strong>
          </div>
        </div>
        <div class="meter"><div id="hull-bar" class="meter-fill hull-fill"></div></div>
      </section>

      <section id="debris-panel" class="panel debris-panel">
        <div class="panel-head">
          <div class="eyebrow">Debris Field</div>
          <strong id="timer-value" class="debris-time">300s</strong>
        </div>
        <div class="meter debris-meter"><div id="debris-bar" class="meter-fill debris-fill"></div></div>
        <p id="debris-warning" class="debris-warning">Field pressure rising.</p>
      </section>

      <section class="panel status-panel">
        <div class="eyebrow">Run Feed</div>
        <div class="headline" id="cargo-value">0 orbs</div>
        <p id="message-value" class="message">Harvest orb caches, bank them, and build enough quota to jump to the next system.</p>
        <div class="micro-grid">
          <div><span class="label">Orb Quota</span><strong id="fuel-bank">0 / 40 orbs</strong></div>
          <div><span class="label">System Runs</span><strong id="system-runs">0</strong></div>
          <div><span class="label">Scan Range</span><strong id="scan-range">280m</strong></div>
          <div><span class="label">Cruise Speed</span><strong id="cruise-speed">168</strong></div>
          <div><span class="label">Fire Rate</span><strong id="fire-rate">1.9/s</strong></div>
          <div><span class="label">Ships Left</span><strong id="ships-value">3</strong></div>
          <div><span class="label">Credits</span><strong id="credit-value">0</strong></div>
          <div><span class="label">Best Take</span><strong id="best-value">0</strong></div>
        </div>
      </section>

      <section id="harvest-panel" class="panel harvest-panel hidden">
        <div class="eyebrow">Harvest Link</div>
        <div class="harvest-topline">
          <strong id="harvest-label">Common deposit</strong>
          <span id="harvest-time">0.0s</span>
        </div>
        <div class="meter harvest-meter"><div id="harvest-bar" class="meter-fill harvest-fill"></div></div>
      </section>

      <section class="panel return-panel">
        <div class="eyebrow">Return Vector</div>
        <div class="return-row">
          <div class="return-arrow-wrap">
            <div id="return-arrow" class="return-arrow"></div>
          </div>
          <div>
            <div class="label">Extraction Ship</div>
            <strong id="return-distance">0m</strong>
          </div>
        </div>
      </section>

      <section id="controls-panel" class="panel controls-panel${tutorialDismissed ? " is-dismissed" : ""}">
        <div class="panel-head">
          <div class="eyebrow">How To Play</div>
          <button id="dismiss-tutorial" class="dismiss-button" type="button">OK</button>
        </div>
        <p class="controls-copy">1. Move with <span>WASD</span>. 2. Aim with the <span>mouse</span> and shoot with <span>left click</span> or <span>J</span>. 3. Spend combat points live with <span>1-7</span> from the bottom-left build panel. 4. Press <span>E</span> on an orb cache and watch the <span>Harvest Link</span> meter finish. 5. Keep clear of the right-to-left <span>debris field</span> as it intensifies, then dock with the courier ship and press <span>E</span> to deliver your orbs. 6. You have <span>3 ships</span>; each loss burns one, and losing all three resets the fleet.</p>
      </section>

      <section class="panel system-stats-panel">
        <div class="panel-head">
          <div class="eyebrow">System Build</div>
          <strong id="system-points" class="points-badge">x0</strong>
        </div>
        <div id="system-stat-list" class="system-stat-list"></div>
      </section>

      <section id="mobile-system-panel" class="panel mobile-system-panel hidden">
        <div class="panel-head">
          <div class="eyebrow">System Build</div>
          <strong id="mobile-system-points" class="points-badge">x0</strong>
        </div>
        <div id="mobile-system-stat-list" class="system-stat-list"></div>
      </section>
    </div>

    <section id="overlay" class="overlay hidden">
      <div class="overlay-card">
        <div class="eyebrow">Contract Bay</div>
        <h1 id="overlay-title">Run Secured</h1>
        <p id="overlay-subtitle">Deliver more orbs, buy upgrades, and breach again.</p>
        <div class="summary-grid">
          <div><span class="label">Orbs Delivered</span><strong id="overlay-cargo">0</strong></div>
          <div><span class="label">Payout</span><strong id="overlay-payout">0</strong></div>
          <div><span class="label">Insurance</span><strong id="overlay-insurance">0</strong></div>
          <div><span class="label">Available Credits</span><strong id="overlay-credits">0</strong></div>
        </div>
        <div id="upgrade-list" class="upgrade-list"></div>
        <button id="launch-button" class="launch-button">Launch Next Run</button>
      </div>
    </section>

      <section id="class-overlay" class="overlay hidden">
        <div class="overlay-card class-card">
          <div class="eyebrow">Class Upgrade</div>
        <h1 id="class-title">Choose Next Chassis</h1>
        <p id="class-subtitle">Select the next branch for this solar system build.</p>
        <div id="class-options" class="class-options"></div>
        <button id="class-continue" class="launch-button">Continue Run</button>
        </div>
      </section>

      <section id="menu-overlay" class="overlay menu-overlay hidden">
        <div class="overlay-card menu-card">
          <div class="menu-header">
            <div>
              <div class="eyebrow" id="menu-eyebrow">Stormvault Runner</div>
              <h1 id="menu-title">Open Contract</h1>
              <p id="menu-subtitle">Chart a route, review the threat board, and launch when you are ready.</p>
            </div>
            <button id="menu-back" class="menu-back hidden" type="button">Back</button>
          </div>
          <div id="menu-content" class="menu-content"></div>
        </div>
      </section>

      <div class="touch-bar">
        <button id="mobile-build-toggle" type="button">Build</button>
        <button data-action="scanPressed">Scan</button>
      <button data-action="interactPressed">Harvest</button>
      <button data-action="shootHeld" data-hold="true">Fire</button>
    </div>
  </div>
`;

createGame("game-root", controller);

const els = {
  shell: document.querySelector<HTMLElement>(".shell")!,
  hullValue: document.querySelector<HTMLElement>("#hull-value")!,
  systemName: document.querySelector<HTMLElement>("#system-name")!,
  timerValue: document.querySelector<HTMLElement>("#timer-value")!,
  hullBar: document.querySelector<HTMLElement>("#hull-bar")!,
  debrisPanel: document.querySelector<HTMLElement>("#debris-panel")!,
  cargoValue: document.querySelector<HTMLElement>("#cargo-value")!,
  messageValue: document.querySelector<HTMLElement>("#message-value")!,
  fuelBank: document.querySelector<HTMLElement>("#fuel-bank")!,
  systemRuns: document.querySelector<HTMLElement>("#system-runs")!,
  scanRange: document.querySelector<HTMLElement>("#scan-range")!,
  cruiseSpeed: document.querySelector<HTMLElement>("#cruise-speed")!,
  fireRate: document.querySelector<HTMLElement>("#fire-rate")!,
  shipsValue: document.querySelector<HTMLElement>("#ships-value")!,
  debrisBar: document.querySelector<HTMLElement>("#debris-bar")!,
  debrisWarning: document.querySelector<HTMLElement>("#debris-warning")!,
  creditValue: document.querySelector<HTMLElement>("#credit-value")!,
  bestValue: document.querySelector<HTMLElement>("#best-value")!,
  returnArrow: document.querySelector<HTMLElement>("#return-arrow")!,
  returnDistance: document.querySelector<HTMLElement>("#return-distance")!,
  controlsPanel: document.querySelector<HTMLElement>("#controls-panel")!,
  dismissTutorial: document.querySelector<HTMLButtonElement>("#dismiss-tutorial")!,
  systemPoints: document.querySelector<HTMLElement>("#system-points")!,
  systemStatList: document.querySelector<HTMLElement>("#system-stat-list")!,
  mobileSystemPanel: document.querySelector<HTMLElement>("#mobile-system-panel")!,
  mobileSystemPoints: document.querySelector<HTMLElement>("#mobile-system-points")!,
  mobileSystemStatList: document.querySelector<HTMLElement>("#mobile-system-stat-list")!,
  mobileBuildToggle: document.querySelector<HTMLButtonElement>("#mobile-build-toggle")!,
  harvestPanel: document.querySelector<HTMLElement>("#harvest-panel")!,
  harvestLabel: document.querySelector<HTMLElement>("#harvest-label")!,
  harvestTime: document.querySelector<HTMLElement>("#harvest-time")!,
  harvestBar: document.querySelector<HTMLElement>("#harvest-bar")!,
  overlay: document.querySelector<HTMLElement>("#overlay")!,
  overlayTitle: document.querySelector<HTMLElement>("#overlay-title")!,
  overlaySubtitle: document.querySelector<HTMLElement>("#overlay-subtitle")!,
  overlayCargo: document.querySelector<HTMLElement>("#overlay-cargo")!,
  overlayPayout: document.querySelector<HTMLElement>("#overlay-payout")!,
  overlayInsurance: document.querySelector<HTMLElement>("#overlay-insurance")!,
  overlayCredits: document.querySelector<HTMLElement>("#overlay-credits")!,
  upgradeList: document.querySelector<HTMLElement>("#upgrade-list")!,
  launchButton: document.querySelector<HTMLButtonElement>("#launch-button")!,
  classOverlay: document.querySelector<HTMLElement>("#class-overlay")!,
  classTitle: document.querySelector<HTMLElement>("#class-title")!,
  classSubtitle: document.querySelector<HTMLElement>("#class-subtitle")!,
  classOptions: document.querySelector<HTMLElement>("#class-options")!,
  classContinue: document.querySelector<HTMLButtonElement>("#class-continue")!,
  menuOverlay: document.querySelector<HTMLElement>("#menu-overlay")!,
  menuEyebrow: document.querySelector<HTMLElement>("#menu-eyebrow")!,
  menuTitle: document.querySelector<HTMLElement>("#menu-title")!,
  menuSubtitle: document.querySelector<HTMLElement>("#menu-subtitle")!,
  menuBack: document.querySelector<HTMLButtonElement>("#menu-back")!,
  menuContent: document.querySelector<HTMLElement>("#menu-content")!
};

let mobileSystemPanelOpen = false;

function getClassPreviewFamily(classId: string): "twinframe" | "longshot" | "drone" | "bulwark" | "courier" {
  if (["Twinframe", "Splitfire", "Gatling", "Broadside", "Vulcan"].includes(classId)) {
    return "twinframe";
  }
  if (["Longshot", "Railcaster", "Missile Rack", "Beam Lancer", "Siege Boat"].includes(classId)) {
    return "longshot";
  }
  if (["Drone Bay", "Overseer", "Swarm Carrier", "Command Core", "Hive Carrier"].includes(classId)) {
    return "drone";
  }
  if (["Bulwark", "Trapper", "Ramship", "Fortress", "Juggernaut"].includes(classId)) {
    return "bulwark";
  }
  return "courier";
}

function getClassPreviewMarkup(classId: string): string {
  const family = getClassPreviewFamily(classId);

  if (family === "twinframe") {
    return `
      <div class="class-preview class-preview--twinframe">
        <div class="preview-stage preview-stage--twinframe">
          <div class="preview-ship preview-ship--twinframe">
            <span class="preview-cannon preview-cannon--left"></span>
            <span class="preview-cannon preview-cannon--right"></span>
            <span class="preview-core"></span>
          </div>
          <span class="preview-projectile preview-projectile--twin preview-projectile--left"></span>
          <span class="preview-projectile preview-projectile--twin preview-projectile--right"></span>
        </div>
        <div class="preview-caption">Parallel dual cannons</div>
      </div>
    `;
  }

  if (family === "longshot") {
    return `
      <div class="class-preview class-preview--longshot">
        <div class="preview-stage preview-stage--longshot">
          <div class="preview-ship preview-ship--longshot">
            <span class="preview-barrel preview-barrel--long"></span>
            <span class="preview-core"></span>
          </div>
          <span class="preview-projectile preview-projectile--heavy"></span>
        </div>
        <div class="preview-caption">Heavy long-range shell</div>
      </div>
    `;
  }

  if (family === "drone") {
    return `
      <div class="class-preview class-preview--drone">
        <div class="preview-stage preview-stage--drone">
          <div class="preview-ship preview-ship--drone">
            <span class="preview-bay"></span>
            <span class="preview-core"></span>
          </div>
          <span class="preview-drone"></span>
          <span class="preview-target"></span>
        </div>
        <div class="preview-caption">Crash drone control</div>
      </div>
    `;
  }

  if (family === "bulwark") {
    return `
      <div class="class-preview class-preview--bulwark">
        <div class="preview-stage preview-stage--bulwark">
          <div class="preview-impact-ring"></div>
          <div class="preview-ship preview-ship--bulwark">
            <span class="preview-barrel preview-barrel--stub"></span>
            <span class="preview-core"></span>
          </div>
          <span class="preview-projectile preview-projectile--weak"></span>
        </div>
        <div class="preview-caption">Heavy ram, weak gun</div>
      </div>
    `;
  }

  return `
    <div class="class-preview class-preview--courier">
      <div class="preview-stage">
        <div class="preview-ship preview-ship--courier">
          <span class="preview-barrel preview-barrel--stub"></span>
          <span class="preview-core"></span>
        </div>
      </div>
      <div class="preview-caption">Balanced courier frame</div>
    </div>
  `;
}

function getEnemyPreviewMarkup(
  enemy: {
    kind: string;
    name: string;
    accent: string;
  }
): string {
  const initials = enemy.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return `
    <div class="enemy-preview enemy-preview--${enemy.kind}" style="--enemy-accent: ${enemy.accent}">
      <div class="enemy-preview-stage">
        <span class="enemy-preview-ring"></span>
        <span class="enemy-preview-core">${initials}</span>
        <span class="enemy-preview-wing enemy-preview-wing--left"></span>
        <span class="enemy-preview-wing enemy-preview-wing--right"></span>
      </div>
    </div>
  `;
}

function syncTutorialVisibility(): void {
  els.controlsPanel.classList.toggle("is-dismissed", tutorialDismissed);
}

function fireTouchAction(action: string, held = false): void {
  window.dispatchEvent(new CustomEvent("stormvault-action", { detail: { action, held } }));
}

for (const button of document.querySelectorAll<HTMLButtonElement>(".touch-bar button")) {
  const action = button.dataset.action;
  const isHold = button.dataset.hold === "true";
  if (!action) {
    continue;
  }
  if (isHold) {
    button.addEventListener("pointerdown", () => fireTouchAction(action, true));
    button.addEventListener("pointerup", () => fireTouchAction(action, false));
    button.addEventListener("pointerleave", () => fireTouchAction(action, false));
    button.addEventListener("pointercancel", () => fireTouchAction(action, false));
  } else {
    button.addEventListener("click", () => fireTouchAction(action));
  }
}

els.launchButton.addEventListener("click", () => {
  controller.startNextRun();
});

els.dismissTutorial.addEventListener("click", () => {
  tutorialDismissed = true;
  window.localStorage.setItem(tutorialStorageKey, "1");
  syncTutorialVisibility();
});

els.classContinue.addEventListener("click", () => {
  controller.dismissClassBranch();
  render(controller.getSnapshot());
});

els.mobileBuildToggle.addEventListener("click", () => {
  mobileSystemPanelOpen = !mobileSystemPanelOpen;
  render(controller.getSnapshot());
});

function renderUpgradeButtons(snapshot: HudSnapshot): void {
  if (!snapshot.summary) {
    els.upgradeList.innerHTML = "";
    return;
  }

  els.upgradeList.innerHTML = "";
  for (const offer of snapshot.upgradeOffers) {
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.disabled = !offer.affordable;
    button.innerHTML = `
      <div class="upgrade-topline">
        <strong>${offer.label}</strong>
        <span>Lv ${offer.level}</span>
      </div>
      <p>${offer.description}</p>
      <div class="upgrade-bottomline">
        <span>${offer.cost} credits</span>
        <span>${offer.affordable ? "Available" : "Need more credits"}</span>
      </div>
    `;
    button.addEventListener("click", () => {
      const purchased = controller.purchaseUpgrade(offer.key as PermanentUpgradeKey);
      if (purchased) {
        render(controller.getSnapshot());
      }
    });
    els.upgradeList.appendChild(button);
  }
}

function renderSystemStatButtons(snapshot: HudSnapshot): void {
  els.systemPoints.textContent = `x${snapshot.availableSystemPoints}`;
  els.systemStatList.innerHTML = "";
  els.mobileSystemPoints.textContent = `x${snapshot.availableSystemPoints}`;
  els.mobileSystemStatList.innerHTML = "";

  const mobileShouldShow =
    mobileSystemPanelOpen &&
    !snapshot.summary &&
    snapshot.menu.screen === "hidden" &&
    snapshot.classBranchPrompt === null;
  els.mobileSystemPanel.classList.toggle("hidden", !mobileShouldShow);
  els.mobileBuildToggle.classList.toggle("active", mobileShouldShow);
  els.mobileBuildToggle.textContent = mobileShouldShow ? "Close Build" : "Build";

  for (const offer of snapshot.systemStatOffers) {
    const createStatButton = (): HTMLButtonElement => {
      const button = document.createElement("button");
      button.className = "system-stat-button";
      button.disabled = snapshot.availableSystemPoints <= 0 || snapshot.classBranchPrompt !== null;
      button.innerHTML = `
        <span>${offer.label} [${offer.hotkey}]</span>
        <strong>Lv ${offer.level}</strong>
      `;
      button.addEventListener("click", () => {
        const purchased = controller.spendSystemPoint(offer.key as SystemStatKey);
        if (purchased) {
          render(controller.getSnapshot());
        }
      });
      return button;
    };

    els.systemStatList.appendChild(createStatButton());
    els.mobileSystemStatList.appendChild(createStatButton());
  }
}

function renderClassPrompt(snapshot: HudSnapshot): void {
  const prompt = snapshot.classBranchPrompt;
  if (!prompt) {
    els.classOverlay.classList.add("hidden");
    return;
  }

  els.classOverlay.classList.remove("hidden");
  els.classTitle.textContent = `Choose Tier ${prompt.tier} Upgrade`;
  els.classSubtitle.textContent = `Current chassis: ${snapshot.meta.systemBuild.currentClass}`;
  els.classOptions.innerHTML = "";
  const hasUnlockedOption = prompt.options.some((option) => !option.locked);
  els.classContinue.disabled = hasUnlockedOption;
  els.classContinue.textContent = hasUnlockedOption ? "Choose a Class to Continue" : "Continue Run";

  for (const option of prompt.options) {
    const button = document.createElement("button");
    button.className = "upgrade-card class-option-card";
    button.disabled = option.locked;
    button.innerHTML = `
      <div class="class-option-layout">
        ${getClassPreviewMarkup(option.id)}
        <div class="class-option-copy">
          <div class="upgrade-topline">
            <strong>${option.label}</strong>
            <span>${option.locked ? "Locked" : "Available"}</span>
          </div>
          <p>${option.description}</p>
          <div class="upgrade-bottomline">
            <span>${option.locked ? option.lockedReason ?? "" : "Select to continue the run"}</span>
          </div>
        </div>
      </div>
    `;
    button.addEventListener("click", () => {
      if (!option.locked && controller.chooseClassBranch(option.id)) {
        render(controller.getSnapshot());
      }
    });
    els.classOptions.appendChild(button);
  }
}

function bindMenuActions(): void {
  for (const button of els.menuContent.querySelectorAll<HTMLButtonElement>("[data-menu-screen]")) {
    button.addEventListener("click", () => {
      controller.openMenu(button.dataset.menuScreen as MenuScreen);
    });
  }

  for (const button of els.menuContent.querySelectorAll<HTMLButtonElement>("[data-menu-start='true']")) {
    button.addEventListener("click", () => {
      controller.startGameFromMenu();
    });
  }
}

function renderMenu(snapshot: HudSnapshot): void {
  const { menu } = snapshot;
  const menuVisible = menu.screen !== "hidden";

  els.shell.classList.toggle("menu-active", menuVisible);
  els.menuOverlay.classList.toggle("hidden", !menuVisible);
  if (!menuVisible) {
    els.menuContent.innerHTML = "";
    return;
  }

  els.menuBack.classList.toggle("hidden", menu.screen === "title");
  els.menuBack.onclick = menu.screen === "title" ? null : () => controller.openMenu("title");

  if (menu.screen === "title") {
    els.menuEyebrow.textContent = "Stormvault Runner";
    els.menuTitle.textContent = "Open Contract";
    els.menuSubtitle.textContent = "Pick your route before the fleet drops into the current system.";
    els.menuContent.innerHTML = `
      <div class="menu-hero">
        <div class="menu-hero-copy">
          <div class="menu-kicker">Current Route</div>
          <strong>${snapshot.systemTheme.name}</strong>
          <p>Recover orb caches, stay ahead of the debris wall, and bank enough quota to breach into the next solar system.</p>
        </div>
        <div class="menu-hero-accent" style="--menu-accent: ${snapshot.systemTheme.accent}">
          <span></span>
        </div>
      </div>
      <div class="menu-grid">
        <button class="menu-tile menu-tile--primary" data-menu-start="true" type="button">
          <span class="menu-tile-label">Play</span>
          <strong>Launch Run</strong>
          <p>Drop into ${snapshot.systemTheme.name} and start the contract.</p>
        </button>
        <button class="menu-tile" data-menu-screen="codex-enemies" type="button">
          <span class="menu-tile-label">Codex</span>
          <strong>Enemy Board</strong>
          <p>Review every hostile silhouette and its combat role.</p>
        </button>
        <button class="menu-tile" data-menu-screen="codex-systems" type="button">
          <span class="menu-tile-label">Solar Systems</span>
          <strong>Route Browser</strong>
          <p>Browse all known systems, accents, and enemy rotations.</p>
        </button>
        <button class="menu-tile menu-tile--disabled" data-menu-screen="tier3" type="button">
          <span class="menu-tile-label">Tier 3</span>
          <strong>Coming Soon</strong>
          <p>Reserved for the next layer of progression, not playable yet.</p>
        </button>
      </div>
    `;
    bindMenuActions();
    return;
  }

  if (menu.screen === "codex-enemies") {
    els.menuEyebrow.textContent = "Codex";
    els.menuTitle.textContent = "Enemy Board";
    els.menuSubtitle.textContent = "Threat previews for every hostile currently in the route pool.";
    els.menuContent.innerHTML = `
      <div class="codex-grid">
        ${menu.enemies
          .map(
            (enemy) => `
              <article class="codex-card">
                ${getEnemyPreviewMarkup(enemy)}
                <div class="codex-copy">
                  <strong>${enemy.name}</strong>
                  <p>${enemy.description}</p>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
    bindMenuActions();
    return;
  }

  if (menu.screen === "codex-systems") {
    els.menuEyebrow.textContent = "Solar Systems";
    els.menuTitle.textContent = "Route Browser";
    els.menuSubtitle.textContent = "Known systems, their tone palettes, and the enemy order you will meet there.";
    els.menuContent.innerHTML = `
      <div class="systems-grid">
        ${menu.solarSystems
          .map(
            (system) => `
              <article class="system-card" style="--system-accent: ${system.theme.accent}; --system-top: ${system.theme.bgTop}; --system-bottom: ${system.theme.bgBottom}">
                <div class="system-card-top">
                  <div>
                    <div class="menu-kicker">Solar System</div>
                    <strong>${system.name}</strong>
                  </div>
                  <span class="system-accent-chip">${system.theme.accent}</span>
                </div>
                <p class="system-theme-copy">Theme accent and enemy lane progression for this route.</p>
                <div class="system-enemy-list">
                  ${system.enemies
                    .map(
                      (enemyName, index) => `
                        <div class="system-enemy-row">
                          <span>Wave ${index + 1}</span>
                          <strong>${enemyName}</strong>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
    bindMenuActions();
    return;
  }

  els.menuEyebrow.textContent = "Tier 3";
  els.menuTitle.textContent = "Coming Soon";
  els.menuSubtitle.textContent = "The next progression tier is reserved, but gameplay is intentionally not wired yet.";
  els.menuContent.innerHTML = `
    <div class="coming-soon-card">
      <div class="menu-kicker">Hold Position</div>
      <strong>Tier 3 progression is not part of this task.</strong>
      <p>The slot stays on the title menu so the route board feels complete, but it only acts as a placeholder for now.</p>
      <button class="menu-inline-button" data-menu-screen="title" type="button">Return to Title</button>
    </div>
  `;
  bindMenuActions();
}

function render(snapshot: HudSnapshot): void {
  const { run, summary } = snapshot;
  const rootStyle = document.documentElement.style;
  const hullRatio = run.player.maxHull === 0 ? 0 : run.player.hull / run.player.maxHull;
  const debrisRatio = Math.max(0, Math.min(1, run.timeLeft / run.duration));
  const debrisCritical = run.timeLeft <= 20;

  rootStyle.setProperty("--bg-top", snapshot.systemTheme.bgTop);
  rootStyle.setProperty("--bg-bottom", snapshot.systemTheme.bgBottom);
  rootStyle.setProperty("--bg-panel", snapshot.systemTheme.panel);
  rootStyle.setProperty("--line", snapshot.systemTheme.line);
  rootStyle.setProperty("--storm", snapshot.systemTheme.storm);
  rootStyle.setProperty("--danger", snapshot.systemTheme.danger);
  rootStyle.setProperty("--gold", snapshot.systemTheme.gold);

  if ((snapshot.summary || snapshot.menu.screen !== "hidden" || snapshot.classBranchPrompt !== null) && mobileSystemPanelOpen) {
    mobileSystemPanelOpen = false;
  }

  els.systemName.textContent = snapshot.systemTheme.name;
  els.hullValue.textContent = `${Math.ceil(run.player.hull)} / ${run.player.maxHull}`;
  els.timerValue.textContent = run.timeLeft > 0 ? `${Math.ceil(run.timeLeft)}s` : "0s";
  els.hullBar.style.width = `${Math.max(0, hullRatio * 100)}%`;
  els.debrisBar.style.width = `${debrisRatio * 100}%`;
  els.debrisPanel.classList.toggle("critical", debrisCritical);
  els.debrisWarning.textContent =
    run.timeLeft <= 0
      ? "!! DEBRIS SURGE ACTIVE !! Dock is still open, but visibility is collapsing."
      : debrisCritical
        ? `!! CAUTION !! ${Math.ceil(run.timeLeft)} seconds until the debris wall arrives.`
        : "Field pressure rising.";
  els.cargoValue.textContent = `${run.player.cargo} orbs  |  ${run.player.cargoValue} credits in hold`;
  els.messageValue.textContent = run.message;
  els.fuelBank.textContent = `${snapshot.meta.deliveredOrbs} / ${snapshot.systemOrbTarget} orbs`;
  els.systemRuns.textContent = `${snapshot.meta.runsInSystem}`;
  els.scanRange.textContent = `${Math.round(snapshot.scanRange)}m`;
  els.cruiseSpeed.textContent = `${Math.round(snapshot.cruiseSpeed)}`;
  els.fireRate.textContent = `${snapshot.fireRate.toFixed(1)}/s`;
  els.shipsValue.textContent = `${snapshot.meta.shipsRemaining}`;
  els.creditValue.textContent = `${snapshot.meta.credits}`;
  els.bestValue.textContent = `${snapshot.meta.bestTake}`;

  const dx = run.extraction.x - run.player.x;
  const dy = run.extraction.y - run.player.y;
  const returnDistance = Math.hypot(dx, dy);
  const returnAngle = Math.atan2(dy, dx) + Math.PI / 2;
  els.returnArrow.style.transform = `rotate(${returnAngle}rad)`;
  els.returnDistance.textContent = `${Math.round(returnDistance)}m`;

  if (snapshot.harvestProgress !== null && snapshot.harvestRemaining !== null && snapshot.harvestLabel) {
    els.harvestPanel.classList.remove("hidden");
    els.harvestLabel.textContent = snapshot.harvestLabel;
    els.harvestTime.textContent = `${snapshot.harvestRemaining.toFixed(1)}s`;
    els.harvestBar.style.width = `${Math.max(0, Math.min(100, snapshot.harvestProgress * 100))}%`;
  } else {
    els.harvestPanel.classList.add("hidden");
    els.harvestBar.style.width = "0%";
  }

  if (summary) {
    els.overlay.classList.remove("hidden");
    els.overlayTitle.textContent = summary.title;
    els.overlaySubtitle.textContent = `${summary.subtitle}${summary.nextSystemName ? ` Next jump: ${summary.nextSystemName}.` : ""} Ships left: ${summary.shipsRemaining}.`;
    els.overlayCargo.textContent = `${summary.extractedOrbs}`;
    els.overlayPayout.textContent = `${summary.payout}`;
    els.overlayInsurance.textContent = `${summary.insurance}`;
    els.overlayCredits.textContent = `${snapshot.meta.credits}`;
    els.launchButton.textContent = summary.fullReset ? "Rebuild Fleet" : "Launch Next Run";
  } else {
    els.overlay.classList.add("hidden");
    els.launchButton.textContent = "Launch Next Run";
  }

  renderUpgradeButtons(snapshot);
  renderSystemStatButtons(snapshot);
  renderClassPrompt(snapshot);
  renderMenu(snapshot);
}

render(controller.getSnapshot());
syncTutorialVisibility();
controller.subscribe(() => render(controller.getSnapshot()));

window.addEventListener("keydown", (event) => {
  const statHotkeys: Record<string, SystemStatKey> = {
    "1": "healthRegen",
    "2": "maxHealth",
    "3": "bodyDamage",
    "4": "bulletSpeed",
    "5": "bulletPenetration",
    "6": "bulletDamage",
    "7": "reload"
  };

  const target = statHotkeys[event.key];
  if (!target) {
    return;
  }

  if (controller.spendSystemPoint(target)) {
    event.preventDefault();
    render(controller.getSnapshot());
  }
});
