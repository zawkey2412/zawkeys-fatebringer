import { COLORS } from "./const.js";

export function shuffleArray(array) {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function formatTokenNames(tokens) {
  if (tokens.length === 1) return tokens[0];
  if (tokens.length === 2) return `${tokens[0]} and ${tokens[1]}`;
  return `${tokens.slice(0, -1).join(", ")}, and ${tokens[tokens.length - 1]}`;
}

export function getColors(isCrit) {
  return isCrit ? COLORS.CRIT : COLORS.FUMBLE;
}

/**
 * Build a styled chat-card div.
 *
 * Uses CSS classes (.fb-card, .fb-card[data-result]) defined in fatebringer.css
 * so visual tweaks happen in CSS rather than in JS string templates.
 * The `colors` object is kept as a parameter for callers that still need the
 * raw hex/rgb values (e.g. dynamic button colours).
 */
export function createStyledCard(title, colors, content) {
  const resultType = colors === COLORS.CRIT ? "crit" : "fumble";
  return `<div class="fb-card" data-result="${resultType}"
               style="border-color:${colors.border}; background:rgba(${colors.bg},0.08);">
    <h4>${title}</h4>
    ${content}
  </div>`;
}

/** Strip characters that are unsafe in HTML text nodes. */
export function sanitizeText(text) {
  return String(text).replace(/[<>"'&]/g, "");
}
