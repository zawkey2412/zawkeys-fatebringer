/**
 * roll-utils.js — pure, side-effect-free utility functions.
 *
 * No imports from table-handler.js (eliminates the old circular dependency
 * that forced a dynamic import for processRoll). Call-site scheduling
 * (`processRoll`) now lives in critical-tables.js which can statically import
 * both this module and table-handler.js without creating a cycle.
 *
 * Note: `CONST` referenced below is Foundry's global constant object,
 * not something imported from our module.
 */

// ---------------------------------------------------------------------------
// Die result helpers
// ---------------------------------------------------------------------------

/**
 * Return the effective d20 result, honouring advantage / disadvantage.
 * Advantage → highest die; disadvantage → lowest die.
 */
export function getUsedRoll(die, roll) {
  if (die.results.length === 1) return die.results[0].result;
  const results = die.results.map(r => r.result);
  return roll.options?.advantageMode === -1
    ? Math.min(...results)
    : Math.max(...results);
}

/** Get the critical-hit threshold for an actor + item, with sensible fallbacks. */
export function getCriticalThreshold(actor, item) {
  if (!actor) return 20;
  return (
    item?.system?.critical?.threshold ??
    actor.system?.attributes?.critical?.threshold ??
    20
  );
}

/** Return true when `naturalRoll` meets or exceeds the critical threshold. */
export function isCriticalHit(naturalRoll, actor, item) {
  return naturalRoll >= getCriticalThreshold(actor, item);
}

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

/**
 * Determine whether `userId` should post the crit/fumble button/result message.
 *
 * Rules:
 *  - Actor with player owners → the owner posts, OR the GM posts if no owner
 *    is currently online.
 *  - NPC / no actor → GM only.
 */
export function checkPermission(rollData, userId) {
  if (!rollData.actor) return game.user.isGM;

  const owners = getPlayerOwnerIds(rollData.actor);
  if (owners.length === 0) return game.user.isGM;

  const onlineOwner = owners.find(id =>
    game.users.find(u => u.id === id && u.active)
  );
  return owners.includes(userId) || (!onlineOwner && game.user.isGM);
}

/**
 * Determine whether `userId` may *click* the roll button.
 * GMs can always click; player owners of the actor can click their own.
 */
export function checkButtonPermission(rollData, userId) {
  if (!rollData.actor) return true; // unknown actor → allow (GM will have clicked)
  const currentUser = game.users.find(u => u.id === userId);
  if (currentUser?.isGM) return true;
  return getPlayerOwnerIds(rollData.actor).includes(userId);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Return the IDs of non-GM users who have Owner-level permission on the actor. */
export function getPlayerOwnerIds(actor) {
  return Object.entries(actor.ownership ?? {})
    .filter(([id, level]) => {
      if (id === "default" || level !== CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) return false;
      const user = game.users.find(u => u.id === id);
      return user && !user.isGM;
    })
    .map(([id]) => id);
}
