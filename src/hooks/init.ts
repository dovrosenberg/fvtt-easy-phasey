import { moduleId, ModuleSettings, } from '@/settings';
import { KeyBindings } from '@/settings/KeyBindings';
import { DOCUMENT_TYPES, EntryDataModel, SessionDataModel, PCDataModel } from '@/documents';

export function registerForInitHook() {
  Hooks.once('init', init);
}

Hooks.on("getSceneControlButtons", (controls: any[]) => {
  const tokenControls = controls.find(c => c.name === "token");
  if (!tokenControls) return;
  tokenControls.tools.push({
    name: "advance-phase",
    title: "Advance Phase",
    icon: "fas fa-step-forward",
    button: true,
    onClick: async () => advancePhase().catch(err => {
      console.error(`${MODULE_ID} | Advance failed`, err);
      ui.notifications?.error(`Easy Phasey: ${err?.message ?? err}`);
    })
  });
});



async function init(): Promise<void> {
  // // Load Quench test in development environment
  // if (import.meta.env.MODE === 'development') {
  //   await import('@test/index');
  // }

  // // initialize settings first, so other things can use them
  // ModuleSettings.register();

  // // put in place the key bindings
  // KeyBindings.register();

  registerSettings();
  console.log(`${MODULE_ID} | Initialized`);
}
