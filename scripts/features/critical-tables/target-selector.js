/**
 * target-selector.js
 *
 * Modal dialog for selecting target actors when a table result enhancement
 * has target mode "choose". Returns a Promise<Actor[]>.
 *
 * Usage:
 *   const actors = await TargetSelectorDialog.prompt({ maxTargets: 2, effectName: "Blessed" });
 */

const { ApplicationV2 } = foundry.applications.api;

export class TargetSelectorDialog extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    tag: "form",
    window: {
      title: "FATEBRINGER.TargetSelector.Title",
      resizable: false,
    },
    position: { width: 380, height: 500 },
    modal: true,
    actions: {
      confirm: TargetSelectorDialog.prototype._onConfirm,
      cancel:  TargetSelectorDialog.prototype._onCancel,
    },
  };

  static PARTS = { form: {} };

  constructor(options = {}) {
    super(options);
    this._maxTargets = Number.isFinite(options.maxTargets) ? options.maxTargets : Infinity;
    this._effectName = options.effectName ?? "the effect";
    this._resolve    = null;
  }

  // ---------------------------------------------------------------------------
  // Static factory
  // ---------------------------------------------------------------------------

  /**
   * Open the dialog and return a Promise<Actor[]>.
   * Resolves with [] if the user cancels or closes without confirming.
   *
   * @param {object} [opts]
   * @param {number} [opts.maxTargets]
   * @param {string} [opts.effectName]  Human-readable effect name shown in the hint
   * @returns {Promise<Actor[]>}
   */
  static prompt({ maxTargets = Infinity, effectName = "the effect" } = {}) {
    return new Promise(resolve => {
      const dialog = new TargetSelectorDialog({ maxTargets, effectName });
      dialog._resolve = resolve;
      dialog.render(true);
    });
  }

  // ---------------------------------------------------------------------------
  // Candidate collection
  // ---------------------------------------------------------------------------

  _buildCandidates() {
    const scene = canvas?.scene;
    const seen  = new Set();
    const out   = [];

    if (scene) {
      for (const token of scene.tokens) {
        const actor = token.actor;
        if (actor && !seen.has(actor.id)) {
          seen.add(actor.id);
          out.push(actor);
        }
      }
    }

    // Fallback when no active scene — use all player-owned actors
    if (out.length === 0) {
      for (const actor of game.actors) {
        if (actor.hasPlayerOwner && !seen.has(actor.id)) {
          seen.add(actor.id);
          out.push(actor);
        }
      }
    }

    return out;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  async _renderHTML(_context, _options) {
    const candidates = this._buildCandidates();
    const maxLabel   = Number.isFinite(this._maxTargets)
      ? `Choose up to ${this._maxTargets} target${this._maxTargets !== 1 ? "s" : ""}`
      : "Choose targets";

    const rows = candidates.map(actor => `
      <label class="fb-target-row">
        <input type="checkbox" class="fb-target-check" value="${actor.id}">
        <img  class="fb-target-img"
              src="${actor.img ?? "icons/svg/mystery-man.svg"}"
              alt="${actor.name}"
              onerror="this.src='icons/svg/mystery-man.svg'">
        <span class="fb-target-name">${actor.name}</span>
      </label>
    `).join("");

    return {
      form: `
        <div class="fb-target-selector">
          <p class="fb-target-hint">
            <strong>${maxLabel}</strong> to receive <em>${this._effectName}</em>.
          </p>
          <div class="fb-target-list">
            ${rows || `<p class="fb-target-empty">${game.i18n.localize("FATEBRINGER.TargetSelector.NoActors")}</p>`}
          </div>
          <div class="fb-target-footer">
            <span class="fb-target-count">0 selected</span>
            <div class="fb-target-actions">
              <button type="button" data-action="cancel"  class="fb-btn">
                ${game.i18n.localize("FATEBRINGER.TargetSelector.Cancel")}
              </button>
              <button type="button" data-action="confirm" class="fb-btn fb-btn--primary">
                <i class="fas fa-check"></i>
                ${game.i18n.localize("FATEBRINGER.TargetSelector.Confirm")}
              </button>
            </div>
          </div>
        </div>
      `,
    };
  }

  async _replaceHTML(result, content, _options) {
    content.innerHTML = result.form;
    this._bindCheckboxEvents(content);
  }

  // ---------------------------------------------------------------------------
  // Checkbox behaviour — enforce max targets
  // ---------------------------------------------------------------------------

  _bindCheckboxEvents(root) {
    const maxTargets = this._maxTargets;
    const countEl   = root.querySelector(".fb-target-count");

    root.querySelectorAll(".fb-target-check").forEach(cb => {
      cb.addEventListener("change", () => {
        const checked = root.querySelectorAll(".fb-target-check:checked");
        const count   = checked.length;
        countEl.textContent = `${count} selected`;

        if (Number.isFinite(maxTargets) && count >= maxTargets) {
          root.querySelectorAll(".fb-target-check:not(:checked)").forEach(u => {
            u.disabled = true;
          });
        } else {
          root.querySelectorAll(".fb-target-check").forEach(u => {
            u.disabled = false;
          });
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  _getSelectedActors() {
    const checked = this.element?.querySelectorAll(".fb-target-check:checked") ?? [];
    return Array.from(checked)
      .map(cb => game.actors.get(cb.value))
      .filter(Boolean);
  }

  async _onConfirm() {
    const selected = this._getSelectedActors();
    this._resolve?.(selected);
    this._resolve = null;
    this.close();
  }

  async _onCancel() {
    this._resolve?.([]);
    this._resolve = null;
    this.close();
  }

  async close(options = {}) {
    // Resolve with [] if the user closes the window without confirming
    if (this._resolve) {
      this._resolve([]);
      this._resolve = null;
    }
    return super.close(options);
  }
}
