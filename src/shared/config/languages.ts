export const LANGUAGE_CODES = ['en', 'ja', 'uz', 'ru', 'tr', 'zh', 'ko'] as const;

export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export interface LanguageOption {
  code: LanguageCode;
  shortLabel: string;
  color: string;
  nativeName: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'uz', shortLabel: 'UZ', color: '#1E88E5', nativeName: "O'zbek" },
  { code: 'en', shortLabel: 'EN', color: '#E53935', nativeName: 'English' },
  { code: 'ru', shortLabel: 'RU', color: '#5C6BC0', nativeName: 'Русский' },
  { code: 'tr', shortLabel: 'TR', color: '#D32F2F', nativeName: 'Türkçe' },
  { code: 'zh', shortLabel: 'ZH', color: '#F4511E', nativeName: '中文' },
  { code: 'ko', shortLabel: 'KO', color: '#00897B', nativeName: '한국어' },
  { code: 'ja', shortLabel: 'JA', color: '#C62828', nativeName: '日本語' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';
