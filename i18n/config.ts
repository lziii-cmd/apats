// Constantes i18n partagées entre server et client components
// Ce fichier ne doit PAS importer de modules server-only (next/headers, etc.)

export type Locale = "fr" | "en";
export const LOCALES: Locale[] = ["fr", "en"];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "apats_locale";
