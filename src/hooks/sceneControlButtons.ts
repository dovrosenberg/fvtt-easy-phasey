import { moduleId } from '@/settings';
import { PhaseManager } from '@/classes';
import { PhaseConfigApp } from '@/applications/PhaseConfigApp';
import { localize } from '@/localize';

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

  const isPhaseInProgress = PhaseManager.phaseInProgress;

  const control = {
    name: CONTROL_NAME,
    order: lastOrder + 1,
    title: 'Easy Phasey',
    icon: 'fas fa-layer-group',
    activeTool: '',
    tools: {
      'forward': {
        name: 'forward',
        title: localize('controls.nextPhase'),
        icon: 'fas fa-step-forward',
        button: true,
        order: 1,
        visible: isPhaseInProgress,
        onChange: async () => PhaseManager.advancePhase(1).catch(err => {
          console.error(`${moduleId} | Forward failed`, err);
          ui.notifications?.error(`Easy Phasey: ${err?.message ?? err}`);
        })
      },
      'back': {
        name: 'back',
        title: localize('controls.prevPhase'),
        icon: 'fas fa-step-backward',
        button: true,
        order: 2,
        visible: isPhaseInProgress,
        onChange: async () => { 
          try {
            await PhaseManager.advancePhase(-1);
          } catch (err: any) {
            console.error(`${moduleId} | Back failed`, err);
            ui.notifications?.error(`Easy Phasey: ${err?.message ?? err}`);
          }
        }
      },
      'config': {
        name: 'config',
        title: 'Configure Phases',
        icon: 'fas fa-gear',
        button: true,
        order: 3,
        onChange: async () => {
          try {
            // make sure we have a folder with at least one scene in it
            const folders = game.folders?.filter((f: any) => f.type === 'Scene') ?? [];
            if (folders.length === 0) {
              ui.notifications?.warn(localize('notifications.noValidFolder'));
              return;
            }

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
