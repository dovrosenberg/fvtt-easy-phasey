import { id } from '@module';
import { SettingKey, SettingKeyType } from './ModuleSettings';

export * from './ModuleSettings';

// NOTE: if the module ID changes, this needs to change... couldn't figure out how to automate it because
//    needed a static type
// Maybe?  I'm not actually sure it wouldn't keep working properly
export type ModuleId = 'easy-phasey';

// define the proper types for settings and flags
export const moduleId: ModuleId = id as ModuleId;

// settings
type EPSettings = {
  [K in SettingKey as `${ModuleId}.${K}`]: K extends SettingKey ? SettingKeyType<K> : never;
};

declare global {
  interface FlagConfig {
  }

  interface SettingConfig extends EPSettings {}
}
