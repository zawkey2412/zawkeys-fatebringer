import { ROLL_CATEGORIES, SETTINGS_KEYS } from "../../core/const.js";
import { getCached, setCached } from "../../core/cache.js";

/**
 * Detect the roll category for a chat message.
 *
 * `midiActive` is passed in from the caller (cached once at module init) so
 * this function never reads game.modules on the hot path.
 *
 * Returns null when the roll should not trigger a table.
 */
export function detectRollCategory(message, roll, midiActive = false) {
  const rollType = message.flags?.dnd5e?.roll?.type;

  if (rollType === "save")                    return ROLL_CATEGORIES.SAVE;
  if (rollType === "skill" || rollType === "ability") return ROLL_CATEGORIES.ABILITY;

  if (rollType === "attack") {
    // When midi-qol is active it handles attack rolls via its own hook.
    if (midiActive) return null;
    const actor  = resolveActor(message);
    const item   = resolveItem(actor, message);
    return getCategory(item);
  }

  // Only use text fallback when there is no structured flag at all (very old
  // messages or non-dnd5e systems). Never used when rollType is present.
  if (!rollType) {
    const text = buildMessageText(message);
    if (text.includes("saving throw") || text.includes(" save "))
      return ROLL_CATEGORIES.SAVE;
    if (isAbilityCheck(text)) return ROLL_CATEGORIES.ABILITY;
  }

  // A roll whose first die is not a d20 is treated as a manual roll.
  if (roll.dice?.[0] && !roll.dice.find(d => d.faces === 20))
    return ROLL_CATEGORIES.MANUAL;

  return null;
}

/** Derive attack category from an item. */
export function getCategory(item) {
  if (!item) return ROLL_CATEGORIES.MELEE;
  if (item.type === "spell") return ROLL_CATEGORIES.SPELL;
  if (item.type === "weapon" && item.system?.properties?.has?.("amm"))
    return ROLL_CATEGORIES.RANGED;
  return mapActionType(item.system?.actionType ?? "mwak");
}

/**
 * Returns true for messages that should be skipped by the createChatMessage
 * handler — damage rolls always, attack rolls only when midi is active.
 *
 * IMPORTANT: only relies on the structured dnd5e flag, not text content.
 * Text-based heuristics produced false positives on e.g. "Fire Damage" spell names.
 */
export function isAttackOrDamageRoll(message, midiActive = false) {
  const rollType = message.flags?.dnd5e?.roll?.type;
  if (rollType === "damage") return true;
  if (rollType === "attack" && midiActive) return true;
  return false;
}

/** Whether a midi-qol workflow should trigger table processing. */
export function shouldTrigger(actor, options) {
  return actor && options.checkAttacks && (!options.playersOnly || actor.hasPlayerOwner);
}

/** Whether a roll detected via createChatMessage should trigger table processing. */
export function shouldTriggerForCategory(rollData, options) {
  const { category, actor } = rollData;
  if (options.playersOnly && (!actor || !actor.hasPlayerOwner)) return false;

  const categoryMap = {
    [ROLL_CATEGORIES.SAVE]:    options.checkSaves,
    [ROLL_CATEGORIES.ABILITY]: options.checkAbility,
    [ROLL_CATEGORIES.MANUAL]:  options.checkManualRolls,
    [ROLL_CATEGORIES.MELEE]:   options.checkAttacks,
    [ROLL_CATEGORIES.RANGED]:  options.checkAttacks,
    [ROLL_CATEGORIES.SPELL]:   options.checkAttacks,
  };

  return categoryMap[category] ?? false;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resolveActor(message) {
  return message.speaker?.actor
    ? game.actors.get(message.speaker.actor)
    : null;
}

function resolveItem(actor, message) {
  const itemId = message.flags?.dnd5e?.item?.id;
  return actor?.items?.get(itemId) ?? null;
}

function buildMessageText(message) {
  return `${message.content?.toLowerCase() ?? ""} ${message.flavor?.toLowerCase() ?? ""}`;
}

function isAbilityCheck(text) {
  const keywords = [
    "ability check", "skill check", "acrobatics", "athletics", "deception",
    "history", "insight", "intimidation", "investigation", "medicine", "nature",
    "perception", "performance", "persuasion", "religion", "sleight", "stealth",
    "survival", "arcana", "animal handling",
  ];
  return keywords.some(kw => text.includes(kw));
}

function mapActionType(actionType) {
  const map = {
    mwak: ROLL_CATEGORIES.MELEE,
    msak: ROLL_CATEGORIES.SPELL,
    rwak: ROLL_CATEGORIES.RANGED,
    rsak: ROLL_CATEGORIES.SPELL,
    save: ROLL_CATEGORIES.SPELL,
    heal: ROLL_CATEGORIES.SPELL,
    abil: ROLL_CATEGORIES.MANUAL,
    util: ROLL_CATEGORIES.MANUAL,
  };
  return map[actionType] ?? ROLL_CATEGORIES.MELEE;
}

/**
 * Fetch-and-cache the criticalTablesOptions setting.
 * Exported so critical-tables.js can prime it at init.
 */
export function getOptionsFromCache(moduleId) {
  const cacheKey = `options_${moduleId}`;
  let options = getCached(cacheKey);
  if (!options) {
    options = game.settings.get(moduleId, SETTINGS_KEYS.TABLES_OPTIONS);
    setCached(cacheKey, options, 60_000);
  }
  return options;
}
