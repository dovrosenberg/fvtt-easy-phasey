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
  #sceneIds: string[] = [];
  #skippedSceneIds: string[] = [];

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
    },
  };

  private get selectedSceneIndex(): number {
    if (!this.#selectedSceneId) 
        return -1;

    return this.#sceneIds.indexOf(this.#selectedSceneId) ?? -1;
  }

  // get the data needed to display
  async _prepareContext(_options: any = {}): Promise<PhaseConfigRenderContext> {
    const folders = (game.folders?.filter((f: any) => f.type === 'Scene') ?? []).map((f: any) => ({ id: f.id, name: f.name })) as SelectOption[];

    return {
      folders,
      selectedFolder : this.#selectedFolder ?? null,
      disableUp: this.selectedSceneIndex === -1 || this.selectedSceneIndex === 0,
      disableDown: this.selectedSceneIndex === -1 || this.selectedSceneIndex === this.#sceneIds.length - 1,
      selectedSceneId: this.#selectedSceneId,
      sceneList: this.#sceneIds.map((s: string) => ({ 
        id: s, 
        name: game.scenes?.get(s)?.name ?? '', 
        skipped: this.#skippedSceneIds.includes(s) 
      })) ?? [],
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
      select.addEventListener('change', (event: Event) => this.onChooseFolder(event));
    }

    const list = this.element?.querySelector('#phase-list') as HTMLSelectElement | null;
    if (list) {
      list.addEventListener('change', (event: Event) => this.onChooseScene(event));
    }

    const upButton = this.element?.querySelector('button[data-action="up"]') as HTMLButtonElement | null;
    if (upButton) {
      upButton.addEventListener('click', (event: MouseEvent) => { event.preventDefault(); this.onMove(-1); });
    }

    const downButton = this.element?.querySelector('button[data-action="down"]') as HTMLButtonElement | null;
    if (downButton) {
      downButton.addEventListener('click', (event: MouseEvent) => { event.preventDefault(); this.onMove(1); });
    }

    const skipButton = this.element?.querySelector('button[data-action="toggle-skip"]') as HTMLButtonElement | null;
    if (skipButton) {
      skipButton.addEventListener('click', (event: MouseEvent) => { event.preventDefault(); this.onToggleSkip(); });
    }
  }

  private static async onSave(event: Event) {
    // event.preventDefault();
    // const app = (this as any).element?.querySelector('fep-main');
    // if (!app) return;

    // const fd = new FormData(app as HTMLFormElement);
    // const folderId = (fd.get('folderId') as string) || null;
    // const phaseSceneIds = Array.from(((this as any).element!).querySelectorAll('[data-scene-id]'))
    //   .map((el) => (el as HTMLElement).dataset.sceneId!)
    //   .filter(Boolean);

    // const newCfg: PhaseConfig = {
    //   folderId,
    //   phaseSceneIds,
    // };

    // await ModuleSettings.set(SettingKey.config, newCfg);
    // ui.notifications?.info('Easy Phasey: Configuration saved.');
    // (this as any).close();
  }

  private onToggleSkip() {
    if (!this.#selectedSceneId) 
      return;

    if (this.#skippedSceneIds.includes(this.#selectedSceneId)) {
      this.#skippedSceneIds = this.#skippedSceneIds.filter((x) => x !== this.#selectedSceneId);
    } else {
      this.#skippedSceneIds.push(this.#selectedSceneId);
    }

    this.render(true);
  }

  private onMove(delta: number) {
    if (!this.#selectedFolder || !this.#selectedSceneId) 
      return;

    // find new position
    const sceneIds = [...this.#sceneIds];

    // we're going to move the one with id this.#selectedSceneId delta spots
    const idx = this.selectedSceneIndex;

    if (idx < 0) 
      return;

    const newIndex = Math.max(0, Math.min(sceneIds.length - 1, idx + delta));

    // remove from current posisiont
    const [it] = sceneIds.splice(idx, 1);

    // insert at new position
    sceneIds.splice(newIndex, 0, it);

    this.#sceneIds = sceneIds;
    this.render(true);
  }

  private async onChooseFolder(event: Event): Promise<void> {
    const select = event.currentTarget as HTMLSelectElement;

    if (!select || !select.value) {
      this.#selectedFolder = null;
      this.#sceneIds = [];
      this.#skippedSceneIds = [];
    } else {
      this.#selectedFolder = await PhaseFolder.fromId(select.value);

      if (this.#selectedFolder)  {
        // get our working copies
        this.#sceneIds = [...(this.#selectedFolder.phaseSceneIds || [])];
        this.#skippedSceneIds = [...(this.#selectedFolder.skippedSceneIds || [])];
      } else {
        this.#sceneIds = [];
        this.#skippedSceneIds = [];
      }
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
