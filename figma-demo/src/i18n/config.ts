import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import zhTW from "./locales/zh-TW.json";
import en from "./locales/en.json";
import ko from "./locales/ko.json";
import ja from "./locales/ja.json";

export const SUPPORTED_UI_LANGUAGES = ["zh-TW", "en", "ja", "ko"] as const;

/** Map browser / WeChat codes onto the four locales we actually ship. */
export function normalizeUiLanguage(lng: string | undefined | null): string {
  const code = `${lng || ""}`.trim().replace(/_/g, "-").toLowerCase();
  if (!code) return "en";
  if (code.startsWith("zh")) return "zh-TW";
  if (code.startsWith("ja")) return "ja";
  if (code.startsWith("ko")) return "ko";
  if (code.startsWith("en")) return "en";
  return SUPPORTED_UI_LANGUAGES.find((item) => item.toLowerCase() === code) || "en";
}

function resolveDocumentLang(lng: string): string {
  const code = normalizeUiLanguage(lng);
  if (code === "zh-TW") return "zh-Hant";
  return code;
}

function applyDocumentLang(lng: string) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = resolveDocumentLang(lng);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "zh-TW": { translation: zhTW },
      en: { translation: en },
      ko: { translation: ko },
      ja: { translation: ja }
    },
    supportedLngs: [...SUPPORTED_UI_LANGUAGES],
    nonExplicitSupportedLngs: false,
    load: "currentOnly",
    fallbackLng: {
      zh: ["zh-TW"],
      "zh-CN": ["zh-TW"],
      "zh-SG": ["zh-TW"],
      "zh-MY": ["zh-TW"],
      "zh-Hans": ["zh-TW"],
      "zh-HK": ["zh-TW"],
      "zh-MO": ["zh-TW"],
      "zh-Hant": ["zh-TW"],
      default: ["en"],
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      convertDetectedLanguage: normalizeUiLanguage,
    },
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  })
  .then(() => {
    const normalized = normalizeUiLanguage(i18n.resolvedLanguage || i18n.language);
    if (normalized !== i18n.language) {
      return i18n.changeLanguage(normalized);
    }
    applyDocumentLang(normalized);
  });

i18n.on("languageChanged", (lng) => {
  applyDocumentLang(lng);
});

export default i18n;
