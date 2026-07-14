import type {LanguageCode} from '@shopify/hydrogen/storefront-api-types';

const UI_TRANSLATIONS = {
  NL: {
    addToCart: 'In winkelwagen',
    soldOut: 'Uitverkocht',
    chooseSize: 'Kies een maat',
    chooseYourSize: 'Kies je maat',
    closeSizeSelection: 'Maatkeuze sluiten',
    close: 'Sluiten',
  },
  EN: {
    addToCart: 'Add to cart',
    soldOut: 'Sold out',
    chooseSize: 'Choose a size',
    chooseYourSize: 'Choose your size',
    closeSizeSelection: 'Close size selection',
    close: 'Close',
  },
  DE: {
    addToCart: 'In den Warenkorb',
    soldOut: 'Ausverkauft',
    chooseSize: 'Wähle eine Größe',
    chooseYourSize: 'Wähle deine Größe',
    closeSizeSelection: 'Größenauswahl schließen',
    close: 'Schließen',
  },
} as const;

export function getUiTranslations(language?: LanguageCode | null) {
  return UI_TRANSLATIONS[language as keyof typeof UI_TRANSLATIONS] ?? UI_TRANSLATIONS.NL;
}
