import { moduleId } from '@/settings';

export function registerForReadyHook() {
  Hooks.once('ready', ready);
}

async function ready(): Promise<void> {
  console.log(`${moduleId} | Ready`);
}