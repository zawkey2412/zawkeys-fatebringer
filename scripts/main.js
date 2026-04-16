import { MODULE_ID, SETTINGS_KEYS } from "./core/const.js";
import { registerSettings } from "./settings.js";
import { initializeChatAvatars } from "./core/chat-avatar.js";
import { randomSelectToken, clearCaches } from "./features/divine-selection/divine-selection.js";
import { initializeCriticalTables } from "./features/critical-tables/critical-tables.js";
import { clearCache } from "./core/cache.js";

Hooks.once("init", () => {
  registerSettings();
});

Hooks.on("updateSetting", (setting) => {
  const key = setting.key;

  // Invalidate divine-selection caches
  if (
    key === `${MODULE_ID}.${SETTINGS_KEYS.DEITY_CONFIG}` ||
    key === `${MODULE_ID}.${SETTINGS_KEYS.CUSTOM_MESSAGES}`
  ) {
    clearCaches();
  }

  // Invalidate the critical-tables cache on any related setting change
  // (covers criticalTablesConfig, criticalEffectsConfig, criticalTablesOptions)
  if (key.startsWith(`${MODULE_ID}.critical`)) {
    clearCache();
  }
});

Hooks.on("ready", () => {
  initializeChatAvatars();
  // Hooks are always registered; the feature toggle is checked at call-time
  // inside each handler so the GM can flip it without reloading the world.
  initializeCriticalTables();

  // Divine Selection keybind — reads the configured key from module settings
  // so GMs can change it without touching Configure Controls.
  document.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (!game.user?.isGM) return;
    if (!game.settings.get(MODULE_ID, SETTINGS_KEYS.ENABLE_DIVINE)) return;
    // Ignore keypresses while typing in inputs / chat
    if (event.target?.closest("input, textarea, select, [contenteditable]")) return;

    const keyBind = game.settings.get(MODULE_ID, SETTINGS_KEYS.DIVINE_KEYBIND)?.trim() || "KeyZ";
    if (event.code !== keyBind) return;

    event.preventDefault();
    randomSelectToken();
  });
});
