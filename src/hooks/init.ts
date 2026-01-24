import { moduleId, ModuleSettings } from '@/settings';
import { KeyBindings } from '@/settings/KeyBindings';
import { PhaseManager } from '@/classes';

export function registerForInitHook() {
  Hooks.once('init', init);
}

async function init(): Promise<void> {
  // initialize settings first, so other things can use them
  ModuleSettings.register();
  KeyBindings.register();
  console.log(`${moduleId} | Initialized`);

  // add to the api
  const module = game.modules.get(moduleId);
  if (module)
    module.api = {
      advancePhase: (stepsToAdvance: number) => PhaseManager.advancePhase(stepsToAdvance),
    };
}
