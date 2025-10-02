export const i18nConfig = {
  locales: ['en', 'nl', 'de', 'fr', 'es'],
  defaultLocale: 'en',
} as const;

export type Locale = (typeof i18nConfig.locales)[number];
