import { ModuleSettings, SettingKey } from "@/settings";

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
  /**
   * 
   * @param stepsToAdvance Number of steps to advance (negative to go backward)
   */
  public static async advancePhase(stepsToAdvance: number = 1) {
    const cfg = ModuleSettings.get(SettingKey.config);
    if (!cfg.phaseSceneIds?.length) 
      throw new Error("Configure phases in Module Settings.");
  
    // Determine next phase index using a world setting
    let idx = (ModuleSettings.get(SettingKey.phaseIndex) as number | undefined) ?? 0;
  
    const nextSceneId = cfg.phaseSceneIds[idx % cfg.phaseSceneIds.length];
    const sourceScene = game.scenes?.get(nextSceneId);
    if (!sourceScene) 
      throw new Error("Next phase scene not found.");
  
    let masterScene: Scene | undefined = cfg.masterSceneId ? game.scenes?.get(cfg.masterSceneId) : undefined;
    if (!masterScene) {
      // Create master from first phase on first run
      const firstScene = game.scenes?.get(cfg.phaseSceneIds[0]);
      if (!firstScene) 
        throw new Error("First phase scene not found to create master.");
      
      masterScene = await Scene.create(firstScene.toObject()) as Scene;
      cfg.masterSceneId = masterScene.id ?? null;
      await ModuleSettings.set(SettingKey.config, cfg);
    }
  
    await PhaseManager.swapSceneDisplay(masterScene, sourceScene);
  
    // update index
    idx = (idx + stepsToAdvance) % cfg.phaseSceneIds.length;
    await ModuleSettings.set(SettingKey.phaseIndex, idx);
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
    const doc = d as foundry.abstract.Document;
    const persist = getProperty(doc, `flags.${MODULE_ID}.persist`);
    if (!persist) toDeleteIds.push(doc.id!);
  }

  // Prepare new docs (strip _id)
  const toCreate = srcCollection.map((d: any) => {
    const raw = d.toObject();
    delete raw._id;
    // Copy flags as-is; persist flag on source will carry over if present
    return raw;
  });

  // Special handling for walls to minimize vision flicker: create first then delete
  if (docName === "Wall") {
    if (toCreate.length) await master.createEmbeddedDocuments(docName, toCreate);
    if (toDeleteIds.length) await master.deleteEmbeddedDocuments(docName, toDeleteIds);
  } else {
    if (toDeleteIds.length) await master.deleteEmbeddedDocuments(docName, toDeleteIds);
    if (toCreate.length) await master.createEmbeddedDocuments(docName, toCreate);
  }
}
