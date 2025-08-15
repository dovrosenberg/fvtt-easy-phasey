import { registerForInitHook } from './init';
import { registerForReadyHook } from './ready';
import { registerForSceneControlButtons } from './sceneControlButtons';

export function registerForHooks() {
  registerForInitHook();
  registerForReadyHook();
  registerForSceneControlButtons();
}
