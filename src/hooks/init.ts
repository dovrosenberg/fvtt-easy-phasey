import { moduleId, ModuleSettings } from '@/settings';
import { KeyBindings } from '@/settings/KeyBindings';

export function registerForInitHook() {
  Hooks.once('init', init);
}

async function init(): Promise<void> {
  // initialize settings first, so other things can use them
  ModuleSettings.register();
  KeyBindings.register();
  console.log(`${moduleId} | Initialized`);
}
