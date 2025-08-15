import { moduleId } from '@/settings';
import { PhaseManager } from '@/classes';

export enum KeyBindingKeys {
  nextPhase = 'nextPhase',
  prevPhase = 'prevPhase',
}

export class KeyBindings {
  public static register() {
    if (!game.keybindings)
      return;

    const keybindings = [
      {
        bindingId: KeyBindingKeys.prevPhase,
        name: 'fcb.keybindings.prevPhase',  
        hint: 'fcb.keybindings.prevPhaseHelp',
        onDown: async () => { 
          await PhaseManager.advancePhase(-1);
        },
        editable: [
          {
            key: '[',
            modifiers: [ 
              foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT,
              foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL
            ]
          }
        ],
      },
      {
        bindingId: KeyBindingKeys.nextPhase,
        name: 'fcb.keybindings.nextPhase',  
        hint: 'fcb.keybindings.nextPhaseHelp',
        onDown: async () => { 
          await PhaseManager.advancePhase(1);
        },
        editable: [
          {
            key: ']',
            modifiers: [ 
              foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT,
              foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL
            ]
          }
        ],
      },

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