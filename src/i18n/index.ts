import { ru } from './ru';
import { en } from './en';
import { SupportedLang } from '../types';

export type TranslationType = typeof ru;

export const translations: Record<SupportedLang, TranslationType> = {
  ru,
  en,
};

export function getTranslation(lang: SupportedLang): TranslationType {
  return translations[lang] || translations.ru;
}
