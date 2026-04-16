import { MODULE_ID, SETTINGS_KEYS } from "../../core/const.js";
import { BaseConfigForm } from "../../ui/base-config.js";
import { createFormContainer } from "../../ui/form-utils.js";
import { TableEnhancementsConfig } from "./table-enhancements-config.js";

// ---------------------------------------------------------------------------
// Event type definitions
// ---------------------------------------------------------------------------

const EVENT_TYPES = [
  { key: "melee",   label: "Melee Attack",     critLabel: "Critical Hit",     fumbleLabel: "Fumble"           },
  { key: "ranged",  label: "Ranged Attack",     critLabel: "Critical Hit",     fumbleLabel: "Fumble"           },
  { key: "spell",   label: "Spell Attack",      critLabel: "Critical Hit",     fumbleLabel: "Fumble"           },
  { key: "ability", label: "Ability Check",     critLabel: "Critical Success", fumbleLabel: "Critical Failure" },
  { key: "save",    label: "Saving Throw",      critLabel: "Critical Success", fumbleLabel: "Critical Failure" },
  { key: "manual",  label: "Manual Dice Roll",  critLabel: "Maximum Roll",     fumbleLabel: "Minimum Roll"     },
];

const OPTION_DEFS = [
  { key: "playersOnly",      label: "Players Only",             hint: "Only trigger tables for player-owned actors (NPCs are ignored)." },
  { key: "checkAttacks",     label: "Check Attack Rolls",       hint: "Trigger on natural 1s and critical hits for attack rolls (melee, ranged, spell)." },
  { key: "checkSaves",       label: "Check Saving Throws",      hint: "Trigger on natural 1s and 20s for saving throws." },
  { key: "checkAbility",     label: "Check Ability Checks",     hint: "Trigger on natural 1s and 20s for ability checks and skill checks." },
  { key: "checkManualRolls", label: "Check Manual Dice Rolls",  hint: "Trigger on minimum/maximum values for non-d20 dice rolls." },
  { key: "fastForward",      label: "Fast Forward Tables",      hint: "Automatically roll configured tables instead of presenting a click button." },
];

// ---------------------------------------------------------------------------
// CriticalTablesConfig — ApplicationV2 form
// ---------------------------------------------------------------------------

export class CriticalTablesConfig extends BaseConfigForm {
  static DEFAULT_OPTIONS = {
    ...BaseConfigForm.DEFAULT_OPTIONS,
    id: "critical-tables-config",
    window: {
      title: "Critical Tables Configuration",
      resizable: true,
    },
    position: { width: 820, height: 700 },
    actions: {
      save:    CriticalTablesConfig.prototype._onSave,
      enhance: CriticalTablesConfig.prototype._onEnhance,
    },
  };

  constructor() {
    super();
    this.emptySlotCount = 0;
  }

  _prepareHTML() {
    const tablesConfig      = game.settings.get(MODULE_ID, SETTINGS_KEYS.TABLES_CONFIG);
    const allEnhancements   = game.settings.get(MODULE_ID, SETTINGS_KEYS.TABLE_ENHANCEMENTS);
    const options           = game.settings.get(MODULE_ID, SETTINGS_KEYS.TABLES_OPTIONS);

    /** Returns true when the given table UUID has at least one saved enhancement. */
    const hasEnhancements = (uuid) => {
      if (!uuid) return false;
      const tableEnh = allEnhancements[uuid];
      if (!tableEnh) return false;
      return Object.values(tableEnh).some(r =>
        (r.effects?.length > 0) || r.macro
      );
    };

    let html = "";

    // ── Trigger Options ────────────────────────────────────────────────────
    html += `
      <h4 style="margin: 0 0 8px;">Trigger Options</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 18px;">
    `;
    OPTION_DEFS.forEach(({ key, label, hint }) => {
      html += `
        <div style="padding: 4px 0;">
          <label style="display: flex; align-items: flex-start; gap: 6px; cursor: pointer;">
            <input type="checkbox" name="opt_${key}" ${options[key] ? "checked" : ""}
                   style="margin-top: 2px; flex-shrink: 0;">
            <span>
              <strong>${label}</strong>
              <br><span style="font-size: 11px;">${hint}</span>
            </span>
          </label>
        </div>
      `;
    });
    html += `</div>`;

    // ── Event Configuration ────────────────────────────────────────────────
    html += `
      <h4 style="margin: 0 0 4px;">Roll Tables</h4>
      <p style="font-size: 11px; margin: 0 0 12px;">
        Assign a Roll Table UUID for each event type.
        Click <strong>✏ Enhance</strong> after entering a UUID to configure per-result
        Active Effects and Macros for that table.
      </p>
    `;

    EVENT_TYPES.forEach(({ key, label, critLabel, fumbleLabel }) => {
      const critKey   = `${key}Crit`;
      const fumbleKey = `${key}Fumble`;
      const critUuid  = tablesConfig[critKey]   || "";
      const fumbleUuid= tablesConfig[fumbleKey]  || "";
      const CRIT_COLOR   = "#4CAF50";
      const FUMBLE_COLOR = "#f72525";

      const enhanceBtnHtml = (evKey, uuid, color) => {
        const enhanced  = hasEnhancements(uuid);
        const btnClass  = enhanced ? "fb-enhance-btn fb-enhance-btn--active" : "fb-enhance-btn";
        const btnLabel  = enhanced ? "✓ Enhanced" : "✏ Enhance";
        return `
          <button type="button"
                  data-action="enhance"
                  data-event-key="${evKey}"
                  class="${btnClass}"
                  style="border-color:${color}; ${enhanced ? `background:${color}22;` : ""}"
                  title="Configure per-result effects for this table">
            ${btnLabel}
          </button>`;
      };

      html += `
        <fieldset style="border: 1px solid #c0c0c0; border-radius: 4px; padding: 8px 12px; margin-bottom: 12px;">
          <legend style="font-weight: bold; padding: 0 4px;">${label}</legend>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">

            <!-- CRIT column -->
            <div>
              <div style="font-size: 12px; font-weight: bold; color: ${CRIT_COLOR}; margin-bottom: 4px;">
                𖤍 ${critLabel}
              </div>
              <label style="font-size: 11px; color: #555;">Roll Table UUID</label>
              <div style="display: flex; gap: 4px; margin-bottom: 2px;">
                <input type="text" name="table_${critKey}"
                       value="${critUuid}"
                       placeholder="Paste RollTable UUID…"
                       style="flex: 1; font-size: 11px;">
                ${enhanceBtnHtml(critKey, critUuid, CRIT_COLOR)}
              </div>
            </div>

            <!-- FUMBLE column -->
            <div>
              <div style="font-size: 12px; font-weight: bold; color: ${FUMBLE_COLOR}; margin-bottom: 4px;">
                ⛧ ${fumbleLabel}
              </div>
              <label style="font-size: 11px; color: #555;">Roll Table UUID</label>
              <div style="display: flex; gap: 4px; margin-bottom: 2px;">
                <input type="text" name="table_${fumbleKey}"
                       value="${fumbleUuid}"
                       placeholder="Paste RollTable UUID…"
                       style="flex: 1; font-size: 11px;">
                ${enhanceBtnHtml(fumbleKey, fumbleUuid, FUMBLE_COLOR)}
              </div>
            </div>

          </div>
        </fieldset>
      `;
    });

    return createFormContainer(
      "Critical Tables Configuration",
      "",
      html,
      `<div style="display: flex; width: 99%; justify-content: flex-end;">
        <button type="button" data-action="save" class="save-btn">
          <i class="fas fa-save"></i> Save Configuration
        </button>
      </div>`,
    );
  }

