import { MODULE_ID, SETTINGS_KEYS } from "./core/const.js";
import { registerSettings } from "./settings.js";
import { initializeChatAvatars } from "./core/chat-avatar.js";
import { randomSelectToken, clearCaches } from "./features/divine-selection/divine-selection.js";
import { initializeCriticalTables } from "./features/critical-tables/critical-tables.js";
import { clearCache } from "./core/cache.js";

Hooks.once("init", () => {
  registerSettings();

  // Register native Foundry keybinding — configurable in the Keybindings UI.
  // Toggle check is at invocation time so no world reload is required.
  game.keybindings.register(MODULE_ID, "divineSelection", {
    name: "FATEBRINGER.KeybindingName",
    hint: "FATEBRINGER.KeybindingHint",
    editable: [{ key: "KeyZ" }],
    restricted: true,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    onDown: () => {
      if (!game.settings.get(MODULE_ID, SETTINGS_KEYS.ENABLE_DIVINE)) return false;
      randomSelectToken();
      return true;
    },
  });
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
});
