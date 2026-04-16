# Changelog

All notable changes to Zawkey's Fatebringer are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

<!-- Add upcoming changes here before cutting a release -->

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
