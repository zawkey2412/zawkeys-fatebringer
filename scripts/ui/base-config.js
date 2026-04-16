import { MODULE_ID } from "../core/const.js";

const { ApplicationV2 } = foundry.applications.api;

export class BaseConfigForm extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    tag: "form",
    window: { resizable: false },
    position: { width: 800, height: 600 },
  };

  static PARTS = { form: {} };

  constructor() {
    super();
    this.emptySlotCount = 5;
  }

  // v14 ApplicationV2: _renderHTML(context, options) → Record<partId, string|HTMLElement>
  async _renderHTML(_context, _options) {
    return { form: this._prepareHTML() };
  }

  // v14 ApplicationV2: _replaceHTML(result, content, options)
  async _replaceHTML(result, content, _options) {
    content.innerHTML = result.form;
  }

  // v14 ApplicationV2: _onRender(context, options)
  _onRender(_context, _options) {
    super._onRender(_context, _options);
    if (!this.tempFormData) return;

    // Restore form values after a re-render triggered by "Add More"
    const data = this.tempFormData;
    this.tempFormData = null;
    setTimeout(() => {
      for (const [key, value] of Object.entries(data)) {
        const el = this.element.querySelector(`[name="${key}"]`);
        if (el) el.value = value;
      }
    }, 10);
  }

  async _onAddMore(_event, target) {
    const form = target.closest("form");
    const inputs = form.querySelectorAll(this._getInputSelector());
    const hasEmpty = Array.from(inputs).some(el => !el.value.trim());

    if (hasEmpty) {
      ui.notifications.warn("Please fill all empty fields before adding more.");
      return;
    }

    this._preserveFormData(form);
    this.emptySlotCount += 5;
    this.render();
  }

  _preserveFormData(form) {
    const formData = new FormData(form);
    this.tempFormData = {};
    for (const [key, value] of formData.entries()) {
      if (value.trim()) this.tempFormData[key] = value;
    }
  }

  _createFooterButtons(saveLabel) {
    return `
      <button type="button" data-action="addMore" style="margin-right: 10px;">Add 5 More</button>
      <button type="button" data-action="save">${saveLabel}</button>
    `;
  }

  async _onSave(_event, target) {
    const form = target.closest("form");
    const formData = new FormData(form);
    const result = this._processSaveData(formData);

    if (result.error) {
      ui.notifications.warn(result.error);
      return;
    }

    await game.settings.set(MODULE_ID, result.settingKey, result.data);
    this.emptySlotCount = 5;
    this.close();
  }

  // Abstract — subclasses must implement these
  _prepareHTML() { throw new Error("Must implement _prepareHTML"); }
  _getInputSelector() { throw new Error("Must implement _getInputSelector"); }
  _processSaveData(_formData) { throw new Error("Must implement _processSaveData"); }
}
