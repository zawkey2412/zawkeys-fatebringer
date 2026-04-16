# Changelog

All notable changes to Zawkey's Fatebringer are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

<!-- Add upcoming changes here before cutting a release -->

---

## [1.1.1] — 2026-04-16

### Fixed
- `AudioHelper.play()` was removed in Foundry v14. Replaced with `game.audio.play()` so the dice sound fallback (used when Dice So Nice is not installed) no longer throws `ReferenceError: AudioHelper is not defined` and breaks table rolls.

---

## [1.1.0] — 2026-04-16

### Fixed
- **Active Effects not applying** — effects embedded inside items (spells, features, etc.) are stored with `disabled: true` on the parent. Fatebringer now always forces `disabled: false` when copying an effect to an actor, so it actually activates on application.
- Table document cache now invalidates when a GM edits a roll table mid-session; previously stale results could be rolled after an edit.
- `_processedIds` deduplication set is now capped at 500 entries to prevent unbounded memory growth in long sessions.

### Added
- **Divine Selection keybind setting** — the trigger key (`Z` by default) is now a plain module setting visible in the Foundry settings panel. Change it to any `KeyboardEvent.code` value (e.g. `KeyG`, `F5`) without navigating to Configure Controls. Takes effect immediately, no reload.
- **Effect duration** — each effect row in the Table Result Enhancements editor has a duration field (rounds). Set `0` for permanent. Duration is forwarded to `data.duration` on the applied effect, so Times Up can expire it automatically.
- **Drag-and-drop UUID input** — drag an `ActiveEffect` directly from an item sheet or the sidebar onto the UUID field in the enhancements editor instead of copying and pasting UUIDs manually.
- **Effect name preview** — the UUID field now resolves and shows the effect's name live (`→ Blinded`) after you type or drop a UUID. Shows `⚠ invalid UUID` when the UUID is unreachable.
- **Duplicate effect guard** — Fatebringer tracks applied effects by their source UUID; the same effect cannot be stacked on the same actor twice from the same source.
- **Remove Effects button** — GM-only button on every result card that applied effects. Clicking it deletes all effects that were applied by that specific roll and marks the button as done.
- Effect target picker ("Choose targets…") now shows the actual effect name in the heading instead of the generic "the effect".

---

## [1.0.0] — 2026-04-16

### Added
- Full critical/fumble detection: melee, ranged, and spell attacks; saving throws; ability and skill checks; manual dice rolls — all independently toggleable.
- Champion Fighter critical threshold support — respects expanded crit ranges.
- Midi-QOL integration for attack rolls with full advantage/disadvantage tracking; falls back to native dnd5e hooks when not installed.
- Fast-forward mode — auto-rolls the configured table instead of posting a click button.
- Players Only toggle — optionally ignore all NPC rolls.
- Active Effects — link any `ActiveEffect` UUID to a fate event; Fatebringer resolves it, copies the data, and applies it directly to the rolling actor.
- Table Result Enhancements — per-result Active Effect and optional macro automation without needing a separate module.
- Deity system for Divine Selection — configure multiple deities, each with a name, title, and avatar image.
- Custom message templates with `{name}` and `{title}` placeholders; one is picked at random per invocation.
- Token exclusion in the Divine Selection dialog — click any token portrait to exclude it from the pool.
- Default hotkey `Z` for Divine Selection, remappable in Foundry's native Keybindings menu (GM only).
- Independent on/off toggles for Critical Tables and Divine Selection — no world reload required.
- Dice So Nice integration for 3D dice animations on table rolls; audio fallback when not installed.
