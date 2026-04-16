/**
 * divine-selection-config.js
 *
 * Unified tabbed configuration dialog for Divine Selection.
 * Replaces the old hub-dialog → sub-dialog pattern with a single window
 * covering both Deities and Messages in two tabs.
 *
 * Features:
 *  - Tab navigation with live entry counts
 *  - Deity rows: avatar thumbnail (live-updating), name, title, avatar path,
 *    browse button, delete button
 *  - Message rows: textarea, placeholder hint, delete button
 *  - Add buttons (not "Add 5 More" clunks)
 *  - DOM-based save (no full re-render on change)
 *  - Validation with clear user feedback
 */

import { MODULE_ID, SETTINGS_KEYS } from "../../core/const.js";
import { clearCaches } from "./divine-selection.js";

const { ApplicationV2 } = foundry.applications.api;

const FALLBACK_AVATAR = "icons/svg/mystery-man.svg";

// ---------------------------------------------------------------------------
// Attribute-safe escaping helper
// ---------------------------------------------------------------------------

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------
// DivineSelectionConfig
// ---------------------------------------------------------------------------

export class DivineSelectionConfig extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "divine-selection-config",
    tag: "form",
    window: {
      title: "Divine Selection — Configuration",
      resizable: true,
    },
    position: { width: 700, height: 560 },
    actions: {
      switchTab: DivineSelectionConfig.prototype._onSwitchTab,
      addDeity: DivineSelectionConfig.prototype._onAddDeity,
      removeDeity: DivineSelectionConfig.prototype._onRemoveDeity,
      browse: DivineSelectionConfig.prototype._onBrowse,
      addMessage: DivineSelectionConfig.prototype._onAddMessage,
      removeMessage: DivineSelectionConfig.prototype._onRemoveMessage,
      save: DivineSelectionConfig.prototype._onSave,
    },
  };

  static PARTS = { form: {} };

  /** Currently visible tab — survives DOM replacement. */
  _activeTab = "deities";

  // ---------------------------------------------------------------------------
  // ApplicationV2 render lifecycle
  // ---------------------------------------------------------------------------

  async _renderHTML(_ctx, _opts) {
    const config = game.settings.get(MODULE_ID, SETTINGS_KEYS.DEITY_CONFIG);
    const messages = game.settings.get(
      MODULE_ID,
      SETTINGS_KEYS.CUSTOM_MESSAGES,
    );
    return { form: this._buildHTML(config, messages) };
  }

  async _replaceHTML(result, content, _opts) {
    content.innerHTML = result.form;
  }

  _onRender(_ctx, _opts) {
    super._onRender(_ctx, _opts);

    // Single delegated listener for live avatar preview updates.
    // Attached once; covers both existing and dynamically added rows.
    this.element.addEventListener("input", (e) => {
      if (e.target.dataset.field !== "avatar") return;
      const row = e.target.closest(".fb-deity-row");
      const preview = row?.querySelector(".fb-deity-avatar-preview");
      if (preview) preview.src = e.target.value.trim() || FALLBACK_AVATAR;
    });

    this._showTab(this._activeTab);
    this._syncCounts();
  }

  // ---------------------------------------------------------------------------
  // Tab management
  // ---------------------------------------------------------------------------

  _onSwitchTab(_event, target) {
    const tab = target.dataset.tab;
    if (!tab) return;
    this._activeTab = tab;
    this._showTab(tab);
  }

  _showTab(tab) {
    this.element.querySelectorAll(".fb-tab-btn").forEach((btn) => {
      btn.classList.toggle("fb-tab-btn--active", btn.dataset.tab === tab);
    });
    this.element.querySelectorAll(".fb-tab-panel").forEach((panel) => {
      panel.classList.toggle(
        "fb-tab-panel--hidden",
        panel.dataset.panel !== tab,
      );
    });
  }

  _syncCounts() {
    const dc = this.element.querySelector("#fb-deity-count");
    const mc = this.element.querySelector("#fb-msg-count");
    if (dc)
      dc.textContent = this.element.querySelectorAll(".fb-deity-row").length;
    if (mc)
      mc.textContent = this.element.querySelectorAll(".fb-message-item").length;
  }

  // ---------------------------------------------------------------------------
  // Deity actions
  // ---------------------------------------------------------------------------

  _onAddDeity() {
    const list = this.element.querySelector(".fb-deity-list");
    if (!list) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = _buildDeityRow(Date.now(), "", "", "");
    list.appendChild(tmp.firstElementChild);
    this._syncCounts();
    // Focus the name input of the new row
    list.lastElementChild?.querySelector("[data-field='name']")?.focus();
  }

  _onRemoveDeity(_event, target) {
    target.closest(".fb-deity-row")?.remove();
    this._syncCounts();
  }

  _onBrowse(_event, target) {
    const row = target.closest(".fb-deity-row");
    const input = row?.querySelector("[data-field='avatar']");
    const preview = row?.querySelector(".fb-deity-avatar-preview");

    new FilePicker({
      type: "imagevideo",
      current: input?.value ?? "",
      callback: (path) => {
        if (input) input.value = path;
        if (preview) preview.src = path || FALLBACK_AVATAR;
      },
    }).render(true);
  }

  // ---------------------------------------------------------------------------
  // Message actions
  // ---------------------------------------------------------------------------

  _onAddMessage() {
    const list = this.element.querySelector(".fb-message-list");
    if (!list) return;
    const tmp = document.createElement("div");
    tmp.innerHTML = _buildMessageRow(Date.now(), "");
    list.appendChild(tmp.firstElementChild);
    this._syncCounts();
    list.lastElementChild?.querySelector("textarea")?.focus();
  }

  _onRemoveMessage(_event, target) {
    target.closest(".fb-message-item")?.remove();
    this._syncCounts();
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async _onSave() {
    // ── Deities ──────────────────────────────────────────────────────────────
    const names = [],
      titles = [],
      avatars = [];
    for (const row of this.element.querySelectorAll(".fb-deity-row")) {
      const name =
        row.querySelector("[data-field='name']")?.value?.trim() ?? "";
      if (!name) continue; // rows with no name are silently skipped
      names.push(name);
      titles.push(
        row.querySelector("[data-field='title']")?.value?.trim() ?? "",
      );
      avatars.push(
        row.querySelector("[data-field='avatar']")?.value?.trim() ?? "",
      );
    }

    // ── Messages ─────────────────────────────────────────────────────────────
    const messages = Array.from(
      this.element.querySelectorAll(".fb-message-item textarea"),
    )
      .map((ta) => ta.value.trim())
      .filter(Boolean);

    if (messages.length === 0) {
      ui.notifications.warn(
        "Zawkey's Fatebringer: At least one divine message is required.",
      );
      this._showTab("messages"); // take user to the empty tab
      return;
    }

    await game.settings.set(MODULE_ID, SETTINGS_KEYS.DEITY_CONFIG, {
      names,
      titles,
      avatars,
    });
    await game.settings.set(MODULE_ID, SETTINGS_KEYS.CUSTOM_MESSAGES, messages);
    clearCaches();

    ui.notifications.info(
      `Zawkey's Fatebringer: Saved ${names.length} ${names.length === 1 ? "deity" : "deities"} and ${messages.length} ${messages.length === 1 ? "message" : "messages"}.`,
    );
    this.close();
  }

  // ---------------------------------------------------------------------------
  // HTML builders
  // ---------------------------------------------------------------------------

  _buildHTML(config, messages) {
    const deityCount = config.names?.length ?? 0;
    const msgCount = messages?.length ?? 0;

    const deityRowsHtml = (config.names ?? [])
      .map((name, i) =>
        _buildDeityRow(
          i,
          name,
          config.titles[i] ?? "",
          config.avatars[i] ?? "",
        ),
      )
      .join("");

    const messageRowsHtml = (messages ?? [])
      .map((msg, i) => _buildMessageRow(i, msg))
      .join("");

    return `
      <div class="fb-config-dialog">

        <!-- ── Tab navigation ──────────────────────────────────────── -->
        <nav class="fb-tabs" role="tablist">
          <button type="button" class="fb-tab-btn" data-action="switchTab" data-tab="deities"
                  role="tab" aria-selected="true" style="--button-focus-outline-color: none;">
            <i class="fas fa-star"></i>
            Deities
            <span class="fb-tab-badge" id="fb-deity-count">${deityCount}</span>
          </button>
          <button type="button" class="fb-tab-btn" data-action="switchTab" data-tab="messages"
                  role="tab" aria-selected="false" style="--button-focus-outline-color: none;">
            <i class="fas fa-comment-dots"></i>
            Messages
            <span class="fb-tab-badge" id="fb-msg-count">${msgCount}</span>
          </button>
        </nav>

        <!-- ── Deities panel ───────────────────────────────────────── -->
        <div class="fb-tab-panel" data-panel="deities" role="tabpanel">
          <p class="fb-panel-hint">
            One deity is chosen at random each time divine selection fires.
            <strong>Name</strong> is required — title and avatar are optional.
            Rows with an empty name are ignored on save.
          </p>

          <div class="fb-deity-list-header" aria-hidden="true">
            <span></span>
            <span>Name *</span>
            <span>Title</span>
            <span>Avatar Image</span>
            <span></span>
          </div>

          <div class="fb-deity-list">
            ${deityRowsHtml}
          </div>

          <div class="fb-panel-footer">
            <button type="button" data-action="addDeity" class="fb-btn fb-btn--add">
              <i class="fas fa-plus"></i> Add Deity
            </button>
          </div>
        </div>

        <!-- ── Messages panel ──────────────────────────────────────── -->
        <div class="fb-tab-panel fb-tab-panel--hidden" data-panel="messages" role="tabpanel">
          <p class="fb-panel-hint">
            One message is chosen at random per invocation.
            Use <code>{name}</code> for the selected token names and
            <code>{title}</code> for the deity's title. At least one is required.
          </p>

          <div class="fb-message-list">
            ${messageRowsHtml}
          </div>

          <div class="fb-panel-footer">
            <button type="button" data-action="addMessage" class="fb-btn fb-btn--add">
              <i class="fas fa-plus"></i> Add Message
            </button>
          </div>
        </div>

        <!-- ── Footer ──────────────────────────────────────────────── -->
        <div class="fb-config-footer">
          <button type="button" data-action="save" class="fb-btn fb-btn--primary">
            <i class="fas fa-save"></i> Save Configuration
          </button>
        </div>

      </div>
    `;
  }
}

