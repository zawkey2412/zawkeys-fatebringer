export const FORM_STYLES = `
.form-container { height: 100%; display: flex; flex-direction: column; }
.form-header { margin-bottom: 15px; flex-shrink: 0; }
.form-row { display: grid; grid-template-columns: 1fr 1fr 2fr auto; gap: 10px; margin-bottom: 10px; align-items: center; }
.message-row { margin-bottom: 10px; }
.message-textarea { width: 100%; height: 60px; resize: vertical; }
.form-footer { text-align: right; flex-shrink: 0; margin-top: auto; }
`;

export function createFormContainer(
  title,
  description,
  contentHtml,
  footerButtons,
) {
  return `
<div class="scrollable">
  <style>${FORM_STYLES}</style>
  <form class="form-container">
    <div class="form-header">
      <p><strong>${title}</strong></p>
      <p style="font-size: 12px; ;">${description}</p>
    </div>
    
    <div class="scrollable" style="flex: 1; margin-bottom: 15px;">
      ${contentHtml}
    </div>
    
    <div class="form-footer">
      ${footerButtons}
    </div>
  </form>
</div>
  `;
}

export function createDeityRow(
  index,
  name = "",
  title = "",
  avatar = "",
  isNew = false,
) {
  const prefix = isNew ? "New " : "";
  return `
    <div class="form-row">
      <input type="text" name="name-${index}" value="${name}" placeholder="${prefix}Deity Name" />
      <input type="text" name="title-${index}" value="${title}" placeholder="${prefix}Title" />
      <input type="text" name="avatar-${index}" value="${avatar}" placeholder="${prefix}Image path" />
      <button type="button" data-action="browse" data-target="avatar-${index}"><i class="fas fa-file-import"></i></button>
    </div>
  `;
}

export function createMessageRow(index, text = "", isNew = false) {
  const prefix = isNew ? "New " : "";
  return `
    <div class="message-row">
      <textarea name="message-${index}" class="message-textarea" placeholder="${prefix}divine message template">${text}</textarea>
    </div>
  `;
}
