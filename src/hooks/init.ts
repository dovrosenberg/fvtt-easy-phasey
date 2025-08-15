import { moduleId, ModuleSettings } from '@/settings';

export function registerForInitHook() {
  Hooks.once('init', init);
}

async function init(): Promise<void> {
  // initialize settings first, so other things can use them
  ModuleSettings.register();
  console.log(`${moduleId} | Initialized`);
}
