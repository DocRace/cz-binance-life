import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import zhTW from "./locales/zh-TW.json";
import en from "./locales/en.json";
import ko from "./locales/ko.json";
import ja from "./locales/ja.json";

function resolveDocumentLang(lng: string): string {
  const code = `${lng || ""}`.trim();
  if (code === "zh-TW" || code === "zh-HK" || code === "zh-MO") return "zh-Hant";
  if (code.startsWith("zh")) return "zh-Hans";
  return code.split("-")[0] || "en";
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
    fallbackLng: "en",
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"]
    },
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  })
  .then(() => {
    applyDocumentLang(i18n.resolvedLanguage || i18n.language);
  });

i18n.on("languageChanged", (lng) => {
  applyDocumentLang(lng);
});

export default i18n;
