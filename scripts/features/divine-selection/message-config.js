import { MODULE_ID, SETTINGS_KEYS } from "../../core/const.js";
import { createFormContainer, createMessageRow } from "../../ui/form-utils.js";
import { BaseConfigForm } from "../../ui/base-config.js";

export class MessageConfigForm extends BaseConfigForm {
  static DEFAULT_OPTIONS = {
    ...BaseConfigForm.DEFAULT_OPTIONS,
    id: "message-config-form",
    window: { title: "Message Configuration", resizable: false },
    actions: {
      save: MessageConfigForm.prototype._onSave,
      addMore: MessageConfigForm.prototype._onAddMore,
    },
  };

  _prepareHTML() {
    const messages = game.settings.get(MODULE_ID, SETTINGS_KEYS.CUSTOM_MESSAGES);
    let contentHtml = "";

    messages.forEach((msg, index) => {
      contentHtml += createMessageRow(index, msg);
    });

    const startIndex = messages.length + 100;
    for (let i = 0; i < this.emptySlotCount; i++) {
      contentHtml += createMessageRow(startIndex + i, "", true);
    }

    return createFormContainer(
      "Configure Divine Messages:",
      "Use {name} for token names and {title} for deity titles. Empty fields will be removed.",
      contentHtml,
      this._createFooterButtons("Save Messages")
    );
  }

  _getInputSelector() {
    return 'textarea[name^="message-"]';
  }

  async _onSave(event, target) {
    const form = target.closest("form");
    const formData = new FormData(form);
    const messages = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("message-") && value.trim()) {
        messages.push(value.trim());
      }
    }

    if (messages.length === 0) {
      ui.notifications.warn("At least one message is required.");
      return;
    }

    await game.settings.set(MODULE_ID, SETTINGS_KEYS.CUSTOM_MESSAGES, messages);
    this.emptySlotCount = 5;
    this.close();
  }
}
