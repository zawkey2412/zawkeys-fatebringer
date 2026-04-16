/**
 * table-handler.js
 *
 * Orchestrates roll table execution and per-result enhancement dispatch.
 *
 * Enhancement flow:
 *   1. A table is rolled (auto or button click).
 *   2. The result's ID is looked up in TABLE_ENHANCEMENTS[tableUuid].
 *   3. For each configured effect, targets are resolved (self / choose / all-* ).
 *   4. Effects are applied silently; applied actor names are collected.
 *   5. The result chat card is built with an "effects applied to X, Y" footer.
 */

import { MODULE_ID, FLAG_KEYS, SETTINGS_KEYS } from "../../core/const.js";
import { getColors, createStyledCard, sanitizeText } from "../../core/utils.js";
import { showDiceAnimation } from "./dice-utils.js";
import { checkButtonPermission } from "./roll-utils.js";
import { getCachedOrSet, deleteCached } from "../../core/cache.js";
import { TargetSelectorDialog } from "./target-selector.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function addTableButton(message, rollData) {
  const tablesConfig = game.settings.get(MODULE_ID, SETTINGS_KEYS.TABLES_CONFIG);
  const options      = game.settings.get(MODULE_ID, SETTINGS_KEYS.TABLES_OPTIONS);

  const eventKey  = `${rollData.category}${rollData.isCrit ? "Crit" : "Fumble"}`;
  const tableUuid = tablesConfig[eventKey] || "";

  if (!tableUuid) return;

  try {
    await _handleRollTable(tableUuid, message, rollData, options);
  } catch (err) {
    console.error(`${MODULE_ID} | Error processing "${eventKey}":`, err);
  }
}

export function setupChatListeners() {
  document.addEventListener("click", async (event) => {
    // ── Roll button ─────────────────────────────────────────────────────────
    const btn = event.target?.closest(".fb-roll-btn");
    if (btn) {
      event.preventDefault();
      event.stopPropagation();

      const messageEl = btn.closest("[data-message-id]");
      const messageId = messageEl?.dataset?.messageId;
      const message   = messageId ? game.messages.get(messageId) : null;
      if (!message) return;

      const rollData = _parseRollDataFromMessage(message);
      if (rollData && !checkButtonPermission(rollData, game.user.id)) {
        ui.notifications.warn(
          rollData.actor
            ? game.i18n.localize("FATEBRINGER.Errors.OwnerOnly")
            : game.i18n.localize("FATEBRINGER.Errors.PermissionDenied")
        );
        return;
      }

      const tableUuid = btn.dataset.tableUuid;
      if (!tableUuid) {
        ui.notifications.error(game.i18n.localize("FATEBRINGER.CriticalTables.NoTable"));
        return;
      }

      try {
        const table = await _getTableFromCache(tableUuid);
        if (table?.documentName === "RollTable") {
          await _rollTableAndUpdate(table, btn, message, tableUuid, rollData);
        } else {
          ui.notifications.error(game.i18n.localize("FATEBRINGER.CriticalTables.InvalidTable"));
        }
      } catch {
        ui.notifications.error(game.i18n.localize("FATEBRINGER.CriticalTables.RollFailed"));
      }
      return;
    }

    // ── Remove-effects button ────────────────────────────────────────────────
    const removeBtn = event.target?.closest(".fb-remove-effects-btn");
    if (removeBtn) {
      event.preventDefault();
      if (!game.user.isGM) {
        ui.notifications.warn(game.i18n.localize("FATEBRINGER.Errors.PermissionDenied"));
        return;
      }

      const messageEl = removeBtn.closest("[data-message-id]");
      const message   = game.messages.get(messageEl?.dataset?.messageId);
      if (!message) return;

      const appliedEffects = message.getFlag(MODULE_ID, FLAG_KEYS.APPLIED_EFFECTS) ?? [];
      let removed = 0;
      for (const { actorId, id: effectId } of appliedEffects) {
        const actor = game.actors.get(actorId);
        if (!actor) continue;
        if (actor.effects.get(effectId)) {
          await actor.deleteEmbeddedDocuments("ActiveEffect", [effectId]);
          removed++;
        }
      }

      await message.unsetFlag(MODULE_ID, FLAG_KEYS.APPLIED_EFFECTS);
      removeBtn.disabled = true;
      removeBtn.innerHTML = `<i class="fas fa-check"></i> ${game.i18n.localize("FATEBRINGER.CriticalTables.EffectsRemoved")}`;
      if (removed > 0) {
        ui.notifications.info(
          game.i18n.format("FATEBRINGER.CriticalTables.EffectsRemovedCount", { count: removed })
        );
      }
    }
  });
}

