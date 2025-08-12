import { moduleId } from '@/settings';
import { PhaseManager } from '@/classes';
import { PhaseConfigApp } from '@/applications/PhaseConfigApp';

const CONTROL_NAME = 'easy-phasey';

export function registerForSceneControlButtons() {
  Hooks.on('getSceneControlButtons', getSceneControlButtons);
}

async function getSceneControlButtons(controls: Record<string, foundry.applications.ui.SceneControls.Control>) {
  // Insert our control at the end 
  let lastOrder = -1;
  for (const c of Object.values(controls)) {
    lastOrder = Math.max(lastOrder, c.order);
  }

  // TODO: set visible on forward/back to false when there's no scene configured
  const control = {
    name: CONTROL_NAME,
    order: lastOrder + 1,
    title: 'Easy Phasey',
    icon: 'fas fa-layer-group',
    activeTool: '',
    tools: {
      'forward': {
        name: 'forward',
        title: 'Next Phase',
        icon: 'fas fa-step-forward',
        button: true,
        order: 1,
        onChange: async () => PhaseManager.advancePhase(1).catch(err => {
          console.error(`${moduleId} | Forward failed`, err);
          ui.notifications?.error(`Easy Phasey: ${err?.message ?? err}`);
        })
      },
      'back': {
        name: 'back',
        title: 'Previous Phase',
        icon: 'fas fa-step-backward',
        button: true,
        order: 2,
        onChange: async () => PhaseManager.advancePhase(-1).catch(err => {
          console.error(`${moduleId} | Back failed`, err);
          ui.notifications?.error(`Easy Phasey: ${err?.message ?? err}`);
        })
      },
      'config': {
        name: 'config',
        title: 'Configure Phases',
        icon: 'fas fa-gear',
        button: true,
        order: 3,
        onChange: async () => {
          try {
            new PhaseConfigApp().render(true);
          } catch (err: any) {
            console.error(`${moduleId} | Config open failed`, err);
            ui.notifications?.error(`Easy Phasey: ${err?.message ?? err}`);
          }
        }
      },
    },
  };

  controls[CONTROL_NAME] = control;
}
