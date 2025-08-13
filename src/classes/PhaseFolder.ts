import { FolderFlagKey, PhaseFolderDoc } from '@/documents/PhaseFolder';
import { DocumentWithFlags } from './DocumentWithFlags';
import { folderFlagSettings } from '@/documents/PhaseFolder';

// represents a scene folder filled with phases of a scene
export class PhaseFolder extends DocumentWithFlags<PhaseFolderDoc>{
  static override _documentName = 'Folder';
  static override _flagSettings = folderFlagSettings;

  // saved in flags
  private _currentPhaseIndex: number;
  private _phaseSceneIds: string[];
  private _skippedSceneIds: string[];

  /**
   * @param {PhaseFolderDoc} folderDoc - The Folder Foundry document
   */
  constructor(folderDoc: PhaseFolderDoc) {
    super(folderDoc, FolderFlagKey.isPhaseFolder);

    this._currentPhaseIndex = this.getFlag(FolderFlagKey.currentPhaseIndex);
    this._phaseSceneIds = this.getFlag(FolderFlagKey.phaseSceneIds);
    this._skippedSceneIds = this.getFlag(FolderFlagKey.skippedSceneIds);
  }

  static async fromUuid(folderId: string, options?: Record<string, any>): Promise<PhaseFolder | null> {
    const folderDoc = await fromUuid<PhaseFolderDoc>(folderId, options);

    if (!folderDoc)
      return null;
    else {
      const newFolder = new PhaseFolder(folderDoc);
      return newFolder;
    }
  }

  // get direct access to the document (ex. to hook to foundry's editor)
  get raw(): PhaseFolderDoc {
    return this._doc;
  }
  /** 
   * The uuid
   */
  public get uuid(): string {
    return this._doc.uuid;
  }

  /**
   * All of the scenes in this folder.
   */
  public get scenes(): Scene[] {
    return this.contents;
  }

  get currentPhaseIndex(): number {
    return this._currentPhaseIndex;
  }

  set currentPhaseIndex(value: number) {
    this._currentPhaseIndex = value;
    this.updateCumulative(FolderFlagKey.currentPhaseIndex, value);
  }

  public get currentPhase(): Scene | undefined {
    return game.scenes?.get(this._phaseSceneIds[this._currentPhaseIndex]);
  }

  public get phaseSceneIds(): readonly string[] {
    return this._phaseSceneIds;
  }

  public set phaseSceneIds(value: string[] | readonly string[]) {
    this._phaseSceneIds = [...value];
    this.updateCumulative(FolderFlagKey.phaseSceneIds, this._phaseSceneIds);
  }

  public get skippedSceneIds(): readonly string[] {
    return this._skippedSceneIds;
  }

  public set skippedSceneIds(value: string[] | readonly string[]) {
    this._skippedSceneIds = [...value];
    this.updateCumulative(FolderFlagKey.skippedSceneIds, this._skippedSceneIds);
  }

  /**
   * Updates a folder in the database.  
   * 
   * @returns {Promise<PhaseFolder | null>} The updated PhaseFolder, or null if the update failed.
   */
  public async save(): Promise<PhaseFolder | null> {
    let success = false;

    // note: no unlock needed for changes to the because it's not in a compendium

    const updateData = this._cumulativeUpdate;
    if (Object.keys(updateData).length !== 0) {
      // protect any complex flags
      if (updateData && updateData.flags[moduleId])
        updateData.flags[moduleId] = this.prepareFlagsForUpdate(updateData.flags[moduleId]);

      const retval = await this._doc.update(updateData) || null;
      if (retval) {
        this._doc = retval;
        this._cumulativeUpdate = {};

        success = true;
      }
    }

    return success ? this : null;
  }  
}

