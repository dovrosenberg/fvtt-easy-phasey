import { moduleId, ModuleSettings, SettingKey } from '@/settings';
import type { PhaseConfig } from '@/types';
import { PhaseFolder } from '@/classes/PhaseFolder';

type SelectOption = {
  id: string;
  name: string;
};

type PhaseConfigRenderContext = {
  folders: SelectOption[];  // all scene folders
  selectedFolder: PhaseFolder | null;  // the selected folder
  disableUp: boolean;  // whether the up button is disabled
  disableDown: boolean;  // whether the down button is disabled
  selectedSceneId: string | null;  // the selected (in the multiselect) scene id
  sceneList: (SelectOption & { skipped: boolean })[];  // the list of scenes in the selected folder
}

export class PhaseConfigApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2<PhaseConfigRenderContext>)  {
  #selectedFolder: PhaseFolder | null = null;
  #selectedSceneId: string | null = null;

  static PARTS = {
    'fep-main': {
      template: `modules/${moduleId}/templates/phase-config.hbs`,
      id: '',
    },
  } as const;

  static DEFAULT_OPTIONS: foundry.applications.api.ApplicationV2.Configuration = {
    id: 'fep-config',
    title: 'Easy Phasey Configuration',
    tag: 'form',
    width: 500,
    height: 'auto',
    resizable: true,
    position: { left: 100, top: 100 },
    classes: [],
    window: { 
      frame: true,
      icon: false,
      title: 'Easy Phasey - Configure phases',
      resizable: false,
      minimizable: false, 
    },
    form: {
      closeOnSubmit: true,
      submitOnChange: false,
      handler: PhaseConfigApp.processForm,
    },
    actions: {
      save: PhaseConfigApp.onSave,
      // add: (event, app) => (app as PhaseConfigApp).onAdd(event),
      // remove: (event, app) => (app as PhaseConfigApp).onRemove(event),
      // up: (event, app) => (app as PhaseConfigApp).onMove(event, -1),
      // down: (event, app) => (app as PhaseConfigApp).onMove(event, 1),
    },
  };

  private get selectedSceneIndex(): number {
    return this.#selectedFolder?.phaseSceneIds.indexOf(this.#selectedSceneId) ?? -1;
  }

  // get the data needed to display
  async _prepareContext(_options: any = {}): Promise<PhaseConfigRenderContext> {
    const folders = (game.folders?.filter((f: any) => f.type === 'Scene') ?? []).map((f: any) => ({ id: f.id, name: f.name })) as SelectOption[];

    return {
      folders,
      selectedFolder : this.#selectedFolder ?? null,
      disableUp: this.selectedSceneIndex === -1 || this.selectedSceneIndex === 0,
      disableDown: this.selectedSceneIndex === -1 || this.selectedSceneIndex === this.#selectedFolder.phaseSceneIds.length - 1,
      selectedSceneId: this.#selectedSceneId,
      sceneList: this.#selectedFolder?.scenes.map((s: any) => ({ id: s.id, name: s.name, skipped: this.#selectedFolder?.phaseSceneIds.includes(s.id) })) ?? [],
    };
  }

  _getHeaderControls(): any {
    return [
      { action: 'save', label: 'Save', icon: 'fas fa-save' },
    ];
  }

  /** setup the non-click event handlers */
  async _onRender(_context: PhaseConfigRenderContext): Promise<void> {
    // when folder is selected, repopulate the scene list and re-render
    const select = this.element?.querySelector('#fep-folder-select') as HTMLSelectElement | null;
    if (select) {
      select.addEventListener('change', this.onChooseFolder.bind(this));
    }

    const list = this.element?.querySelector('#phase-list') as HTMLSelectElement | null;
    if (list) {
      list.addEventListener('change', this.onChooseScene.bind(this));
    }
  }

  private static async onSave(event: Event) {
    event.preventDefault();
    const app = (this as any).element?.querySelector('fep-main');
    if (!app) return;

    const fd = new FormData(app as HTMLFormElement);
    const folderId = (fd.get('folderId') as string) || null;
    const phaseSceneIds = Array.from(((this as any).element!).querySelectorAll('[data-scene-id]'))
      .map((el) => (el as HTMLElement).dataset.sceneId!)
      .filter(Boolean);

    const newCfg: PhaseConfig = {
      folderId,
      phaseSceneIds,
    };

    await ModuleSettings.set(SettingKey.config, newCfg);
    ui.notifications?.info('Easy Phasey: Configuration saved.');
    (this as any).close();
  }

  // private onAdd(event: Event) {
  //   event.preventDefault();
  //   const select = (this as any).element?.querySelector('select[name="addScene"]') as HTMLSelectElement | null;
  //   if (!select) return;
  //   const sceneId = select.value;
  //   if (!sceneId || this.#config.phaseSceneIds.includes(sceneId)) return;
  //   this.#config.phaseSceneIds.push(sceneId);
  //   (this as any).render(true);
  // }

  // private onRemove(event: Event) {
  //   event.preventDefault();
  //   const btn = event.currentTarget as HTMLElement;
  //   const id = btn?.closest('[data-scene-id]')?.getAttribute('data-scene-id');
  //   if (!id) return;
  //   this.#config.phaseSceneIds = this.#config.phaseSceneIds.filter((x) => x !== id);
  //   (this as any).render(true);
  // }

  // private onMove(event: Event, delta: number) {
  //   event.preventDefault();
  //   const el = (event.currentTarget as HTMLElement)?.closest('[data-scene-id]') as HTMLElement | null;
  //   if (!el) return;
  //   const id = el.dataset.sceneId!;
  //   const idx = this.#config.phaseSceneIds.indexOf(id);
  //   if (idx < 0) return;
  //   const target = idx + delta;
  //   if (target < 0 || target >= this.#config.phaseSceneIds.length) return;
  //   const [it] = this.#config.phaseSceneIds.splice(idx, 1);
  //   this.#config.phaseSceneIds.splice(target, 0, it);
  //   (this as any).render(true);
  // }

  private async onChooseFolder(event: Event): Promise<void> {
    const select = event.currentTarget as HTMLSelectElement;

    if (!select || !select.value) {
      this.#selectedFolder = null;
    } else {
      this.#selectedFolder = await PhaseFolder.fromId(select.value);
    }

    this.render(true);
  }

  private async onChooseScene(event: Event): Promise<void> {
    const select = event.currentTarget as HTMLSelectElement;

    if (!select || !select.value) {
      this.#selectedSceneId = null;
    } else {
      this.#selectedSceneId = select.value;
    }

    this.render(true);
  }
}
