# Zawkey's Fatebringer

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/W7W71K0WGP)
[<img src="https://csl.org/teencamp/wp-content/uploads/sites/12/2022/01/discord.png" width="94">](https://discord.gg/BvAqdHhDU2)

A Foundry VTT module for **D&D 5e** that automatically detects critical successes and failures, fires **roll tables**, applies **Active Effects** directly to actors — all without lifting a finger. Includes a separate **Divine Selection** system for randomly choosing tokens with configurable deity blessing messages.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Recommended Modules](#recommended-modules)
- [Installation](#installation)
- [Setup Guide](#setup-guide)
  - [Critical Tables](#critical-tables-setup)
  - [Active Effects](#active-effects-setup)
  - [Divine Selection](#divine-selection-setup)
- [Configuration Reference](#configuration-reference)
- [Compatibility](#compatibility)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)

---

## Features

### Critical Tables

Fatebringer listens to every d20 roll and fires the right response automatically.

| Roll type     | Crit trigger                                | Fumble trigger |
| ------------- | ------------------------------------------- | -------------- |
| Melee attack  | Natural ≥ crit threshold (Champion support) | Natural 1      |
| Ranged attack | Natural ≥ crit threshold                    | Natural 1      |
| Spell attack  | Natural ≥ crit threshold                    | Natural 1      |
| Saving throw  | Natural 20                                  | Natural 1      |
| Ability check | Natural 20                                  | Natural 1      |
| Manual dice   | Maximum face value                          | Minimum (1)    |

**Per event you can configure:**

- A **Roll Table** — Fatebringer rolls it and posts the result to chat, either as an interactive button or instantly (fast-forward mode).
- An **Active Effect** — Fatebringer copies the effect from wherever it lives (actor, item, compendium) and applies it directly to the rolling actor.
- **Both** — table rolls and effect application fire in parallel.

**Detection options (all independently toggleable):**

- Attack rolls (melee / ranged / spell)
- Saving throws
- Ability checks & skill checks
- Manual dice rolls
- Players only (ignore NPC rolls)
- Fast-forward (skip the button, roll immediately)

### Active Effects Integration

Link any existing Active Effect to a fate event by UUID. When a crit or fumble triggers, Fatebringer:

1. Resolves the UUID with Foundry's `fromUuid()`.
2. Copies the effect data and stamps the origin as `Module.fatebringer`.
3. Applies it to the actor with `actor.createEmbeddedDocuments()`.
4. Posts a styled chat card confirming which effect was applied to whom.

Works with vanilla Foundry effects and is greatly enhanced by **DAE** and **Times Up** (see [Recommended Modules](#recommended-modules)).

### Divine Selection

A GM tool for dramatic moments — randomly choose one or more tokens from your current selection with a divine blessing message.

- **Deity system** — configure multiple deities, each with a name, title, and avatar image.
- **Custom messages** — write any number of message templates using `{name}` (selected tokens) and `{title}` (deity title) placeholders.
- **Token exclusion** — in the selection dialog, click any token to exclude it from the pool. Excluded tokens are greyed out and skipped when rolling. Click again to re-include. This lets you adjust the pool on the fly without starting over.
- **Hotkey** — default `Z`, remappable in Foundry's Keybindings menu (GM only).
- Selected tokens are automatically controlled and targeted on the canvas.

### Feature Toggles

Both **Critical Tables** and **Divine Selection** have individual on/off switches in the native Foundry module settings panel. Toggling either takes effect immediately — no world reload required.

### Dice So Nice Integration

Table rolls show 3D dice animations via **Dice So Nice** when installed. Falls back to a built-in audio cue otherwise.

---

## Requirements

| Requirement | Details              |
| ----------- | -------------------- |
| Foundry VTT | **v14** minimum      |
| Game system | **D&D 5e**           |
| Midi-QOL    | Optional — see below |

---

## Recommended Modules

None of these are required. Each adds something specific on top of Fatebringer's core features.

| Module                                                                 | Why                                                                                                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**midi-qol**](https://github.com/tposney/midi-qol)                    | Enhanced attack roll detection with full advantage/disadvantage tracking. Without it, Fatebringer falls back to native dnd5e hooks — which work fine for most tables. |
| [**Dynamic Active Effects (DAE)**](https://gitlab.com/tposney/dae)     | Unlocks far more powerful effects — attribute overrides, roll bonuses, flags, and more. Strongly recommended when using the Active Effect feature.                    |
| [**Times Up**](https://gitlab.com/tposney/times-up)                    | Lets applied effects expire automatically after a set number of rounds, turns, or seconds.                                                                            |
| [**Dice So Nice**](https://gitlab.com/riccisi/foundryvtt-dice-so-nice) | 3D dice animations for table rolls.                                                                                                                                   |

---

## Installation

**Method 1 — Foundry package manager (recommended)**

Paste this manifest URL into _Foundry → Add-on Modules → Install Module_:

```
https://github.com/zawkey2412/zawkeys-fatebringer/releases/latest/download/module.json
```

**Method 2 — Manual**

Download the [latest release](https://github.com/zawkey2412/zawkeys-fatebringer/releases/latest) zip and extract it into your `Data/modules/` folder as `fatebringer/`.

---

## Setup Guide

### Critical Tables Setup

1. **Enable the feature** — go to _Game Settings → Module Settings → Fatebringer_ and confirm **Enable Critical Tables** is on.
2. **Open the config** — click the **Configure** button next to _Configure Critical Tables_.
3. **Set trigger options** in the top section:
   - Choose which roll types to watch (attacks, saves, ability checks, manual rolls).
   - Enable _Players Only_ if you only want player-owned actors to trigger.
   - Enable _Fast Forward_ to auto-roll tables instead of presenting a button.
4. **Paste Roll Table UUIDs** — for each event (e.g. _Melee Critical_), paste the UUID of your Roll Table into the **Roll Table UUID** field.

**How to get a Roll Table UUID:**

- Open the Roll Tables directory (sidebar).
- Right-click the table → **Copy UUID** (Foundry v14).
- Paste it into the config field and save — the module validates it automatically.

### Active Effects Setup

1. **Create or find an Active Effect** — effects live inside items or actors. Common workflow: create a world item (e.g. "Crit Effects"), add Active Effects to it, each representing one outcome.
2. **Get the effect's UUID** — open the item sheet, right-click (or **Shift-click**) the effect row → **Copy UUID**. It will look like `Item.xxxxxxxx.ActiveEffect.yyyyyyyy`.
3. **Open Critical Tables config** and paste the UUID into the **Active Effect UUID** field for the matching event.
4. Save. When that event fires, Fatebringer applies the effect to the rolling actor and posts a chat confirmation.

> **Tip:** You can configure both a Roll Table and an Active Effect for the same event. Both fire in parallel — the table result posts to chat and the effect is applied simultaneously.

### Divine Selection Setup

1. **Enable the feature** — confirm **Enable Divine Selection** is on in module settings.
2. **Open the config** — click **Configure** next to _Configure Divine Selection_.
3. **Configure Deities** — add deity names, titles, and optional avatar images (use the browse button to pick from your media library).
4. **Configure Messages** — write message templates. Use `{name}` for the selected token names and `{title}` for the deity's title. You can add as many messages as you like; one is picked at random each time.
5. **Use it** — select 2 or more tokens on the canvas, press **Z** (or your configured hotkey). A dialog appears showing all selected tokens.
6. **Exclude tokens (optional)** — click any token portrait in the dialog to exclude it from the pool (it will dim and show a ✕). Click again to re-include. Only included tokens are candidates when rolling.
7. **Choose count** — pick how many tokens to randomly select from the included pool, then click **Divine Selection**.

---

## Configuration Reference

### Critical Tables Options

| Option               | Default | Description                                                    |
| -------------------- | ------- | -------------------------------------------------------------- |
| Players Only         | Off     | Only trigger for player-owned actors. NPC rolls are ignored.   |
| Check Attack Rolls   | Off     | Trigger on crits/fumbles for melee, ranged, and spell attacks. |
| Check Saving Throws  | Off     | Trigger on natural 20s and 1s on saving throws.                |
| Check Ability Checks | Off     | Trigger on natural 20s and 1s on ability and skill checks.     |
| Check Manual Rolls   | Off     | Trigger on max/min values for non-d20 manual dice rolls.       |
| Fast Forward         | Off     | Auto-roll configured tables instead of showing a click button. |

### Event Keys

| Event key        | Trigger condition                                   |
| ---------------- | --------------------------------------------------- |
| Melee Critical   | Natural roll ≥ crit threshold on a melee attack     |
| Melee Fumble     | Natural 1 on a melee attack                         |
| Ranged Critical  | Natural roll ≥ crit threshold on a ranged attack    |
| Ranged Fumble    | Natural 1 on a ranged attack                        |
| Spell Critical   | Natural roll ≥ crit threshold on a spell attack     |
| Spell Fumble     | Natural 1 on a spell attack                         |
| Ability Critical | Natural 20 on an ability or skill check             |
| Ability Fumble   | Natural 1 on an ability or skill check              |
| Save Critical    | Natural 20 on a saving throw                        |
| Save Fumble      | Natural 1 on a saving throw                         |
| Manual Critical  | Rolled the maximum face value on a manual dice roll |
| Manual Fumble    | Rolled 1 on a manual dice roll                      |

### Divine Selection Placeholders

| Placeholder | Replaced with                                                        |
| ----------- | -------------------------------------------------------------------- |
| `{name}`    | Comma-separated list of selected token names (bolded, HTML-enriched) |
| `{title}`   | The randomly chosen deity's title                                    |

---

## Compatibility

| Software                      | Version                            |
| ----------------------------- | ---------------------------------- |
| Foundry VTT                   | v14 (minimum and verified)         |
| D&D 5e system                 | Any current release                |
| midi-qol                      | Optional — module works without it |
| Dice So Nice                  | Optional — audio fallback included |
| DAE / Times Up               | Optional — enhance Active Effects  |

---

## Troubleshooting

**Nothing happens on a crit or fumble**

- Check that _Enable Critical Tables_ is on in module settings.
- Confirm the matching roll type is enabled in the config (e.g. _Check Attack Rolls_).
- If the actor is an NPC and _Players Only_ is on, NPC rolls are intentionally ignored.
- Verify the table or effect UUID is filled in for the specific event key.

**Table not rolling / "Invalid table" warning**

- The UUID must point to a **RollTable** document. Copy it by right-clicking the table in the sidebar → **Copy UUID**.
- Make sure the table has at least one result row and is not empty.

**Active Effect not applying**

- The UUID must point to an **ActiveEffect** embedded in an actor or item, not the parent document itself. Right-click (or **Shift-click**) the effect row on the sheet.
- Foundry format: `Actor.xxxxx.ActiveEffect.yyyyy` or `Item.xxxxx.ActiveEffect.yyyyy`.
- The rolling actor must be on the canvas and linked to a world actor (not an unlinked token actor) for the effect to persist.

**Button appears but clicking it does nothing**

- Only the actor's owner (or the GM) can click the roll button.
- Check that you are logged in as a user with ownership permission on that actor.

**No dice animation**

- Install **Dice So Nice** for 3D animations. Without it, a built-in audio cue plays instead.
- Check your browser's audio permissions if the sound is also silent.

**Divine Selection does nothing when I press Z**

- Confirm _Enable Divine Selection_ is on.
- You must be logged in as a **GM** — the keybinding is restricted.
- At least one token must be **selected** (left-click on the canvas) before pressing the hotkey.
- The key is remappable: _Game Settings → Controls → Fatebringer → Divine Selection_.

**Divine Selection: "No deities configured"**

- Open _Module Settings → Configure Divine Selection → Configure Deities_ and add at least one deity with a non-empty name.

**Divine Selection button is greyed out / disabled**

- All tokens in the dialog have been excluded. Click at least one token portrait to include it back in the pool.

---

## Changelog

### v1.0.0 — Initial Release

First public release of Zawkey's Fatebringer for Foundry VTT v14.

**Critical Tables**
- Full detection coverage: melee, ranged, and spell attacks; saving throws; ability and skill checks; manual dice rolls — all independently toggleable.
- Champion Fighter critical threshold support — respects expanded crit ranges.
- Midi-QOL integration for attack rolls with full advantage/disadvantage tracking; falls back to native dnd5e hooks when not installed.
- Fast-forward mode — auto-rolls the configured table instead of posting a click button.
- Players Only toggle — optionally ignore all NPC rolls.
- **Active Effects** — link any `ActiveEffect` UUID to a fate event; Fatebringer resolves it via `fromUuid()`, copies the data, and applies it directly to the rolling actor. Works alongside or instead of a roll table.
- Table Result Enhancements — per-result Active Effect and optional macro automation without needing a separate module.

**Divine Selection**
- Deity system — configure multiple deities, each with a name, title, and avatar image used as the chat speaker.
- Custom message templates with `{name}` and `{title}` placeholders; one is picked at random per invocation.
- **Token exclusion** — click any token portrait in the selection dialog to exclude it from the pool (dims with a ✕ overlay). Click again to re-include. The count selector and Divine Selection button update live.
- Default hotkey `Z`, remappable in Foundry's native Keybindings menu (GM only).

**Settings & UI**
- Independent on/off toggles for Critical Tables and Divine Selection — no world reload required.
- Config dialogs built with `ApplicationV2`; tabbed layout for deities, messages, and options.
- UI colours and font sizes aligned with Foundry's native theme.

---

## Contributing

Bug reports, feature suggestions, and pull requests are all welcome at [github.com/zawkey2412/zawkeys-fatebringer](https://github.com/zawkey2412/zawkeys-fatebringer/issues).

## License

MIT — free to use, modify, and share. Not affiliated with Wizards of the Coast or Foundry Gaming LLC.
