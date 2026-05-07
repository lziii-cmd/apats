import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";

export type { Locale };
export { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE };

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale =
    raw && LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
