import type {LanguageCode} from '@shopify/hydrogen/storefront-api-types';

const UI_TRANSLATIONS = {
  NL: {
    addToCart: 'In winkelwagen',
    soldOut: 'Uitverkocht',
    chooseSize: 'Kies een maat',
    chooseYourSize: 'Kies je maat',
    closeSizeSelection: 'Maatkeuze sluiten',
    close: 'Sluiten',
    notFoundTitle: 'Pagina niet gevonden',
    notFoundBody: 'Deze pagina bestaat niet of is verplaatst.',
    notFoundHome: 'Naar home',
    notFoundShop: 'Verder winkelen',
    errorTitle: 'Er ging iets mis',
    errorBody: 'Probeer het later opnieuw of ga terug naar home.',
  },
  EN: {
    addToCart: 'Add to cart',
    soldOut: 'Sold out',
    chooseSize: 'Choose a size',
    chooseYourSize: 'Choose your size',
    closeSizeSelection: 'Close size selection',
    close: 'Close',
    notFoundTitle: 'Page not found',
    notFoundBody: 'This page does not exist or has been moved.',
    notFoundHome: 'Go home',
    notFoundShop: 'Continue shopping',
    errorTitle: 'Something went wrong',
    errorBody: 'Please try again later or go back home.',
  },
  DE: {
    addToCart: 'In den Warenkorb',
    soldOut: 'Ausverkauft',
    chooseSize: 'Wähle eine Größe',
    chooseYourSize: 'Wähle deine Größe',
    closeSizeSelection: 'Größenauswahl schließen',
    close: 'Schließen',
    notFoundTitle: 'Seite nicht gefunden',
    notFoundBody: 'Diese Seite existiert nicht oder wurde verschoben.',
    notFoundHome: 'Zur Startseite',
    notFoundShop: 'Weiter einkaufen',
    errorTitle: 'Etwas ist schiefgelaufen',
    errorBody: 'Bitte versuche es später erneut oder gehe zurück zur Startseite.',
  },
} as const;

export function getUiTranslations(language?: LanguageCode | null) {
  return UI_TRANSLATIONS[language as keyof typeof UI_TRANSLATIONS] ?? UI_TRANSLATIONS.NL;
}
