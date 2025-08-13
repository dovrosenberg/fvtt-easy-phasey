import { FlagSettings } from '@/settings/DocumentFlags';

export interface PhaseFolderDoc extends Folder {
  __type: 'PhaseFolder';
}

export enum FolderFlagKey {
  isPhaseFolder = 'isPhaseFolder',    // used to mark the folder as one we're tracking
  currentPhaseIndex = 'currentPhaseIndex',   // the index of the current phase
  phaseSceneIds = 'phaseSceneIds',   // the (ordered) list of scenes
  skippedSceneIds = 'skippedSceneIds',   // scenes we're supposed to skip
}

export type FolderFlagType<K extends FolderFlagKey> =
  K extends FolderFlagKey.isPhaseFolder ? true :
  K extends FolderFlagKey.currentPhaseIndex ? number :
  K extends FolderFlagKey.phaseSceneIds ? string[] :
  K extends FolderFlagKey.skippedSceneIds ? string[] :
  never;

export const folderFlagSettings = [
  {
    flagId: FolderFlagKey.isPhaseFolder,
    default: true,
  },
  {
    flagId: FolderFlagKey.currentPhaseIndex,
    default: 1,
  },
  {
    flagId: FolderFlagKey.phaseSceneIds,
    default: [],
  },
  {
    flagId: FolderFlagKey.skippedSceneIds,
    default: [] as string[],
  },
] as FlagSettings<FolderFlagKey, {[K in FolderFlagKey]: FolderFlagType<K>}>[];

