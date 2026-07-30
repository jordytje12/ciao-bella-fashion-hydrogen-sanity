/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

// Enhance TypeScript's built-in typings.
import '@total-typescript/ts-reset';

// Sanity global env variables.
declare global {
  interface Env extends HydrogenEnv {
    SANITY_PROJECT_ID: string;
    SANITY_DATASET: string;
    SANITY_API_VERSION: string;
    SANITY_API_TOKEN: string;
    SANITY_STUDIO_URL: string;
    // Marketing tags — optioneel, laten leeg = tag laadt niet (lokaal/preview).
    PUBLIC_GTM_CONTAINER_ID?: string;
    PUBLIC_META_PIXEL_ID?: string;
  }
}