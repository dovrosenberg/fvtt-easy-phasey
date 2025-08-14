import { 
  PhaseFolderDoc,
} from '@/documents';
import { FlagSettings, } from '@/settings/DocumentFlags';
import { moduleId } from '@/settings';
import { FolderFlagKey, FolderFlagType } from '@/documents/PhaseFolder';


/**
 * Sometimes we want to save multiple flags at once as part of an update.  But we need to make
 * sure we properly protect them.  This takes an object that will be saved to `doc.flags` and
 * returns the protected version.
 * @param doc 
 * @param flag 
 * @param value 
 */
type FlagsObject< 
  DocType extends ValidDocTypes,
  FK extends FlagKey<DocType> = FlagKey<DocType>
> = {
  [Flag in FK]: FlagType<DocType, Flag>
};

/** 
 * The allowed types to use flags (our types)
 */
type ValidDocTypes = PhaseFolderDoc;


/**
 * Map each ValidDocType to its configuration
 */
type FlagKey<T extends ValidDocTypes> = 
  T extends PhaseFolderDoc ? FolderFlagKey :
  never;

type FlagType<T extends ValidDocTypes, K extends FlagKey<T>=FlagKey<T>> = 
  T extends PhaseFolderDoc ? (K extends FolderFlagKey ? FolderFlagType<K> : never) :
  never;

  interface DocumentWithFlagsConstructor {
    _documentName: string;
    _flagSettings: FlagSettings<any, any>[];
  }

export class DocumentWithFlags<DocType extends ValidDocTypes> {
  /** the document name of the foundry document we're wrapping */
  protected static _documentName: string;

  // not static because I couldn't figure out the typescript way to 
  // tie it to DocType
  protected static _flagSettings: FlagSettings<
    FlagKey<ValidDocTypes>, 
    {[K in FlagKey<ValidDocTypes>]: FlagType<ValidDocTypes>}
  >[];
  
  protected _doc: DocType;
  protected _cumulativeUpdate: Record<string, any>;   // tracks the update object based on changes made

  constructor(doc: DocType, typeFlagKey: FlagKey<DocType>) {
    // clone it to avoid unexpected changes, also drop the proxy
    this._doc = foundry.utils.deepClone(doc);

    // make sure it's the right kind of document
    if (doc.documentName !== (this.constructor as unknown as  DocumentWithFlagsConstructor)._documentName || !this.getFlag(typeFlagKey))
      throw new Error('Invalid document type in DocumentWithFlags constructor');

    this._cumulativeUpdate = {};
  }

  /** This should be called after construction to ensure everything asynchronous is ready */
  public setup = async (): Promise<void> => {
    return this.setFlagDefaults();
  }

  protected getFlag = <
    FK extends FlagKey<DocType> = FlagKey<DocType>,
    FT extends FlagType<DocType, FK> = FlagType<DocType, FK>
  > (flag: FK): FT => {
    const config = this.getConfig(flag);

    // @ts-ignore - not sure how to fix the typing
    const setting = (this._doc.getFlag(moduleId, flag) ?? foundry.utils.deepClone(config.default));

    if (config.keyedByUUID)
      return unprotect(setting as Record<string, any>) as FT;
    else
      return setting as unknown as FT;
  };

  private getConfig = <
    FK extends FlagKey<DocType> = FlagKey<DocType>,
    FT extends FlagType<DocType, FK> = FlagType<DocType, FK>
  >(flag: FK): FlagSettings<FK, {[K in FK]: FT}> => {
    const config = (this.constructor as unknown as  DocumentWithFlagsConstructor)._flagSettings.find((s)=>s.flagId===flag);

    if (!config)
      throw new Error('Bad flag in DocumentFlags.getConfig()');

    return config as FlagSettings<FK, {[K in FK]: FT}>;  
  };

  protected setFlag = async <
    FK extends FlagKey<DocType> = FlagKey<DocType>,
    FT extends FlagType<DocType, FK> = FlagType<DocType, FK>
  > (flag: FK, value: FT | null): Promise<void> => {
    const config = this.getConfig(flag);

    if (config.keyedByUUID && value) {
      // @ts-ignore - not sure how to fix the typing
      await this._doc.setFlag(moduleId, flag, protect(value as Record<string, any>));
    } else {
      // @ts-ignore - not sure how to fix the typing
      await this._doc.setFlag(moduleId, flag, value);
    }
  };

