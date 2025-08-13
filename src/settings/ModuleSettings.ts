import { localize } from '@/utils';
import { ModuleId, moduleId } from './index';

import type { PhaseConfig } from '@/types';

export const SETTINGS = {
  selectedFolderId: "selectedFolderId",   // the id of the currently selected folder
  lastMasterSceneId: "lastMasterSceneId",   // the id of the last used master scene (so we can delete when needed)
};

export enum SettingKey {
  // global, internal
  selectedFolderId = 'selectedFolderId',
  lastMasterSceneId = 'lastMasterSceneId', 
}

export type SettingKeyType<K extends SettingKey> =
    K extends SettingKey.selectedFolderId ? (string | null) :
    K extends SettingKey.lastMasterSceneId ? (string | null) :
    never;  

export class ModuleSettings {
  // note that this returns the object directly, so if it's an object or array, if a reference
  public static get<T extends SettingKey>(setting: T): SettingKeyType<T> {
    return game.settings.get(moduleId, setting) as SettingKeyType<T>;
  }

  // this gets something safe to modify
  public static getClone<T extends SettingKey>(setting: T): SettingKeyType<T> {
    return foundry.utils.deepClone(ModuleSettings.get(setting));
  }

  public static async set<T extends SettingKey>(setting: T, value: SettingKeyType<T>): Promise<void> {
    // @ts-ignore - not sure how to fix the typing
    await game.settings.set(moduleId, setting, value as SettingKeyType<setting>);
  }

  private static registerSetting(settingKey: SettingKey, settingConfig: ClientSettings.RegisterData<ClientSettings.Type, ModuleId, SettingKey>) {
    game.settings.register(moduleId, settingKey, settingConfig);
  }

  private static registerMenu(settingKey: SettingKey, settingConfig: ClientSettings.RegisterSubmenu) {
    game.settings.registerMenu(moduleId, settingKey, settingConfig);
  }

  // these are global menus (shown at top)
  private static menuParams: (Partial<ClientSettings.SettingSubmenuConfig> & { settingID: SettingKey })[] = [
  ];

  // these are local menus (shown at top)
  private static localMenuParams: (Partial<ClientSettings.SettingSubmenuConfig> & { settingID: SettingKey })[] = [
  ];

  // these are globals shown in the options
  // name and hint should be the id of a localization string
  private static displayParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
  ];

  // these are client-specific and displayed in settings
  private static localDisplayParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
  ];

  // these are globals only used internally
  private static internalParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
    {
      name: "Selected Folder Id",
      hint: "The id of the currently selected folder.",
      settingID: SettingKey.selectedFolderId,
      default: null,
      type: String,
    },
    {
      name: "Last Master Scene Id",
      settingID: SettingKey.lastMasterSceneId,
      default: null,
      type: String,
    },
  ];
  
  // these are client-specific only used internally
  private static localInternalParams: (Partial<ClientSettings.SettingConfig> & { settingID: SettingKey })[] = [
  ];

  public static register(): void {
    for (let i=0; i<ModuleSettings.menuParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.menuParams[i];

      ModuleSettings.registerMenu(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        restricted: false,
      });
    }

    for (let i=0; i<ModuleSettings.localMenuParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.localMenuParams[i];
      ModuleSettings.registerMenu(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        restricted: false,
      });
    }

    for (let i=0; i<ModuleSettings.localMenuParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.localMenuParams[i];
      ModuleSettings.registerMenu(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        restricted: true,
      });
    }

    for (let i=0; i<ModuleSettings.displayParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.displayParams[i];
      ModuleSettings.registerSetting(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        scope: 'world',
        config: true,
      });
    }

    for (let i=0; i<ModuleSettings.localDisplayParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.localDisplayParams[i];
      ModuleSettings.registerSetting(settingID, {
        ...settings,
        name: settings.name ? localize(settings.name) : '',
        hint: settings.hint ? localize(settings.hint) : '',
        scope: 'client',
        config: true,
      });
    }

    for (let i=0; i<ModuleSettings.internalParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.internalParams[i];
      ModuleSettings.registerSetting(settingID, {
        ...settings,
        scope: 'world',
        config: false,
      });
    }

    for (let i=0; i<ModuleSettings.localInternalParams.length; i++) {
      const { settingID, ...settings} = ModuleSettings.localInternalParams[i];
      ModuleSettings.registerSetting(settingID, {
        ...settings,
        scope: 'client',
        config: false,
      });
    }
  }
}
