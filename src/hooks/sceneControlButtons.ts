import { moduleId } from '@/settings';
import { PhaseManager } from '@/classes';

export function registerForSceneControlButtons() {
  Hooks.once('getSceneControlButtons', getSceneControlButtons);
}

async function getSceneControlButtons(controls: any[]) {
  const tokenControls = controls.find(c => c.name === "token");
  if (!tokenControls) return;
  tokenControls.tools.push({
    name: "advance-phase",
    title: "Advance Phase",
    icon: "fas fa-step-forward",
    button: true,
    onClick: async () => PhaseManager.advancePhase(1).catch(err => {
      console.error(`${moduleId} | Advance failed`, err);
      ui.notifications?.error(`Easy Phasey: ${err?.message ?? err}`);
    })
  });
}
