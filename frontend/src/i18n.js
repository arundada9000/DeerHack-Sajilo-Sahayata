import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import translationEN from "./locales/en/translation.json";
import translationNE from "./locales/ne/translation.json";
import translationBhojpuri from "./locales/bhojpuri/translation.json";
import translationHindi from "./locales/hindi/translation.json";
import translationMagar from "./locales/magar/translation.json";
import translationMaithili from "./locales/maithili/translation.json";
import translationNewar from "./locales/newar/translation.json";
import translationTamang from "./locales/tamang/translation.json";
import translationTharu from "./locales/tharu/translation.json";
import translationChinese from "./locales/chinese/translation.json";
import translationJapanese from "./locales/japanese/translation.json";
import translationKorean from "./locales/korean/translation.json";

const resources = {
  en: { translation: translationEN },
  ne: { translation: translationNE },
  bhojpuri: { translation: translationBhojpuri },
  hindi: { translation: translationHindi },
  magar: { translation: translationMagar },
  maithili: { translation: translationMaithili },
  newar: { translation: translationNewar },
  tamang: { translation: translationTamang },
  tharu: { translation: translationTharu },
  chinese: { translation: translationChinese },
  japanese: { translation: translationJapanese },
  korean: { translation: translationKorean },
};

i18n
  .use(initReactI18next) // IMPORTANT: injects i18next into react-i18next
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: { escapeValue: false }, // react already escapes
  });

export default i18n;
