import { MODULE_ID, DELAYS } from "../../core/const.js";

/** Show a dice animation: Dice So Nice if available, otherwise play audio + wait. */
export async function showDiceAnimation(roll) {
  if (game.dice3d) {
    try {
      await game.dice3d.showForRoll(roll, game.user, true);
      return;
    } catch {}
  }

  // Fallback: play a sound using the native Foundry AudioHelper (v14 API)
  AudioHelper.play({
    src: `modules/${MODULE_ID}/assets/dice_roll.ogg`,
    volume: 0.5,
    loop: false,
  });

  await new Promise(resolve => setTimeout(resolve, DELAYS.DICE_ANIMATION));
}
