export const MODULE_ID = "critically-fumbled";

export const ROLL_CATEGORIES = {
  MELEE:  "melee",
  RANGED: "ranged",
  SPELL:  "spell",
  SAVE:   "save",
  ABILITY:"ability",
  MANUAL: "manual",
};

export const COLORS = {
  CRIT:   { border: "#4CAF50", bg: "76,175,80" },
  FUMBLE: { border: "#f72525", bg: "255,107,107" },
};

export const DELAYS = {
  DICE_ANIMATION: 2000,
  BUTTON_PROCESS: 100,
};

/** Centralised setting keys — use these instead of raw strings everywhere. */
export const SETTINGS_KEYS = {
  ENABLE_DIVINE:      "enableDivineSelection",
  ENABLE_CRITS:       "enableCriticalTables",
  DIVINE_KEYBIND:     "divineSelectionKey",
  DEITY_CONFIG:       "deityConfig",
  CUSTOM_MESSAGES:    "customMessages",
  TABLES_CONFIG:      "criticalTablesConfig",
  TABLES_OPTIONS:     "criticalTablesOptions",
  TABLE_ENHANCEMENTS: "tableEnhancements",
};

/** Message flag keys stored under MODULE_ID. */
export const FLAG_KEYS = {
  AVATAR:           "avatar",
  PROCESSED_MIDI:   "processedByMidi",
  IS_CRIT:          "isCrit",
  EVENT_KEY:        "eventKey",
  APPLIED_EFFECTS:  "appliedEffects",
};