/** Exported so critical-tables.js can hook updateRollTable for cache invalidation. */
export function invalidateTableCache(tableUuid) {
  deleteCached(`table_${tableUuid}`);
}

// ---------------------------------------------------------------------------
// Roll Table handling
// ---------------------------------------------------------------------------

async function _handleRollTable(tableUuid, message, rollData, options) {
  try {
    const table = await _getTableFromCache(tableUuid);
    if (table?.documentName !== "RollTable") return;

    const colors = getColors(rollData.isCrit);
    const title  = _buildTitle(rollData);
    const isCrit = rollData.isCrit;

    if (options.fastForward) {
      const result    = await table.roll();
      await showDiceAnimation(result.roll);

      const resultId  = result.results?.[0]?.id ?? null;
      const appliedTo = await _executeEnhancements(tableUuid, resultId, rollData);

      await ChatMessage.create({
        content: _buildResultContent(title, colors, result, appliedTo),
        speaker: rollData.speaker,
        flags: {
          [MODULE_ID]: {
            [FLAG_KEYS.PROCESSED_MIDI]:  rollData.processedByMidi,
            [FLAG_KEYS.IS_CRIT]:         isCrit,
            [FLAG_KEYS.APPLIED_EFFECTS]: appliedTo,
          },
        },
      });
    } else {
      await ChatMessage.create({
        content: _buildButtonContent(title, colors, tableUuid, table.name, isCrit),
        speaker: rollData.speaker,
        flags: {
          [MODULE_ID]: {
            [FLAG_KEYS.PROCESSED_MIDI]: rollData.processedByMidi,
            [FLAG_KEYS.IS_CRIT]:        isCrit,
          },
        },
      });
    }
  } catch (err) {
    console.error(`${MODULE_ID} | Failed processing table:`, err);
  }
}

