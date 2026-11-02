// some helpers to simplify various repetitive tasks

// is the current client the GM?
const isClientGM = (): boolean => (game.user?.isGM || false);

// localize a string
const localize = (text: string) => game.i18n.localize(`fep.${text}`);

// major Foundry version (ex. 13, 14)
const foundryGeneration = (): number => game.release.generation;

// is Foundry v14 or later?
const isV14 = (): boolean => foundryGeneration() >= 14;

export {
  isClientGM,
  localize,
  foundryGeneration,
  isV14,
};