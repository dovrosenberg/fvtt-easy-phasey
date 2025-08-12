import { moduleId } from '@/settings';

export enum KeyBindingKeys {
  // historyBack = 'historyBack',   // move back in tab history
}

export class KeyBindings {
  public static register() {
    if (!game.keybindings)
      return;

    const keybindings = [
      // {
      //   bindingId: KeyBindingKeys.historyBack,
      //   name: 'fcb.settings.keybindings.historyBack',  
      //   hint: 'fcb.settings.keybindings.historyBackHelp',
      //   onDown: async () => { 
      //     // only trap this when the window is open
      //     if (wbApp?.rendered) {
      //       const store = useNavigationStore();
      //       await store.navigateHistory(-1);
      //     }
      //   },
      //   editable: [
      //     {
      //       key: 'ArrowLeft',
      //       modifiers: [ 
      //         foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.ALT,
      //         foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL
      //       ]
      //     }
      //   ],
      // },

    ];

    for (let i=0; i<keybindings.length; i++) {
      const binding = keybindings[i];

      const { bindingId, ...bindingData } = binding;
      game.keybindings.register(moduleId, bindingId, {
        onUp: () => {},
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
        restricted: true,   // restrict to GM only
        repeat: false,
        reservedModifiers: [],
        ...bindingData,
      });
    }
  }
}