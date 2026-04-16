import { MODULE_ID, SETTINGS_KEYS } from "./core/const.js";
import { DivineSelectionConfig } from "./features/divine-selection/divine-selection-config.js";
import { CriticalTablesConfig } from "./features/critical-tables/critical-tables.js";

const EMPTY_TABLES_MAP = {
  meleeCrit: "", meleeFumble: "", rangedCrit: "", rangedFumble: "",
  spellCrit: "", spellFumble: "", abilityCrit: "", abilityFumble: "",
  saveCrit:  "", saveFumble:  "", manualCrit:  "", manualFumble:  "",
};

const SETTINGS = {
  // ── Feature toggles — shown directly in the Foundry module settings panel ──
  [SETTINGS_KEYS.ENABLE_DIVINE]: {
    name: "FATEBRINGER.Settings.EnableDivineSelection.Name",
    hint: "FATEBRINGER.Settings.EnableDivineSelection.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  },
  [SETTINGS_KEYS.ENABLE_CRITS]: {
    name: "FATEBRINGER.Settings.EnableCriticalTables.Name",
    hint: "FATEBRINGER.Settings.EnableCriticalTables.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  },
  [SETTINGS_KEYS.DIVINE_KEYBIND]: {
    name: "FATEBRINGER.Settings.DivineSelectionKey.Name",
    hint: "FATEBRINGER.Settings.DivineSelectionKey.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "KeyZ",
    restricted: true,
  },

  // ── Complex data — managed via config-menu dialogs ────────────────────────
  [SETTINGS_KEYS.DEITY_CONFIG]: {
    name: "FATEBRINGER.Settings.DeityConfig.Name",
    hint: "FATEBRINGER.Settings.DeityConfig.Hint",
    scope: "world",
    config: false,
    type: Object,
    default: { names: [], titles: [], avatars: [] },
  },
  [SETTINGS_KEYS.CUSTOM_MESSAGES]: {
    name: "FATEBRINGER.Settings.CustomMessages.Name",
    hint: "FATEBRINGER.Settings.CustomMessages.Hint",
    scope: "world",
    config: false,
    type: Array,
    default: [
      "By divine will, {name} is chosen by {title}.",
      "Fortune favors {name} this day, blessed by {title}.",
      "The hand of fate guides {name}, through {title}'s grace.",
      "The sacred will of {title} chooses {name}.",
      "By {title}'s eternal wisdom, {name} is chosen.",
    ],
  },
  [SETTINGS_KEYS.TABLES_CONFIG]: {
    name: "FATEBRINGER.Settings.CriticalTablesConfig.Name",
    hint: "FATEBRINGER.Settings.CriticalTablesConfig.Hint",
    scope: "world",
    config: false,
    type: Object,
    default: { ...EMPTY_TABLES_MAP },
  },
  [SETTINGS_KEYS.TABLE_ENHANCEMENTS]: {
    name: "FATEBRINGER.Settings.TableEnhancements.Name",
    hint: "FATEBRINGER.Settings.TableEnhancements.Hint",
    scope: "world",
    config: false,
    type: Object,
    default: {},
  },
  [SETTINGS_KEYS.TABLES_OPTIONS]: {
    name: "FATEBRINGER.Settings.CriticalTablesOptions.Name",
    hint: "FATEBRINGER.Settings.CriticalTablesOptions.Hint",
    scope: "world",
    config: false,
    type: Object,
    default: {
      playersOnly:     false,
      checkAttacks:    false,
      checkSaves:      false,
      checkAbility:    false,
      checkManualRolls:false,
      fastForward:     false,
    },
  },
};

const MENUS = {
  divineSelectionConfigMenu: {
    name: "FATEBRINGER.Menus.DivineSelectionConfig.Name",
    label: "FATEBRINGER.Menus.DivineSelectionConfig.Label",
    hint: "FATEBRINGER.Menus.DivineSelectionConfig.Hint",
    icon: "fas fa-hand-sparkles",
    type: DivineSelectionConfig,
    restricted: true,
  },
  criticalTablesConfigMenu: {
    name: "FATEBRINGER.Menus.CriticalTablesConfig.Name",
    label: "FATEBRINGER.Menus.CriticalTablesConfig.Label",
    hint: "FATEBRINGER.Menus.CriticalTablesConfig.Hint",
    icon: "fas fa-dice-d20",
    type: CriticalTablesConfig,
    restricted: true,
  },
};

export function registerSettings() {
  for (const [key, config] of Object.entries(SETTINGS)) {
    game.settings.register(MODULE_ID, key, config);
  }
  for (const [key, config] of Object.entries(MENUS)) {
    game.settings.registerMenu(MODULE_ID, key, config);
  }
}
