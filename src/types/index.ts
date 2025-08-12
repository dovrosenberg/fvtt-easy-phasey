export type * from './global.d.ts';

export interface PhaseConfig {
  folderId: string | null;
  phaseSceneIds: string[]; // ordered list of scene ids
  masterSceneId: string | null; // if null, create from first phase on first advance
}