  // Not used for add-more — return a selector that never matches
  _getInputSelector() {
    return ".__no_empty_slots__";
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async _onSave(_event, target) {
    const form     = target.closest("form");
    const formData = new FormData(form);

    // ── Options ──────────────────────────────────────────────────────────────
    const options = {};
    OPTION_DEFS.forEach(({ key }) => {
      options[key] = formData.has(`opt_${key}`);
    });

    // ── Tables ────────────────────────────────────────────────────────────────
    const tablesConfig = {};
    const validations  = [];

    EVENT_TYPES.forEach(({ key }) => {
      for (const evKey of [`${key}Crit`, `${key}Fumble`]) {
        const rawTable = formData.get(`table_${evKey}`)?.trim() || "";
        validations.push(
          _validateTableUuid(rawTable, evKey).then(resolved => {
            tablesConfig[evKey] = resolved;
          }),
        );
      }
    });

    await Promise.all(validations);

    await game.settings.set(MODULE_ID, SETTINGS_KEYS.TABLES_OPTIONS, options);
    await game.settings.set(MODULE_ID, SETTINGS_KEYS.TABLES_CONFIG,  tablesConfig);

    ui.notifications.info("Zawkey's Fatebringer: Critical Tables configuration saved.");
    this.close();
  }

  // ---------------------------------------------------------------------------
  // Open the enhancement editor for a specific event key
  // ---------------------------------------------------------------------------

  async _onEnhance(_event, target) {
    const form      = target.closest("form");
    const eventKey  = target.dataset.eventKey;
    const tableInput = form.querySelector(`[name="table_${eventKey}"]`);
    const tableUuid  = tableInput?.value?.trim();

    if (!tableUuid) {
      ui.notifications.warn(game.i18n.localize("FATEBRINGER.CriticalTables.EnhanceNoUuid"));
      return;
    }

    let doc;
    try {
      doc = await fromUuid(tableUuid);
    } catch {
      doc = null;
    }

    if (doc?.documentName !== "RollTable") {
      ui.notifications.warn(game.i18n.localize("FATEBRINGER.CriticalTables.EnhanceInvalidTable"));
      return;
    }

    // Build a human-readable label for the enhancement editor title bar
    const evType  = EVENT_TYPES.find(et =>
      `${et.key}Crit` === eventKey || `${et.key}Fumble` === eventKey
    );
    const isCrit  = eventKey.endsWith("Crit");
    const evLabel = evType
      ? `${evType.label} — ${isCrit ? evType.critLabel : evType.fumbleLabel}`
      : eventKey;

    new TableEnhancementsConfig(tableUuid, evLabel).render(true);
  }
}

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

async function _validateTableUuid(uuid, label) {
  if (!uuid) return "";
  try {
    const doc = await fromUuid(uuid);
    if (doc?.documentName === "RollTable") return uuid;
    ui.notifications.warn(`Zawkey's Fatebringer: "${label}" table UUID is not a RollTable — cleared.`);
    return "";
  } catch {
    ui.notifications.warn(`Zawkey's Fatebringer: Could not resolve table UUID for "${label}" — cleared.`);
    return "";
  }
}
