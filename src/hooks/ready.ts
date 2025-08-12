export function registerForReadyHook() {
  Hooks.once('ready', ready);
}

async function ready(): Promise<void> {
  console.log(`${MODULE_ID} | Ready`);
}