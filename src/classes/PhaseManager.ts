import { ModuleSettings, SettingKey, moduleId } from "@/settings";
import { PhaseFolder } from "./PhaseFolder";

const WHITELIST_DOCS = [
  "AmbientLight",
  "AmbientSound",
  "Note",
  "Drawing",
  "MeasuredTemplate",
  "Tile",
  "Wall",
] as const;

type Whitelisted = typeof WHITELIST_DOCS[number];

export class PhaseManager { 
  public static async activate(folder: PhaseFolder) {
    // reset everything
    await ModuleSettings.set(SettingKey.selectedFolderId, folder.id);
    
    await PhaseManager.cleanupMasterScene();

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

    // skip forward until we get one not being skipped
    while (folder.skippedSceneIds.includes(folder.phaseSceneIds[idx])) {
      idx = (idx + 1 + folder.phaseSceneIds.length) % folder.phaseSceneIds.length;
    }

    if (idx === folder.currentPhaseIndex) {
      // this is the only valid scene
      ui.notifications?.warn('Easy Phasey: No other valid scenes found.');
      return;
    }

    const sourceScene = game.scenes?.get(folder.phaseSceneIds[idx]);
    if (!sourceScene) 
      throw new Error("Next phase scene not found.");

    // make sure we have a master scene
    let masterScene: Scene | undefined = undefined;
    let masterSceneId = ModuleSettings.get(SettingKey.masterSceneId);
    
    if (masterSceneId) {
      masterScene = game.scenes?.get(masterSceneId);
    }
    if (!masterScene) {
      // Create master cloned from the current source scene
      masterScene = await Scene.create(sourceScene.toObject());

      if (!masterScene) 
        throw new Error("Failed to create master scene.");

      await ModuleSettings.set(SettingKey.masterSceneId, masterScene.id ?? null);
    }

    await PhaseManager.swapSceneDisplay(masterScene, sourceScene);
    
    // update index
    folder.currentPhaseIndex = idx;
    await folder.save();
  }
  
  public static async cleanupMasterScene() {
    const masterSceneId = ModuleSettings.get(SettingKey.masterSceneId);
    if (!masterSceneId) 
      return;
    
    const masterScene = game.scenes?.get(masterSceneId);
    if (!masterScene) 
      return;
    
    await masterScene.delete();
    await ModuleSettings.set(SettingKey.masterSceneId, null);
  }
  
  private static async swapSceneDisplay(master: Scene, source: Scene) {
    // Update display-only fields
    const update: Partial<Scene> = {};
  
    // Background
    if ('backgroundColor' in source) 
      update.backgroundColor = source.backgroundColor;
    
    if ('background' in source) 
      update.background = source.background;
  
    // Foreground-like handling: copy foreground field if exists in this scene
    if ('foreground' in source) 
      update.foreground = source.foreground;
  
    // Weather / Playlist / Token vision
    if ('weather' in source) 
      update.weather = source.weather;
    
    if ("playlist" in source) {
      throw new Error ('Playlist not implemented');
      // const pid = source.playlist;
      // if (!pid || game.playlists?.get?.(pid))   // only set if missing or exists
      //   update.playlist = pid; 
    }

    // TODO: I don't think these are valid anymore
    if ("playlistSound" in source) 
      update.playlistSound = source.playlistSound;
    if ("tokenVision" in source) 
      update.tokenVision = source.tokenVision;
  
    await master.update(update);
  
    // Replace embedded docs by type
    for (const docName of WHITELIST_DOCS) {
      await replaceEmbedded(master, source, docName);
    }
  
    // Minimize flicker: for walls specifically, create before delete handled in replaceEmbedded
    if (canvas?.ready) await canvas.draw();
  }
}

async function replaceEmbedded(master: Scene, source: Scene, docName: Whitelisted) {
  const collection = master.getEmbeddedCollection(docName);
  const srcCollection = source.getEmbeddedCollection(docName);

  // Build list of docs to keep (persist flag)
  const toDeleteIds: string[] = [];
  for (const d of collection) {
    const doc = d as foundry.abstract.Document<any, any, any>;
    const persist = getProperty(doc, `flags.${moduleId}.persist`);
    if (!persist) toDeleteIds.push(doc.id!);
  }

  // Prepare new docs (strip _id)
  const toCreate = srcCollection.map((d: any) => {
    const raw = d.toObject();
    delete raw._id;
    // Copy flags as-is; persist flag on source will carry over if present
    return raw;
  });

  // Special handling for walls to minimize token vision flicker: create first then delete
  if (docName === "Wall") {
    if (toCreate.length) await master.createEmbeddedDocuments(docName, toCreate);
    if (toDeleteIds.length) await master.deleteEmbeddedDocuments(docName, toDeleteIds);
  } else {
    if (toDeleteIds.length) await master.deleteEmbeddedDocuments(docName, toDeleteIds);
    if (toCreate.length) await master.createEmbeddedDocuments(docName, toCreate);
  }
}