async function _rollTableAndUpdate(table, btn, message, tableUuid, rollData) {
  try {
    btn.disabled = true;
    btn.classList.add("fb-roll-btn--rolling");
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${game.i18n.localize("FATEBRINGER.CriticalTables.Rolling")}`;

    const result    = await table.roll();
    await showDiceAnimation(result.roll);

    btn.textContent = "✓ Rolled!";

    const resultId  = result.results?.[0]?.id ?? null;
    const appliedTo = await _executeEnhancements(tableUuid, resultId, rollData);

    const colors     = getColors(rollData.isCrit);
    const titleMatch = message.content.match(/<h4[^>]*>([^<]*)<\/h4>/);
    const title      = sanitizeText(titleMatch?.[1] ?? "Roll Result");

    await message.update({
      content: _buildResultContent(title, colors, result, appliedTo),
      flags: {
        [MODULE_ID]: {
          [FLAG_KEYS.APPLIED_EFFECTS]: appliedTo,
        },
      },
    });
  } catch (err) {
    console.error(`${MODULE_ID} | Table roll failed:`, err);
    ui.notifications.error(game.i18n.localize("FATEBRINGER.CriticalTables.RollFailed"));
    btn.disabled = false;
    btn.classList.remove("fb-roll-btn--rolling");
    btn.innerHTML = `<i class="fas fa-dice"></i> Roll ${table.name ?? "Table"}`;
  }
}

// ---------------------------------------------------------------------------
// Enhancement execution
// ---------------------------------------------------------------------------

/**
 * Look up per-result enhancements and execute them.
 * Returns an array of { id, actorId, name } for each successfully applied effect.
 *
 * @param {string}      tableUuid
 * @param {string|null} resultId   — the TableResult document ID
 * @param {object}      rollData   — { actor, speaker, isCrit, ... }
 * @returns {Promise<Array<{id: string, actorId: string, name: string}>>}
 */
async function _executeEnhancements(tableUuid, resultId, rollData) {
  if (!resultId) return [];

  const all = game.settings.get(MODULE_ID, SETTINGS_KEYS.TABLE_ENHANCEMENTS);
  const resultEnh = all?.[tableUuid]?.[resultId];
  if (!resultEnh) return [];

  const { effects = [], macro = "" } = resultEnh;
  const appliedTo = [];

  for (const effectConfig of effects) {
    if (!effectConfig.uuid?.trim()) continue;

    // Resolve the effect name for the target picker label.
    let effectName = "the effect";
    try {
      const preview = await fromUuid(effectConfig.uuid.trim());
      if (preview?.name) effectName = preview.name;
    } catch { /* name stays generic */ }

    const targets = await _resolveTargets(effectConfig, rollData, effectName);
    for (const actor of targets) {
      const result = await _applyEffectToActor(actor, effectConfig.uuid, effectConfig.duration ?? 0);
      if (result) appliedTo.push(result);
    }
  }

  if (macro?.trim()) {
    try {
      const macroDoc = await fromUuid(macro.trim());
      if (macroDoc?.documentName === "Macro") {
        await macroDoc.execute({ actor: rollData.actor, rollData });
      }
    } catch (err) {
      console.warn(`${MODULE_ID} | Macro execution failed:`, err);
    }
  }

  return appliedTo;
}

/**
 * Resolve which actors an effect should be applied to, based on target mode.
 *
 * @param {{ target: string, count?: number }} effectConfig
 * @param {object} rollData
 * @param {string} effectName  Human-readable name for the target picker
 * @returns {Promise<Actor[]>}
 */
async function _resolveTargets(effectConfig, rollData, effectName = "the effect") {
  switch (effectConfig.target) {
    case "self":
      return rollData.actor ? [rollData.actor] : [];

    case "all-players":
      return game.actors.filter(a => a.hasPlayerOwner);

    case "all-tokens": {
      const scene = canvas?.scene;
      if (!scene) return game.actors.filter(a => a.hasPlayerOwner);
      const seen = new Set();
      return Array.from(scene.tokens)
        .map(t => t.actor)
        .filter(a => {
          if (!a || seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
    }

    case "choose": {
      try {
        return await TargetSelectorDialog.prompt({
          maxTargets: effectConfig.count ?? Infinity,
          effectName,
        });
      } catch {
        return [];
      }
    }

    default:
      return rollData.actor ? [rollData.actor] : [];
  }
}

/**
 * Apply a single ActiveEffect (by UUID) to an actor, without posting a chat card.
 *
 * @param {Actor}  actor
 * @param {string} effectUuid
 * @param {number} [duration=0]  Rounds to apply (0 = permanent)
 * @returns {Promise<{id: string, actorId: string, name: string}|null>}
 */
async function _applyEffectToActor(actor, effectUuid, duration = 0) {
  try {
    const effectDoc = await fromUuid(effectUuid);
    if (!effectDoc || effectDoc.documentName !== "ActiveEffect") {
      console.warn(`${MODULE_ID} | UUID "${effectUuid}" is not an ActiveEffect — skipped.`);
      return null;
    }

    const data = effectDoc.toObject();

    // Guard: don't stack the same effect on an actor that already has it.
    const originKey = `Module.${MODULE_ID}.${effectUuid}`;
    if (actor.effects.some(e => e.origin === originKey)) {
      console.log(`${MODULE_ID} | "${actor.name}" already has "${data.name}" — skipped duplicate.`);
      return null;
    }

    delete data._id;
    data.transfer = false;
    data.disabled = false;
    data.origin   = originKey;

    if (duration > 0) {
      data.duration = {
        rounds:     duration,
        startRound: game.combat?.round ?? 0,
        startTime:  game.time?.worldTime ?? 0,
      };
    }

    const [created] = await actor.createEmbeddedDocuments("ActiveEffect", [data]);
    return { id: created.id, actorId: actor.id, name: actor.name };
  } catch (err) {
    console.error(`${MODULE_ID} | Failed applying effect to "${actor.name}":`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Content builders
// ---------------------------------------------------------------------------

function _buildResultContent(title, colors, result, appliedTo = []) {
  const rolledValue = result.total ?? result.roll?.total ?? 0;
  const resultText  = result.results
    .map(r => r.text || r.getChatText?.() || "")
    .filter(Boolean)
    .join(", ");

  const names = appliedTo.map(e => e?.name ?? e).filter(Boolean);

  const appliedSection = names.length > 0
    ? `<div class="fb-applied-effects">
         <i class="fas fa-magic"></i>
         ${game.i18n.localize("FATEBRINGER.CriticalTables.EffectApplied")}:
         <strong>${names.join(", ")}</strong>
         <button type="button" class="fb-remove-effects-btn fb-btn fb-btn--sm fb-btn--danger"
                 title="${game.i18n.localize("FATEBRINGER.CriticalTables.RemoveEffects")}">
           <i class="fas fa-times-circle"></i>
           ${game.i18n.localize("FATEBRINGER.CriticalTables.RemoveEffects")}
         </button>
       </div>`
    : "";

  const inner = `
    <div class="fb-card-body">
      <p class="fb-label"><strong>Rolled</strong></p>
      <h4 class="fb-rolled-value" style="color:${colors.border};">${rolledValue}</h4>
      <p class="fb-label"><strong>Effect</strong></p>
      <div class="fb-result-text">${resultText}</div>
      ${appliedSection}
    </div>`;

  return createStyledCard(title, colors, inner);
}

function _buildButtonContent(title, colors, tableUuid, tableName, _isCrit) {
  const inner = `
    <div class="fb-card-body fb-card-body--centered">
      <button class="fb-roll-btn" data-table-uuid="${tableUuid}"
              style="background:${colors.border};">
        <i class="fas fa-dice"></i> Roll ${tableName}
      </button>
    </div>`;

  return createStyledCard(title, colors, inner);
}

// ---------------------------------------------------------------------------
// Title builder
// ---------------------------------------------------------------------------

function _buildTitle(rollData) {
  const name = rollData.speaker?.alias ?? "Someone";

  if (rollData.category === "manual" && rollData.dieInfo) {
    return `${name} rolled ${rollData.dieInfo.value} on a d${rollData.dieInfo.faces}!`;
  }

  const typeLabel = {
    save:    "saving throw",
    ability: "ability check",
    melee:   "melee attack",
    ranged:  "ranged attack",
    spell:   "spell attack",
    manual:  "manual roll",
  }[rollData.category] ?? "roll";

  const isAbilitySave = rollData.category === "save" || rollData.category === "ability";
  const action = isAbilitySave
    ? (rollData.isCrit ? "critically succeeded on" : "critically failed")
    : (rollData.isCrit ? "critically hit" : "fumbled");
  const prep = isAbilitySave ? "" : "with";

  return `${name} ${action} ${prep} ${typeLabel}!`.replace(/\s{2,}/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

async function _getTableFromCache(tableUuid) {
  return getCachedOrSet(`table_${tableUuid}`, async () => {
    const doc = await fromUuid(tableUuid);
    return doc?.documentName === "RollTable" ? doc : null;
  });
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

/** Reconstruct the minimal rollData needed by the button-click path. */
function _parseRollDataFromMessage(message) {
  const actor  = message.speaker?.actor
    ? game.actors.get(message.speaker.actor)
    : null;
  const isCrit = !!message.getFlag(MODULE_ID, FLAG_KEYS.IS_CRIT);
  return { actor, speaker: message.speaker, isCrit };
}
