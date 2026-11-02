import { ModuleSettings, SettingKey } from '@/settings';
import { PhaseFolder } from './PhaseFolder';
import { isV14, localize } from '@/utils/game';

// scene-level fields that moved onto Level documents in v14; only copied directly on v13
const V13_ONLY_SCENE_DATA = [
  'background',
  'backgroundColor',   // v14: Level#background.color
  'foreground',
  'foregroundElevation',
];

// embedded documents that are defined by each phase scene; on every swap the master's are deleted and
//    replaced with the source's.  Tokens and Levels are handled separately.
// In v14 each of these has a `levels` set that needs translating to the master's level ids.
const REPLACED_EMBEDDED = [
  'AmbientLight',
  'AmbientSound',
  'Drawing',
  'Note',
  'Region',
  'Tile',
  'Wall',
];

// these are properties to copy
// embedded collections are not included - see REPLACED_EMBEDDED
const SCENE_DATA = [
  // 'active',   // don't mess with active
  'background',
  'backgroundColor',
  'environment',
  'flags',
  'fog',
  'foreground',
  'foregroundElevation',
  'grid',
  'height',
  'initial',
  'initialLevel',
  'journal',
  'journalEntryPage',
  // 'name',    // we handle this separately
  'navigation',
  'navName',
  'navOrder',
  'ownership',
  'padding',
  'shiftX',
  'shiftY',
  'playlist',
  'playlistSound',
  'sort',
  'thumb',
  'tokenVision',
  'transition',
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
    if (!folder) {
      if (game.ready) {
        // clear this up for later
        void ModuleSettings.set(SettingKey.selectedFolderId, null);
      }

      return false;
    }

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
    const update: Record<string, any> = {};
    const v14 = isV14();

    for (const field of SCENE_DATA) {
      // in v14 these live on Level documents and writes to the Scene are dropped
      if (v14 && V13_ONLY_SCENE_DATA.includes(field))
        continue;

      if (field in source) {
        // For embedded collections (notes, regions, tiles, etc.) we don't want to copy them
        if (!source[field] || !source[field].documentName)
          update[field] = source[field];
      }
    }

    // v14: make the master's levels match the source's; levelMap translates source level ids to master level ids
    // (v13: no levels, so the map stays empty)
    const levelMap = v14 ? await PhaseManager.syncLevels(master, source) : new Map<string, string>();

    if (v14) {
      const initialLevel = (source as any).initialLevel;
      update.initialLevel = initialLevel ? (levelMap.get(initialLevel) ?? null) : null;
    }

    // need to add in the tokens
    if (mergeTokens) {
      const tokens = source.tokens.contents.map((token) => {
        const data = token.toObject() as Record<string, any>;
        // Token#level is required; unmapped ids fall back to the master's initial level
        if (v14)
          data.level = levelMap.get(data.level) ?? (master as any).initialLevel?.id;
        return data;
      });

      await master.createEmbeddedDocuments('Token', tokens as any);
    } else {
      // if we're not merging, we don't need to change the tokens at all
    }

    // replace walls, lights, tiles, etc. with the ones defined on the source phase
    for (const docName of REPLACED_EMBEDDED)
      await PhaseManager.replaceEmbedded(master, source, docName, v14 ? levelMap : null);

    await master.update(update);

    // TODO Minimize flicker: for walls specifically, create before delete handled in replaceEmbedded
    if (canvas?.ready) await canvas.draw();
  }

  /**
   * Deletes all of one embedded document type from the master and recreates them from the source.
   * Ids are kept so references between documents (ex. region behaviors) still resolve.
   * @param levelMap v14: source level id -> master level id, used to translate each document's `levels`; null on v13
   */
  private static async replaceEmbedded(master: Scene, source: Scene, docName: string, levelMap: Map<string, string> | null) {
    const oldIds = (master.getEmbeddedCollection(docName as any) as any).contents.map((doc: any) => doc.id as string);
    if (oldIds.length)
      await master.deleteEmbeddedDocuments(docName as any, oldIds);

    const newData = (source.getEmbeddedCollection(docName as any) as any).contents.map((doc: any) => {
      const data = doc.toObject() as Record<string, any>;
      if (levelMap && data.levels)
        data.levels = PhaseManager.remapLevelIds(data.levels, levelMap);
      return data;
    });

    if (newData.length)
      await master.createEmbeddedDocuments(docName as any, newData, { keepId: true });
  }

  /**
   * v14 only.  Makes the master scene's Level documents match the source scene's.
   * Existing master levels are updated in place (matched by sort order) so their ids stay stable and
   * tokens already on the master keep a valid `level`.  Extra source levels are created; surplus
   * master levels are deleted after moving their tokens to the last remaining level.
   * Other placeables don't need fixing because swapSceneDisplay replaces them all.
   * @returns map of source level id -> master level id
   */
  private static async syncLevels(master: Scene, source: Scene): Promise<Map<string, string>> {
    // elevation.bottom is nullable (null = -Infinity)
    const bottom = (level: any): number => level.elevation?.bottom ?? Number.NEGATIVE_INFINITY;
    const bySort = (a: any, b: any) => (a.sort - b.sort) || (bottom(a) === bottom(b) ? 0 : (bottom(a) < bottom(b) ? -1 : 1));
    const sourceLevels = [...(source as any).levels.contents].sort(bySort);
    const masterLevels = [...(master as any).levels.contents].sort(bySort);

    const levelMap = new Map<string, string>();

    // pair up existing levels
    const pairCount = Math.min(sourceLevels.length, masterLevels.length);
    for (let i = 0; i < pairCount; i++)
      levelMap.set(sourceLevels[i].id, masterLevels[i].id);

    // create any extra source levels; visibility gets fixed below once all ids are known
    const toCreate = sourceLevels.slice(pairCount).map((level) => {
      const { _id, ...data } = level.toObject();
      data.visibility = { ...data.visibility, levels: [] };
      return data;
    });

    if (toCreate.length) {
      const created = await master.createEmbeddedDocuments('Level' as any, toCreate as any) as any[];
      for (let i = 0; i < created.length; i++)
        levelMap.set(sourceLevels[pairCount + i].id, created[i].id);
    }

    // copy source data onto all mapped master levels, translating level references
    const updates = sourceLevels.map((level) => {
      const { _id, ...data } = level.toObject();
      data.visibility = {
        ...data.visibility,
        levels: PhaseManager.remapLevelIds(data.visibility?.levels ?? [], levelMap),
      };
      return { ...data, _id: levelMap.get(level.id) };
    });

    if (updates.length)
      await master.updateEmbeddedDocuments('Level' as any, updates as any);

    // remove surplus master levels, first moving their tokens somewhere valid
    const surplusIds = masterLevels.slice(pairCount).map((level) => level.id as string);
    if (surplusIds.length) {
      const fallbackId = masterLevels[pairCount - 1]?.id ?? levelMap.get(sourceLevels[sourceLevels.length - 1]?.id);

      if (fallbackId) {
        const tokenUpdates = master.tokens.contents
          .filter((token) => surplusIds.includes((token as any).level))
          .map((token) => ({ _id: token.id, level: fallbackId }));

        if (tokenUpdates.length)
          await master.updateEmbeddedDocuments('Token', tokenUpdates as any);
      }

      await master.deleteEmbeddedDocuments('Level' as any, surplusIds);
    }

    return levelMap;
  }

  /** translate a list/set of source level ids to master level ids, dropping any that don't map */
  private static remapLevelIds(ids: Iterable<string>, levelMap: Map<string, string>): string[] {
    return Array.from(ids)
      .map((id) => levelMap.get(id))
      .filter((id): id is string => !!id);
  }
}