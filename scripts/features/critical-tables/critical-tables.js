/**
 * critical-tables.js — feature orchestrator
 *
 * Improvements over original:
 *  - midi-qol active state cached once at init (no per-call game.modules lookup)
 *  - processRoll lives here → static imports, no dynamic import / circular dep
 *  - processed-message dedup uses an in-memory Set (no DB write per roll)
 *  - options and shouldTrigger receive the options object (no hidden cache reads)
 */

import { MODULE_ID, SETTINGS_KEYS, FLAG_KEYS, DELAYS } from "../../core/const.js";
import {
  detectRollCategory,
  getCategory,
  isAttackOrDamageRoll,
  shouldTrigger,
  shouldTriggerForCategory,
  getOptionsFromCache,
} from "./roll-detection.js";
import { addTableButton, setupChatListeners, invalidateTableCache } from "./table-handler.js";
import {
  getUsedRoll,
  checkPermission,
  isCriticalHit,
  getCriticalThreshold,
} from "./roll-utils.js";

export { CriticalTablesConfig } from "./critical-tables-config.js";

// ---------------------------------------------------------------------------
// Module-level state (initialised once in initializeCriticalTables)
// ---------------------------------------------------------------------------

/** True when midi-qol is active — cached at init so every hook doesn't re-query. */
let _midiActive = false;

/**
 * In-memory set of message IDs already dispatched this session.
 * Replaces the old `setFlag("criticalTablesProcessed")` DB write used solely
 * to prevent double-processing within the same Foundry session.
 */
const _processedIds = new Set();

// ---------------------------------------------------------------------------
// Feature toggle guard
// ---------------------------------------------------------------------------

function isEnabled() {
  return game.settings.get(MODULE_ID, SETTINGS_KEYS.ENABLE_CRITS);
}

// ---------------------------------------------------------------------------
// processRoll — schedules addTableButton after a short debounce
// ---------------------------------------------------------------------------

/**
 * Gate on permission then schedule `addTableButton`.
 * Keeping this in the orchestrator lets table-handler.js and roll-utils.js
 * remain import-cycle-free.
 */
export function processRoll(rollData, message = null) {
  if (!checkPermission(rollData, game.user.id)) return;
  setTimeout(() => addTableButton(message, rollData), DELAYS.BUTTON_PROCESS);
}

// ---------------------------------------------------------------------------
// Midi-QOL path
// ---------------------------------------------------------------------------

function onMidiAttackComplete(workflow) {
  if (!isEnabled()) return;
  if (!workflow?.attackRoll && !workflow?.item) return;

  const options = getOptionsFromCache(MODULE_ID);
  if (!shouldTrigger(workflow.actor, options)) return;

  const isCrit   = !!workflow.isCritical;
  const isFumble = !!workflow.isFumble;
  if (!isCrit && !isFumble) return;

  const attackRoll  = workflow.attackRoll;
  const d20Die      = attackRoll?.dice?.find(d => d.faces === 20);
  const naturalRoll = d20Die
    ? getUsedRoll(d20Die, attackRoll)
    : isCrit ? getCriticalThreshold(workflow.actor, workflow.item) : 1;

  processRoll({
    actor:          workflow.actor,
    category:       getCategory(workflow.item),
    isCrit,
    isFumble,
    naturalRoll,
    speaker:        ChatMessage.getSpeaker({ actor: workflow.actor }),
    processedByMidi: true,
  }, null);
}

// ---------------------------------------------------------------------------
// Native dnd5e path (createChatMessage hook)
// ---------------------------------------------------------------------------

function onChatMessage(message) {
  if (!isEnabled()) return;

  // Skip messages created by this module (e.g. effect/table result cards)
  if (message.getFlag(MODULE_ID, FLAG_KEYS.PROCESSED_MIDI)) return;

  // In-memory dedup — replaces the old async setFlag call
  if (_processedIds.has(message.id)) return;

  // Skip damage rolls unconditionally; skip attack rolls when midi handles them
  if (isAttackOrDamageRoll(message, _midiActive)) return;

  const rollData = parseMessageRoll(message);
  if (!rollData) return;

  const options = getOptionsFromCache(MODULE_ID);
  if (!shouldTriggerForCategory(rollData, options)) return;
  if (!checkPermission(rollData, game.user.id)) return;

  // Cap the dedup set so it doesn't grow forever over a long session.
  if (_processedIds.size > 500) _processedIds.clear();
  _processedIds.add(message.id);
  processRoll(rollData, message);
}

// ---------------------------------------------------------------------------
// Roll data extraction
// ---------------------------------------------------------------------------

function parseMessageRoll(message) {
  const roll = message.rolls?.[0];
  if (!roll) return null;

  const category = detectRollCategory(message, roll, _midiActive);
  if (!category) return null;

  const isManual = category === "manual";
  const die = isManual
    ? roll.dice?.[0]
    : roll.dice?.find(d => d.faces === 20);
  if (!die?.results?.length) return null;

  const actor = message.speaker?.actor
    ? game.actors.get(message.speaker.actor)
    : null;
  const itemId = message.flags?.dnd5e?.item?.id;
  const item   = actor?.items?.get(itemId) ?? null;

  const naturalRoll = getUsedRoll(die, roll);

  const isCrit = isManual
    ? naturalRoll === die.faces
    : actor ? isCriticalHit(naturalRoll, actor, item) : naturalRoll === 20;
  const isFumble = naturalRoll === 1;

  if (!isCrit && !isFumble) return null;

  return {
    actor,
    item,
    category,
    isCrit,
    isFumble,
    naturalRoll,
    speaker: message.speaker,
    dieInfo: isManual ? { value: naturalRoll, faces: die.faces } : null,
  };
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

export function initializeCriticalTables() {
  _midiActive = !!game.modules.get("midi-qol")?.active;

  if (_midiActive) {
    Hooks.on("midi-qol.AttackRollComplete", onMidiAttackComplete);
  }
  Hooks.on("createChatMessage", onChatMessage);

  // Invalidate the per-table document cache whenever a table is edited,
  // so the next roll always reflects the current state.
  Hooks.on("updateRollTable", (table) => invalidateTableCache(table.uuid));

  setupChatListeners();
}
