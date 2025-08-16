import { ModuleSettings, SettingKey } from '@/settings';
import { PhaseFolder } from './PhaseFolder';
import { localize } from '@/utils/game';

// these are properties to copy
const SCENE_DATA = [
  // 'active',   // don't mess with active
  'background',
  'backgroundColor',
  'base',
  'cycle',
  'darknessLevel',
  'drawings',
  'environment',
  'flags',
  'fog',
  'foreground',
  'foregroundElevation',
  'grid',
  'height',
  'initial',
  'journal',
  'journalEntryPage',
  'lights',
  // 'name',    // we handle this separately
  'navigation',
  'navName',
  'navOrder',
  'notes',
  'ownership',
  'padding',
  'playlist',
  'playlistSound',
  'regions',
  'sort',
  'sounds',
  'templates',
  'thumb',
  'tiles',
  // 'tokens',   // we handle these separately
  'tokenVision',
  'walls',
  'weather',
  'width',
]

export class PhaseManager { 
  public static get phaseInProgress() {
    // only in progress if there's a current folder with a master scene that is active
    const folderId = ModuleSettings.get(SettingKey.selectedFolderId);
    if (!folderId) 
      return false;

    // we can't use fromId because this can't be async, so 
    //    we do it all manually
    const folder = game.folders?.get(folderId);
    const phaseFolder = new PhaseFolder(folder);
    if (!folder || !phaseFolder || !phaseFolder.masterSceneId) 
      return false;

    const masterScene = game.scenes?.get(phaseFolder.masterSceneId);
    if (!masterScene || !masterScene.active) 
      return false;
    
    return true;
  }

  public static async activate(folder: PhaseFolder) {
    // reset everything
    await ModuleSettings.set(SettingKey.selectedFolderId, folder.id);
    
    folder.currentPhaseIndex = 0;
    await folder.save();

    // this will create the new master scene
    await PhaseManager.advancePhase(0);
  }
  
  /**
   * For now, this will wrap around
   * @param stepsToAdvance Number of steps to advance (negative to go backward)
   */
  public static async advancePhase(stepsToAdvance: number = 1) {
    const folderId = ModuleSettings.get(SettingKey.selectedFolderId);
    if (!folderId) 
      throw new Error("No folder selected.");

    const folder = await PhaseFolder.fromId(folderId);
    if (!folder) 
      throw new Error("Folder not found.");
    
    // Determine next phase index 
    let idx = (folder.currentPhaseIndex + stepsToAdvance + folder.phaseSceneIds.length) % folder.phaseSceneIds.length;
  
    // make sure there is at least one legit scene
    if (!folder.phaseSceneIds.some((sceneId) => !folder.skippedSceneIds.includes(sceneId))) {
      throw new Error("No valid scenes found.");
    }

    // get the current scene
    const currentScene = game.scenes?.get(folder.phaseSceneIds[folder.currentPhaseIndex]);
    if (!currentScene) 
      throw new Error("Current scene not found.");
    
    // skip forward until we get one not being skipped
    if (folder.skippedSceneIds.includes(folder.phaseSceneIds[idx])) {
      while (folder.skippedSceneIds.includes(folder.phaseSceneIds[idx])) {
        idx = (idx + 1 + folder.phaseSceneIds.length) % folder.phaseSceneIds.length;
      }

      if (idx === folder.currentPhaseIndex) {
        // this is the only valid scene
        ui.notifications?.warn(localize('notifications.noValidScenes'));
        return;
      }
    }

    const newScene = game.scenes?.get(folder.phaseSceneIds[idx]);
    if (!newScene) 
      throw new Error("Next phase scene not found.");

    // make sure we have a master scene
    let masterScene: Scene | undefined = undefined;
    
    if (folder.masterSceneId) {
      masterScene = game.scenes?.get(folder.masterSceneId);
    }
    if (!masterScene) {
      // Create master cloned from the current source scene
      masterScene = await Scene.create(newScene.toObject());

      if (!masterScene) 
        throw new Error("Failed to create master scene.");

      await masterScene.update({name: `Easy Phasey ${localize('labels.masterScene')} - ${folder.raw.name}`})

      folder.masterSceneId = masterScene.id;
      await folder.save();

      await masterScene.activate();

      // alert GM if they're looking at some other scene
      if (masterScene.id !== game.user.viewedScene) {
        ui.notifications?.warn(localize('notifications.masterSceneNotActive'));
      }
    } else {
      if (!masterScene.active) {
        await masterScene.activate();

        // alert GM if they're looking at some other scene
        if (masterScene.id !== game.user.viewedScene) {
          ui.notifications?.warn(localize('notifications.masterSceneNotActive'));
        }
      }

      await PhaseManager.swapSceneDisplay(masterScene, newScene, folder.mergeTokens);
    }
    
    // update index
    folder.currentPhaseIndex = idx;
    await folder.save();
  }
  
  private static async swapSceneDisplay(master: Scene, source: Scene, mergeTokens: boolean) {
    // Update display-only fields
    const update: Partial<Scene> = {};
  
    for (const field of SCENE_DATA) {
      if (field in source) 
        update[field] = source[field];
    }

    // need to add in the tokens
    if (mergeTokens) {
      await master.createEmbeddedDocuments('Token', source.getEmbeddedCollection('Token').contents);
    } else {
      // if we're not merging, we don't need to change the tokens at all
    }

    await master.update(update);
  
    // TODO Minimize flicker: for walls specifically, create before delete handled in replaceEmbedded
    if (canvas?.ready) await canvas.draw();
  }
}