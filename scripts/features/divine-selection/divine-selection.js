import { MODULE_ID, SETTINGS_KEYS, FLAG_KEYS } from "../../core/const.js";
import { shuffleArray, formatTokenNames } from "../../core/utils.js";

// ---------------------------------------------------------------------------
// Simple module-level config cache (cleared by clearCaches on settings change)
// ---------------------------------------------------------------------------

let _configCache   = null;
let _messagesCache = null;

function getConfig()   { return _configCache   ??= game.settings.get(MODULE_ID, SETTINGS_KEYS.DEITY_CONFIG); }
function getMessages() { return _messagesCache ??= game.settings.get(MODULE_ID, SETTINGS_KEYS.CUSTOM_MESSAGES); }

export function clearCaches() {
  _configCache   = null;
  _messagesCache = null;
}

// ---------------------------------------------------------------------------
// TokenSelectionDialog (ApplicationV2 + Handlebars)
// ---------------------------------------------------------------------------

export class TokenSelectionDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "fatebringer-selection",
    tag: "dialog",
    window: { title: "Divine Selection", resizable: false },
    position: { width: 420, height: "auto" },
    actions: {
      select: TokenSelectionDialog.prototype._onSelect,
      cancel: TokenSelectionDialog.prototype._onCancel,
    },
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/selection-dialog.hbs` },
  };

  /** @param {Token[]} tokens — the currently controlled tokens */
  constructor(tokens) {
    super();
    this.tokens = tokens;
    // All tokens included by default; track excluded indices
    this._included = new Set(tokens.map((_, i) => i));
  }

  // v14: _prepareContext must be async
  async _prepareContext(_options) {
    const selectOptions = Array.from({ length: this.tokens.length }, (_, i) => ({
      value: i + 1,
      label: i + 1,
    }));

    // Pass a plain-data array so Handlebars can render without Token methods
    const tokenData = this.tokens.map(t => ({
      name: t.name ?? "Unknown",
      img:  t.document?.texture?.src ?? "icons/svg/mystery-man.svg",
    }));

    return { tokens: tokenData, options: selectOptions, total: this.tokens.length };
  }

  // Wire up token click handlers after render
  _onRender(_context, _options) {
    this.element.querySelectorAll(".fb-token-item[data-token-index]").forEach(el => {
      el.addEventListener("click", () => this._toggleToken(el));
    });
  }

  _toggleToken(el) {
    const idx  = parseInt(el.dataset.tokenIndex, 10);
    const name = this.tokens[idx]?.name ?? "";
    if (this._included.has(idx)) {
      this._included.delete(idx);
      el.classList.add("fb-token-item--excluded");
      el.classList.remove("fb-token-item--included");
      el.title = `${name} — click to include`;
    } else {
      this._included.add(idx);
      el.classList.remove("fb-token-item--excluded");
      el.classList.add("fb-token-item--included");
      el.title = `${name} — click to exclude`;
    }
    this._syncControls();
  }

  _syncControls() {
    const includedCount = this._included.size;

    // Rebuild count select options to match included pool size
    const select = this.element.querySelector("select[name='count']");
    if (select) {
      const current = parseInt(select.value, 10) || 1;
      select.innerHTML = "";
      for (let i = 1; i <= includedCount; i++) {
        const opt       = document.createElement("option");
        opt.value       = String(i);
        opt.textContent = String(i);
        if (i === Math.min(current, includedCount)) opt.selected = true;
        select.appendChild(opt);
      }
    }

    // Disable the Divine Selection button when nothing is included
    const btn = this.element.querySelector("[data-action='select']");
    if (btn) btn.disabled = includedCount < 1;

    // Update the included-count span in the hint line
    const countSpan = this.element.querySelector(".fb-token-included-count");
    if (countSpan) countSpan.textContent = String(includedCount);
  }

  async _onSelect(_event, target) {
    const form  = target.closest("form");
    const count = parseInt(form.querySelector("select[name='count']").value, 10);
    if (!Number.isFinite(count) || count < 1) return;

    const includedTokens = this.tokens.filter((_, i) => this._included.has(i));
    if (includedTokens.length < 1) {
      ui.notifications.warn("No tokens included in the pool. Click a token to re-include it.");
      return;
    }

    const selected = shuffleArray(includedTokens).slice(0, count);
    await createDivineMessage(selected);
    this.close();
  }

  _onCancel() {
    this.close();
  }
}

// ---------------------------------------------------------------------------
// Divine message creation
// ---------------------------------------------------------------------------

async function createDivineMessage(tokens) {
  const config   = getConfig();
  const messages = getMessages();

  if (!config.names?.length) {
    ui.notifications.warn("No deities configured. Add deities in module settings → Configure Divine Selection.");
    return;
  }
  if (!messages?.length) {
    ui.notifications.warn("No divine messages configured. Add messages in module settings → Configure Divine Selection.");
    return;
  }

  const chosenIndex  = Math.floor(Math.random() * config.names.length);
  const messageIndex = Math.floor(Math.random() * messages.length);

  // Enrich all token names in parallel
  const enrichedNames = await Promise.all(
    tokens.map(token =>
      TextEditor.enrichHTML(token.name || "unnamed", { secrets: false })
    )
  );
  const formattedNames = formatTokenNames(
    enrichedNames.map(n => `<strong>${n}</strong>`)
  );

  const content = messages[messageIndex]
    .replace(/\{name\}/g, formattedNames)
    .replace(/\{title\}/g, config.titles[chosenIndex] ?? "");

  // Guard: canvas may not be available in some Foundry scenes
  if (canvas?.tokens) {
    canvas.tokens.releaseAll();
    canvas.tokens.placeables.forEach(t => t.setTarget(false, { releaseOthers: false }));
    tokens.forEach(t => {
      t.control({ releaseOthers: false });
      t.setTarget(true, { releaseOthers: false });
    });
  }

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ alias: config.names[chosenIndex] }),
    user: game.user.id,
    flags: { [MODULE_ID]: { [FLAG_KEYS.AVATAR]: config.avatars[chosenIndex] ?? "" } },
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function randomSelectToken() {
  if (!game.user.isGM) return;

  // Guard: canvas must be active to have controlled tokens
  if (!canvas?.tokens) {
    ui.notifications.warn("No active canvas — cannot perform divine selection.");
    return;
  }

  const controlled = canvas.tokens.controlled;
  if (controlled.length < 1) {
    ui.notifications.warn(game.i18n.localize("FATEBRINGER.SelectTokens"));
    return;
  }

  new TokenSelectionDialog(controlled).render(true);
}
