/**
 * table-enhancements-config.js
 *
 * Per-result Active Effect + Macro editor for a given RollTable.
 * Opened from CriticalTablesConfig when the GM clicks "✏ Enhance"
 * next to a table UUID field.
 *
 * Data model stored in TABLE_ENHANCEMENTS setting:
 * {
 *   [tableUuid]: {
 *     [resultId]: {
 *       effects: [{ uuid, target, count }],
 *       macro:   "Macro.uuid"
 *     }
 *   }
 * }
 *
 * target values: "self" | "choose" | "all-players" | "all-tokens"
 */

import { MODULE_ID, SETTINGS_KEYS } from "../../core/const.js";

const { ApplicationV2 } = foundry.applications.api;

export class TableEnhancementsConfig extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    tag: "form",
    window: {
      title: "Table Result Enhancements",
      resizable: true,
    },
    position: { width: 720, height: 620 },
    actions: {
      addEffect:    TableEnhancementsConfig.prototype._onAddEffect,
      removeEffect: TableEnhancementsConfig.prototype._onRemoveEffect,
      save:         TableEnhancementsConfig.prototype._onSave,
    },
  };

  static PARTS = { form: {} };

  /**
   * @param {string} tableUuid   UUID of the RollTable to annotate
   * @param {string} [eventLabel] Human-readable label for the title bar
   */
  constructor(tableUuid, eventLabel = "") {
    super();
    this._tableUuid   = tableUuid;
    this._eventLabel  = eventLabel;
    this._table       = null;
    this._stateLoaded = false;
    // { [resultId]: { effects: [{uuid, target, count}], macro: "" } }
    this._state = {};
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  async _renderHTML(_context, _options) {
    if (!this._table) {
      try {
        const doc = await fromUuid(this._tableUuid);
        if (doc?.documentName === "RollTable") this._table = doc;
      } catch (err) {
        console.error(`${MODULE_ID} | TableEnhancementsConfig: failed to load table`, err);
      }
    }

    if (!this._table) {
      return {
        form: `
          <div class="fb-enhance-error">
            <p><strong>${game.i18n.localize("FATEBRINGER.TableEnhancements.LoadFailed")}</strong></p>
            <p><code>${this._tableUuid}</code></p>
          </div>`,
      };
    }

    // Load persisted enhancements once per open
    if (!this._stateLoaded) {
      const all      = game.settings.get(MODULE_ID, SETTINGS_KEYS.TABLE_ENHANCEMENTS);
      const existing = all[this._tableUuid] ?? {};
      for (const [id, data] of Object.entries(existing)) {
        this._state[id] = {
          effects: (data.effects ?? []).map(e => ({ ...e })),
          macro:   data.macro ?? "",
        };
      }
      this._stateLoaded = true;
    }

    const titleSuffix = this._eventLabel ? ` — ${this._eventLabel}` : "";
    const results     = Array.from(this._table.results ?? []);
    const resultRows  = results.map(r => this._buildResultBlock(r)).join("");

    return {
      form: `
        <div class="fb-enhancements-editor">
          <div class="fb-enhance-header">
            <h4 class="fb-enhance-title">
              <i class="fas fa-dice-d20"></i>
              ${this._table.name}${titleSuffix}
            </h4>
            <p class="fb-enhance-hint">
              For each result, add Active Effects or a Macro that fire automatically
              when that result is rolled.<br>
              <strong>Self</strong> — roller only ·
              <strong>Choose</strong> — opens a target picker ·
              <strong>All Players / All Tokens</strong> — everyone on the scene.
            </p>
          </div>

          <div class="fb-enhance-results-list scrollable">
            ${resultRows || `<p style="padding:10px;">${game.i18n.localize("FATEBRINGER.TableEnhancements.NoResults")}</p>`}
          </div>

          <div class="fb-enhance-footer">
            <button type="button" data-action="save" class="fb-btn fb-btn--primary">
              <i class="fas fa-save"></i> Save Enhancements
            </button>
          </div>
        </div>
      `,
    };
  }

  async _replaceHTML(result, content, _options) {
    content.innerHTML = result.form;
    // Single delegated listener on the root handles ALL live input changes
    this._bindLiveListeners(content);
  }

  // ---------------------------------------------------------------------------
  // HTML builders
  // ---------------------------------------------------------------------------

  _buildResultBlock(result) {
    const resultId = result.id;
    const enh      = this._state[resultId] ?? { effects: [], macro: "" };

    const lo    = result.range?.[0];
    const hi    = result.range?.[1];
    const range = (lo != null && hi != null)
      ? (lo === hi ? `${lo}` : `${lo}–${hi}`)
      : "?";
    const text  = result.text || result.getChatText?.() || "(no text)";

    const effectRows = (enh.effects ?? [])
      .map((eff, idx) => this._buildEffectRow(resultId, idx, eff))
      .join("");

    return `
      <div class="fb-enhance-result" data-result-id="${resultId}">
        <div class="fb-enhance-result-header">
          <span class="fb-enhance-range">${range}</span>
          <span class="fb-enhance-text">${text}</span>
        </div>

        <div class="fb-enhance-effects-list" data-result-id="${resultId}">
          ${effectRows}
        </div>

        <div class="fb-enhance-result-footer">
          <button type="button"
                  data-action="addEffect" data-result-id="${resultId}"
                  class="fb-btn fb-btn--add fb-btn--sm">
            <i class="fas fa-plus"></i>
            ${game.i18n.localize("FATEBRINGER.TableEnhancements.AddEffect")}
          </button>
          <div class="fb-macro-row">
            <label class="fb-macro-label">
              <i class="fas fa-scroll"></i>
              ${game.i18n.localize("FATEBRINGER.TableEnhancements.MacroLabel")}
            </label>
            <input type="text"
                   class="fb-input fb-macro-input"
                   data-result-id="${resultId}"
                   value="${enh.macro ?? ""}"
                   placeholder="Macro.uuid… (optional)">
          </div>
        </div>
      </div>
    `;
  }

  _buildEffectRow(resultId, idx, eff = {}) {
    const targetOpts = [
      { v: "self",        l: game.i18n.localize("FATEBRINGER.TableEnhancements.TargetSelf") },
      { v: "choose",      l: game.i18n.localize("FATEBRINGER.TableEnhancements.TargetChoose") },
      { v: "all-players", l: game.i18n.localize("FATEBRINGER.TableEnhancements.TargetAllPlayers") },
      { v: "all-tokens",  l: game.i18n.localize("FATEBRINGER.TableEnhancements.TargetAllTokens") },
    ].map(({ v, l }) =>
      `<option value="${v}" ${(eff.target ?? "self") === v ? "selected" : ""}>${l}</option>`
    ).join("");

    const showCount = (eff.target ?? "self") === "choose";

    return `
      <div class="fb-effect-row" data-result-id="${resultId}" data-effect-idx="${idx}">
        <input type="text"
               class="fb-input fb-effect-uuid"
               data-result-id="${resultId}" data-effect-idx="${idx}"
               value="${eff.uuid ?? ""}"
               placeholder="ActiveEffect UUID…">
        <select class="fb-select fb-effect-target"
                data-result-id="${resultId}" data-effect-idx="${idx}">
          ${targetOpts}
        </select>
        <input type="number"
               class="fb-input fb-effect-count"
               data-result-id="${resultId}" data-effect-idx="${idx}"
               min="1" value="${eff.count ?? 1}"
               title="Number of targets to choose"
               style="${showCount ? "" : "display:none;"}">
        <button type="button"
                data-action="removeEffect"
                data-result-id="${resultId}" data-effect-idx="${idx}"
                class="fb-btn fb-btn--danger fb-btn--icon fb-btn--sm"
                title="Remove this effect">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Live state synchronisation (delegated from root)
  // ---------------------------------------------------------------------------

  _bindLiveListeners(root) {
    root.addEventListener("change", e => {
      const el = e.target;

      if (el.classList.contains("fb-effect-uuid")) {
        const eff = this._getEff(el);
        if (eff) eff.uuid = el.value.trim();
      }

      if (el.classList.contains("fb-effect-target")) {
        const eff = this._getEff(el);
        if (eff) {
          eff.target = el.value;
          const row = el.closest(".fb-effect-row");
          const cnt = row?.querySelector(".fb-effect-count");
          if (cnt) cnt.style.display = eff.target === "choose" ? "" : "none";
        }
      }

      if (el.classList.contains("fb-effect-count")) {
        const eff = this._getEff(el);
        if (eff) eff.count = Math.max(1, parseInt(el.value) || 1);
      }

      if (el.classList.contains("fb-macro-input")) {
        this._ensureResult(el.dataset.resultId);
        this._state[el.dataset.resultId].macro = el.value.trim();
      }
    });
  }

  /** Read the effect object pointed to by data-result-id + data-effect-idx. */
  _getEff(el) {
    const { resultId, effectIdx } = el.dataset;
    this._ensureResult(resultId);
    return this._state[resultId].effects[+effectIdx] ?? null;
  }

  _ensureResult(resultId) {
    if (!this._state[resultId]) {
      this._state[resultId] = { effects: [], macro: "" };
    }
  }

  // ---------------------------------------------------------------------------
  // Action handlers
  // ---------------------------------------------------------------------------

  async _onAddEffect(_event, target) {
    const resultId = target.dataset.resultId;
    this._ensureResult(resultId);

    const effects = this._state[resultId].effects;
    const newIdx  = effects.length;
    const newEff  = { uuid: "", target: "self", count: 1 };
    effects.push(newEff);

    // Append row directly — no full re-render needed.
    // The root change-listener set up in _replaceHTML covers new children too.
    const container = this.element?.querySelector(
      `.fb-enhance-effects-list[data-result-id="${resultId}"]`
    );
    container?.insertAdjacentHTML("beforeend", this._buildEffectRow(resultId, newIdx, newEff));
  }

  async _onRemoveEffect(_event, target) {
    const { resultId, effectIdx } = target.dataset;
    this._ensureResult(resultId);

    this._state[resultId].effects.splice(+effectIdx, 1);

    // Re-render only this result's effects list to keep indices correct.
    const container = this.element?.querySelector(
      `.fb-enhance-effects-list[data-result-id="${resultId}"]`
    );
    if (container) {
      container.innerHTML = this._state[resultId].effects
        .map((eff, i) => this._buildEffectRow(resultId, i, eff))
        .join("");
    }
  }

  async _onSave() {
    // Strip results with no meaningful content
    const cleaned = {};
    for (const [resultId, data] of Object.entries(this._state)) {
      const validEffects = (data.effects ?? []).filter(e => e.uuid?.trim());
      const hasMacro     = !!(data.macro?.trim());
      if (validEffects.length > 0 || hasMacro) {
        cleaned[resultId] = {
          effects: validEffects,
          macro:   data.macro?.trim() ?? "",
        };
      }
    }

    const all = game.settings.get(MODULE_ID, SETTINGS_KEYS.TABLE_ENHANCEMENTS);
    all[this._tableUuid] = cleaned;
    await game.settings.set(MODULE_ID, SETTINGS_KEYS.TABLE_ENHANCEMENTS, all);

    const name = this._table?.name ?? this._tableUuid;
    ui.notifications.info(
      game.i18n.format("FATEBRINGER.TableEnhancements.SavedFor", { name })
    );
    this.close();
  }
}
