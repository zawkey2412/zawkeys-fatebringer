/**
 * chat-avatar.js
 *
 * Replaces the original triple-setTimeout hack with a MutationObserver so
 * avatar images are updated as soon as the DOM node actually appears,
 * regardless of how long async rendering takes.
 */

import { MODULE_ID, FLAG_KEYS } from "./const.js";

/** Map of messageId → avatarUrl for messages that have a custom avatar flag. */
const _pending = new Map();

let _observer = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initializeChatAvatars() {
  _startObserver();

  Hooks.on("renderChatMessage", (message) => {
    const avatar = message.getFlag(MODULE_ID, FLAG_KEYS.AVATAR);
    if (!avatar) return;
    // Attempt immediate update; observer will retry if the node isn't ready yet
    _pending.set(message.id, avatar);
    _applyAvatar(message.id, avatar);
  });

  // Re-scan on log render (e.g. after the user scrolls / chat is rebuilt)
  Hooks.on("renderChatLog", () => {
    for (const message of game.messages.contents) {
      const avatar = message.getFlag(MODULE_ID, FLAG_KEYS.AVATAR);
      if (avatar) {
        _pending.set(message.id, avatar);
        _applyAvatar(message.id, avatar);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _applyAvatar(messageId, avatarUrl) {
  const img = document.querySelector(
    `[data-message-id="${messageId}"] .message-sender img`
  );
  if (!img) return false;
  if (img.src !== avatarUrl) {
    img.src           = avatarUrl;
    img.style.display = "block";
  }
  // Successfully applied — remove from pending
  _pending.delete(messageId);
  return true;
}

/**
 * A single MutationObserver watches the chat log for new nodes.
 * Whenever something is added, it checks whether any pending avatar
 * needs to be applied to the newly added subtree.
 */
function _startObserver() {
  if (_observer) return; // guard against double-init

  _observer = new MutationObserver((mutations) => {
    if (_pending.size === 0) return;

    for (const mutation of mutations) {
      if (!mutation.addedNodes.length) continue;
      for (const [messageId, avatar] of _pending) {
        _applyAvatar(messageId, avatar);
      }
      // Break early if all pending are resolved
      if (_pending.size === 0) break;
    }
  });

  // Start observing once the DOM is ready; the chat log may not exist yet
  // at module init time, so we wait for the first renderChatLog
  Hooks.once("renderChatLog", (_app, html) => {
    const target = html instanceof HTMLElement ? html : html[0];
    if (target) {
      _observer.observe(target, { childList: true, subtree: true });
    }
  });
}