  /** 
   * Remove a key from an object flag.  Generally most useful for things keyed by uuid.  For other fields, it will
   * attempt to unset `flag.key`, or if key is missing just unsets `flag`
   */
  protected unsetFlag = async <
    FK extends FlagKey<DocType> = FlagKey<DocType>,
  > (flag: FK, key?: string): Promise<void> => {
    const config = this.getConfig(flag);

    if (config.keyedByUUID && key) {
      // @ts-ignore - not sure how to fix the typing
      await this._doc.unsetFlag(moduleId, `${flag}.${swapString(key, true)}`);
    } else if (!config.keyedByUUID && key){
      // @ts-ignore - not sure how to fix the typing
      await this._doc.unsetFlag(moduleId, `${flag}${key ? '.' + key : ''}`);
    } else {
      // try to unset the whole flag
      // @ts-ignore - not sure how to fix the typing
      await this._doc.unsetFlag(moduleId, flag);
    }
  };

  protected prepareFlagsForUpdate = <
    FK extends FlagKey<DocType> = FlagKey<DocType>,
  > (flagsObject: FlagsObject<DocType, FK>): FlagsObject<DocType, FK> => {
    const retval = foundry.utils.deepClone(flagsObject);

    // loop over each member of the flags object and see what needs to be protected
    for (const flag in retval) {
      const config = this.getConfig(flag as FK);

      if (config.keyedByUUID && retval[flag]) {
        retval[flag] = protect(retval[flag] as Record<string, any>) as FlagType<DocType, FK>;
      }
    }

    return retval;
  };

  /**
   * Updates the _cumulativeUpdate object with a new value for a given flag.
   * 
   * @param flag - The flag key to update
   * @param value - The value to set
   */
  protected updateCumulative = <
    FK extends FlagKey<DocType> = FlagKey<DocType>,
    FT extends FlagType<DocType, FK> = FlagType<DocType, FK>
  >(flag: FK, value: FT): void => {
    this._cumulativeUpdate = {
      ...this._cumulativeUpdate,
      flags: {
        ...this._cumulativeUpdate.flags,
        [moduleId]: {
          ...(this._cumulativeUpdate.flags?.[moduleId] || {}),
          [flag]: value
        }
      }
    };
  };

  /**
   * Adds all the default flag values to the document.  Overrides anything already there.  
   * @returns 
   */
  private setFlagDefaults = async (): Promise<void> => {
    const flagSettings = (this.constructor as unknown as  DocumentWithFlagsConstructor)._flagSettings;

    if (!this._doc || !flagSettings)
      throw new Error('Bad document/flag in DocumentWithFlags.setFlagDefaults()');

    // We can't use get() or set() because they rely on the doc type being set already

    for (let i=0; i < flagSettings.length; i++) {
      const flagId = flagSettings[i].flagId as FlagKey<DocType>;

      const value = foundry.utils.deepClone(flagSettings[i].default);

      if (flagSettings[i].keyedByUUID && value) {
        // @ts-ignore
        await this._doc.setFlag(moduleId, flagId, protect(value as Record<string, any>) as FlagType<DocType, typeof flagId>);
      } else {
        // @ts-ignore
        await this._doc.setFlag(moduleId, flagId, value as FlagType<DocType, typeof flagId>);
      }        
    }
  };
}


/**
 * Swaps characters in a string based on the protect flag.
 * If protect is true, replaces all occurrences of '.' with '#&#'.
 * If protect is false, replaces all occurrences of '#&#' with '.'.
 * 
 * @param original - The original string to be modified.
 * @param protect - A boolean flag indicating whether to protect or unprotect the string.
 * @returns The modified string with characters swapped based on the protect flag.
 */

const swapString = (original: string, protect: boolean): string => {
  return protect ? original.replaceAll('.', '#&#') : original.replaceAll('#&#', '.');
}

/**
 * protects the object from unexpected things that foundry saving does
 */
const protect = <T extends Record<string, any>>(flagValue: T): T => { 
  // replace all the keys
  const retval = {};

  for (const [key, value] of Object.entries(flagValue as Record<string, any>)) {
    retval[swapString(key, true)] = value;    
  }

  return retval as T;
};

/**  
 * convert the array to an object
 */ 
const unprotect = <T extends Record<string, any>>(flagValue: T): T => { 
  const retval = {};
  
  for (const [key, value] of Object.entries(flagValue as Record<string, any>)) {
    retval[swapString(key, false)] = value;    
  }

  return retval as T;
};