// ---------------------------------------------------------------------------
// Row builders (module-level so _onAddDeity can call them without `this`)
// ---------------------------------------------------------------------------

function _buildDeityRow(idx, name, title, avatar) {
  const imgSrc = avatar || FALLBACK_AVATAR;
  return `
    <div class="fb-deity-row">
      <img class="fb-deity-avatar-preview" src="${esc(imgSrc)}" alt="" />
      <input type="text" data-field="name"
             value="${esc(name)}" placeholder="Deity name…" class="fb-input" />
      <input type="text" data-field="title"
             value="${esc(title)}" placeholder="The Allfather…" class="fb-input" />
      <div class="fb-avatar-field">
        <input type="text" data-field="avatar"
               value="${esc(avatar)}" placeholder="icons/…  or paste path" class="fb-input" />
        <button type="button" data-action="browse"
                class="fb-btn fb-btn--icon" title="Browse files">
          <i class="fas fa-folder-open"></i>
        </button>
      </div>
      <button type="button" data-action="removeDeity"
              class="fb-btn fb-btn--icon fb-btn--danger" title="Remove deity">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
}

function _buildMessageRow(idx, text) {
  const safeText = esc(text);
  return `
    <div class="fb-message-item">
      <div class="fb-message-item-header">
        <span class="fb-message-label"><i class="fas fa-comment"></i> Message</span>
        <button type="button" data-action="removeMessage"
                class="fb-btn fb-btn--icon fb-btn--danger" title="Remove message">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <textarea class="fb-textarea"
                placeholder="By divine will, {name} is chosen by {title}.">${safeText}</textarea>
      <p class="fb-placeholder-hint">
        <code>{name}</code> token names &nbsp;·&nbsp; <code>{title}</code> deity title
      </p>
    </div>
  `;
}
