import "./style.css";
import { GameController } from "./game/core/GameController";
import type { HudSnapshot, UpgradeKey } from "./game/core/types";
import { createGame } from "./game/game";

const controller = new GameController();

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("App root not found.");
}

app.innerHTML = `
  <div class="shell">
    <div id="game-root" class="game-root"></div>
    <div class="hud">
      <section class="panel primary-panel">
        <div class="eyebrow">Stormvault Courier</div>
        <div class="stat-row">
          <div>
            <span class="label">Hull</span>
            <strong id="hull-value">100</strong>
          </div>
          <div>
            <span class="label">Heat</span>
            <strong id="heat-value">0%</strong>
          </div>
          <div>
            <span class="label">Storm</span>
            <strong id="timer-value">135s</strong>
          </div>
        </div>
        <div class="meter"><div id="hull-bar" class="meter-fill hull-fill"></div></div>
        <div class="meter"><div id="heat-bar" class="meter-fill heat-fill"></div></div>
      </section>

      <section class="panel status-panel">
        <div class="eyebrow">Run Feed</div>
        <div class="headline" id="cargo-value">0 / 16 cargo</div>
        <p id="message-value" class="message">Scan wrecks, secure cargo, and extract before the vault collapses.</p>
        <div class="micro-grid">
          <div><span class="label">Scan Range</span><strong id="scan-range">280m</strong></div>
          <div><span class="label">Boost</span><strong id="boost-speed">282</strong></div>
          <div><span class="label">Fire Rate</span><strong id="fire-rate">1.9/s</strong></div>
          <div><span class="label">Overdrive</span><strong id="overdrive-value">Offline</strong></div>
          <div><span class="label">Credits</span><strong id="credit-value">0</strong></div>
          <div><span class="label">Best Take</span><strong id="best-value">0</strong></div>
        </div>
      </section>

      <section id="harvest-panel" class="panel harvest-panel hidden">
        <div class="eyebrow">Harvest Link</div>
        <div class="harvest-topline">
          <strong id="harvest-label">Common cache</strong>
          <span id="harvest-time">0.0s</span>
        </div>
        <div class="meter harvest-meter"><div id="harvest-bar" class="meter-fill harvest-fill"></div></div>
      </section>

      <section class="panel controls-panel">
        <div class="eyebrow">How To Play</div>
        <p class="controls-copy">1. Move to a revealed cache and press <span>E</span> to start pulling materials. 2. Watch the <span>Harvest Link</span> meter until it finishes. 3. Scan with <span>Space</span>, shoot with <span>J</span> or left click, and pulse with <span>F</span>. 4. Fly into the docked <span>courier ship</span> and press <span>E</span> to bank your cargo.</p>
      </section>
    </div>

    <section id="overlay" class="overlay hidden">
      <div class="overlay-card">
        <div class="eyebrow">Contract Bay</div>
        <h1 id="overlay-title">Run Secured</h1>
        <p id="overlay-subtitle">Bank the haul, upgrade the skiff, and breach again.</p>
        <div class="summary-grid">
          <div><span class="label">Cargo Value</span><strong id="overlay-cargo">0</strong></div>
          <div><span class="label">Payout</span><strong id="overlay-payout">0</strong></div>
          <div><span class="label">Insurance</span><strong id="overlay-insurance">0</strong></div>
          <div><span class="label">Available Credits</span><strong id="overlay-credits">0</strong></div>
        </div>
        <div id="upgrade-list" class="upgrade-list"></div>
        <button id="launch-button" class="launch-button">Launch Next Run</button>
      </div>
    </section>

    <div class="touch-bar">
      <button data-action="scanPressed">Scan</button>
      <button data-action="empPressed">Pulse</button>
      <button data-action="interactPressed">Harvest</button>
      <button data-action="shootHeld" data-hold="true">Fire</button>
      <button data-action="boostHeld" data-hold="true">Boost</button>
    </div>
  </div>
`;

createGame("game-root", controller);

const els = {
  hullValue: document.querySelector<HTMLElement>("#hull-value")!,
  heatValue: document.querySelector<HTMLElement>("#heat-value")!,
  timerValue: document.querySelector<HTMLElement>("#timer-value")!,
  hullBar: document.querySelector<HTMLElement>("#hull-bar")!,
  heatBar: document.querySelector<HTMLElement>("#heat-bar")!,
  cargoValue: document.querySelector<HTMLElement>("#cargo-value")!,
  messageValue: document.querySelector<HTMLElement>("#message-value")!,
  scanRange: document.querySelector<HTMLElement>("#scan-range")!,
  boostSpeed: document.querySelector<HTMLElement>("#boost-speed")!,
  fireRate: document.querySelector<HTMLElement>("#fire-rate")!,
  overdriveValue: document.querySelector<HTMLElement>("#overdrive-value")!,
  creditValue: document.querySelector<HTMLElement>("#credit-value")!,
  bestValue: document.querySelector<HTMLElement>("#best-value")!,
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
  launchButton: document.querySelector<HTMLButtonElement>("#launch-button")!
};

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
      const purchased = controller.purchaseUpgrade(offer.key as UpgradeKey);
      if (purchased) {
        render(controller.getSnapshot());
      }
    });
    els.upgradeList.appendChild(button);
  }
}

function render(snapshot: HudSnapshot): void {
  const { run, summary } = snapshot;
  const hullRatio = run.player.maxHull === 0 ? 0 : run.player.hull / run.player.maxHull;
  const heatRatio = run.player.heat / 100;

  els.hullValue.textContent = `${Math.ceil(run.player.hull)} / ${run.player.maxHull}`;
  els.heatValue.textContent = `${Math.round(run.player.heat)}%`;
  els.timerValue.textContent = `${Math.ceil(run.timeLeft)}s`;
  els.hullBar.style.width = `${Math.max(0, hullRatio * 100)}%`;
  els.heatBar.style.width = `${Math.max(0, heatRatio * 100)}%`;
  els.cargoValue.textContent = `${run.player.cargo} / ${snapshot.cargoCapacity} cargo  |  ${run.player.cargoValue} credits stowed`;
  els.messageValue.textContent = run.message;
  els.scanRange.textContent = `${Math.round(snapshot.scanRange)}m`;
  els.boostSpeed.textContent = `${Math.round(snapshot.boostSpeed)}`;
  els.fireRate.textContent = `${snapshot.fireRate.toFixed(1)}/s`;
  els.overdriveValue.textContent = run.player.overdriveTimer > 0 ? `${run.player.overdriveTimer.toFixed(1)}s` : "Offline";
  els.creditValue.textContent = `${snapshot.meta.credits}`;
  els.bestValue.textContent = `${snapshot.meta.bestTake}`;

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
    els.overlaySubtitle.textContent = summary.subtitle;
    els.overlayCargo.textContent = `${summary.cargoValue}`;
    els.overlayPayout.textContent = `${summary.payout}`;
    els.overlayInsurance.textContent = `${summary.insurance}`;
    els.overlayCredits.textContent = `${snapshot.meta.credits}`;
  } else {
    els.overlay.classList.add("hidden");
  }

  renderUpgradeButtons(snapshot);
}

render(controller.getSnapshot());
controller.subscribe(() => render(controller.getSnapshot()));
