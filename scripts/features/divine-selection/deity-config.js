import { MODULE_ID, SETTINGS_KEYS } from "../../core/const.js";
import { createFormContainer, createDeityRow } from "../../ui/form-utils.js";
import { BaseConfigForm } from "../../ui/base-config.js";

export class DeityConfigForm extends BaseConfigForm {
  static DEFAULT_OPTIONS = {
    ...BaseConfigForm.DEFAULT_OPTIONS,
    id: "deity-config-form",
    window: { title: "Deity Configuration", resizable: false },
    actions: {
      save: DeityConfigForm.prototype._onSave,
      browse: DeityConfigForm.prototype._onBrowse,
      addMore: DeityConfigForm.prototype._onAddMore,
    },
  };

  _prepareHTML() {
    const config = game.settings.get(MODULE_ID, SETTINGS_KEYS.DEITY_CONFIG);
    let contentHtml = "";

    const maxLength = Math.max(
      config.names.length,
      config.titles.length,
      config.avatars.length
    );
    for (let i = 0; i < maxLength; i++) {
      contentHtml += createDeityRow(
        i,
        config.names[i] || "",
        config.titles[i] || "",
        config.avatars[i] || ""
      );
    }

    const startIndex = maxLength + 100;
    for (let i = 0; i < this.emptySlotCount; i++) {
      contentHtml += createDeityRow(startIndex + i, "", "", "", true);
    }

    return createFormContainer(
      "Configure Divine Beings:",
      "Add or modify deities, their titles, and avatar image paths. Empty fields will be removed.",
      contentHtml,
      this._createFooterButtons("Save Configuration")
    );
  }

  _getInputSelector() {
    return 'input[name^="name-"], input[name^="title-"], input[name^="avatar-"]';
  }

  async _onBrowse(event, target) {
    const inputName = target.dataset.target;
    const input = this.element.querySelector(`input[name="${inputName}"]`);

    const fp = new FilePicker({
      type: "imagevideo",
      callback: (path) => {
        input.value = path;
      },
    });
    fp.render(true);
  }

  _processSaveData(formData) {
    const deities = {};
    for (const [key, value] of formData.entries()) {
      const [type, index] = key.split("-");
      const idx = parseInt(index);
      if (!deities[idx]) deities[idx] = {};
      deities[idx][type] = value.trim();
    }

    const names = [],
      titles = [],
      avatars = [];
    Object.values(deities).forEach((deity) => {
      if (deity.name) {
        names.push(deity.name);
        titles.push(deity.title || "");
        avatars.push(deity.avatar || "");
      }
    });

    return { settingKey: SETTINGS_KEYS.DEITY_CONFIG, data: { names, titles, avatars } };
  }
}
