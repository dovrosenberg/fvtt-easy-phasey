import { moduleId, ModuleSettings, SettingKey } from '@/settings';
import type { PhaseConfig } from '@/types';

export class PhaseConfigApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)  {
  static DEFAULT_OPTIONS: any = {
    id: 'fep-config',
    title: 'Easy Phasey Configuration',
    width: 500,
    height: 'auto',
    resizable: true,
    position: { left: 100, top: 100 },
    classes: ['fep'],
    window: { title: 'Easy Phasey' },
    actions: {
      save: (event, app) => (app as PhaseConfigApp).onSave(event),
      add: (event, app) => (app as PhaseConfigApp).onAdd(event),
      remove: (event, app) => (app as PhaseConfigApp).onRemove(event),
      up: (event, app) => (app as PhaseConfigApp).onMove(event, -1),
      down: (event, app) => (app as PhaseConfigApp).onMove(event, 1),
      chooseFolder: (event, app) => (app as PhaseConfigApp).onChooseFolder(event),
    },
  };

  #config!: PhaseConfig;

  async _prepareContext(_options: any = {}) {
    this.#config = ModuleSettings.getClone(SettingKey.config);

    const folders = (game.folders?.filter((f: any) => f.type === 'Scene') ?? []) as any[];
    const phaseScenes = this.#config.phaseSceneIds
      .map((id) => game.scenes?.get(id))
      .filter((s): s is any => !!s);

    return {
      folders: folders.map((f: any) => ({ id: f.id, name: f.name })),
      selectedFolderId: this.#config.folderId,
      phaseScenes: phaseScenes.map((s: any) => ({ id: s.id, name: s.name })),
      allScenesInFolder: (this.#config.folderId
        ? game.scenes?.filter((s: any) => s.folder?.id === this.#config.folderId)
        : game.scenes) 
        ?.map((s: any) => ({ id: s.id, name: s.name })) ?? [],
      masterSceneId: this.#config.masterSceneId,
    };
  }

  static PARTS = {
    form: {
      template: `modules/${moduleId}/templates/phase-config.hbs`,
      id: '',
      classes: [],
      scrollable: [],
    },
  } as const;

  _getHeaderControls(): any {
    return [
      { action: 'save', label: 'Save', icon: 'fas fa-save' },
    ];
  }

  private async onSave(event: Event) {
    event.preventDefault();
    const form = (this as any).element?.querySelector('form');
    if (!form) return;

    const fd = new FormData(form as HTMLFormElement);
    const folderId = (fd.get('folderId') as string) || null;
    const masterSceneId = (fd.get('masterSceneId') as string) || null;
    const phaseSceneIds = Array.from(((this as any).element!).querySelectorAll('[data-scene-id]'))
      .map((el) => (el as HTMLElement).dataset.sceneId!)
      .filter(Boolean);

    const newCfg: PhaseConfig = {
      folderId,
      phaseSceneIds,
      masterSceneId,
    };

    await ModuleSettings.set(SettingKey.config, newCfg);
    ui.notifications?.info('Easy Phasey: Configuration saved.');
    (this as any).close();
  }

  private onAdd(event: Event) {
    event.preventDefault();
    const select = (this as any).element?.querySelector('select[name="addScene"]') as HTMLSelectElement | null;
    if (!select) return;
    const sceneId = select.value;
    if (!sceneId || this.#config.phaseSceneIds.includes(sceneId)) return;
    this.#config.phaseSceneIds.push(sceneId);
    (this as any).render(true);
  }

  private onRemove(event: Event) {
    event.preventDefault();
    const btn = event.currentTarget as HTMLElement;
    const id = btn?.closest('[data-scene-id]')?.getAttribute('data-scene-id');
    if (!id) return;
    this.#config.phaseSceneIds = this.#config.phaseSceneIds.filter((x) => x !== id);
    (this as any).render(true);
  }

  private onMove(event: Event, delta: number) {
    event.preventDefault();
    const el = (event.currentTarget as HTMLElement)?.closest('[data-scene-id]') as HTMLElement | null;
    if (!el) return;
    const id = el.dataset.sceneId!;
    const idx = this.#config.phaseSceneIds.indexOf(id);
    if (idx < 0) return;
    const target = idx + delta;
    if (target < 0 || target >= this.#config.phaseSceneIds.length) return;
    const [it] = this.#config.phaseSceneIds.splice(idx, 1);
    this.#config.phaseSceneIds.splice(target, 0, it);
    (this as any).render(true);
  }

  private onChooseFolder(event: Event) {
    event.preventDefault();
    const select = (this as any).element?.querySelector('select[name="folderId"]') as HTMLSelectElement | null;
    if (!select) return;
    const folderId = select.value || null;
    this.#config.folderId = folderId;

    // If selecting a folder for the first time, prefill phase list with scenes from folder
    if (folderId) {
      const scenes = game.scenes?.filter((s: any) => s.folder?.id === folderId) ?? [];
      this.#config.phaseSceneIds = scenes.map((s: any) => s.id!).filter(Boolean);
    }
    (this as any).render(true);
  }
}
