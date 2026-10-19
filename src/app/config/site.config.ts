/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CENTRAL BRANDING / SITE CONFIGURATION  (§3, §66, §70)
 * ─────────────────────────────────────────────────────────────────────────────
 * Every piece of replaceable branding lives HERE — never hard-coded in
 * components. When the official logo, mission statement, colors, contact
 * details or social links arrive, update this file (and src/styles/_tokens.scss
 * for colors) and the whole application follows.
 *
 * NOTE: Values below are TEMPORARY placeholders. `logo`/`favicon` are empty by
 * design — the app renders a generated monogram until official assets exist.
 */
import { SupportedLanguage } from '../i18n/language.types';

export interface LanguageOption {
  code: SupportedLanguage;
  /** English label, shown inside the language menu. */
  label: string;
  /** Native label, shown next to the flag-free language switcher. */
  nativeLabel: string;
  dir: 'ltr' | 'rtl';
}

export interface SiteSocialLinks {
  youtube?: string;
  facebook?: string;
  instagram?: string;
  x?: string;
  whatsApp?: string;
  telegram?: string;
}

export interface SiteConfig {
  /** Product name (replace when final branding arrives). */
  name: string;
  /** Optional localized display names (Urdu / Arabic script variants). */
  nameUrdu?: string;
  nameArabic?: string;
  /** Short tagline used in the hero and footer. */
  tagline: { en: string; ur: string; ar: string };
  /** Default meta description (page-level SEO is managed by SeoService). */
  description: string;
  /** Absolute or repo-relative path. Empty → generated monogram logo is used. */
  logo: string;
  logoAlt: string;
  favicon: string;
  /** Public contact channel (also used on the About page). */
  contactEmail?: string;
  social: SiteSocialLinks;
  /** Language offered to visitors. Adding a language = add entry + JSON file. */
  languages: LanguageOption[];
  defaultLanguage: SupportedLanguage;
  /**
   * Home page sections, in display order. Toggle or reorder without touching
   * the home component (§16, §53).
   */
  homeSections: Array<{ id: string; enabled: boolean }>;
  /** Legal links rendered in the footer. */
  legal: { privacyRoute: string; aboutRoute: string };
  /** Footer mission line — placeholder until the official mission statement. */
  mission: { en: string; ur: string; ar: string };
}

export const siteConfig: SiteConfig = {
  name: 'Rohani Shifa',
  nameUrdu: 'روحانی شفا',
  nameArabic: 'روحانی شفا',
  tagline: {
    en: 'Islamic knowledge for a better life',
    ur: 'قرآن و حدیث کی روشنی میں',
    ar: 'المعرفة الإسلامية لحياة أفضل',
  },
  description:
    'Rohani Shifa is an Islamic educational platform featuring daily reminders, articles, YouTube lectures and community events in English, Urdu and Arabic.',
  logo: '',
  logoAlt: 'Rohani Shifa logo',
  favicon: '',
  contactEmail: '',
  social: {
    // Replace with the official channels when supplied.
    youtube: '',
    facebook: '',
    instagram: '',
    x: '',
    whatsApp: '',
    telegram: '',
  },
  languages: [
    { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
    { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', dir: 'rtl' },
    { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
  ],
  defaultLanguage: 'ur',
  homeSections: [
    { id: 'hero', enabled: true },
    { id: 'dailyReminder', enabled: true },
    { id: 'featuredVideo', enabled: true },
    { id: 'latestPosts', enabled: true },
    { id: 'latestVideos', enabled: true },
    { id: 'upcomingEvents', enabled: true },
    { id: 'categories', enabled: true },
    { id: 'cta', enabled: true },
  ],
  legal: { privacyRoute: '/privacy', aboutRoute: '/about' },
  mission: {
    en: 'Sharing authentic Islamic knowledge, reminders and beneficial content for Muslims around the world.',
    ur: 'دنیا بھر کے مسلمانوں کے لیے مستند اسلامی معلومات، یاد دہانیوں اور نفع بخش مواد کی فراہمی۔',
    ar: 'نشر المعرفة الإسلامية الأصيلة والتذكيرات والمحتوى النافع للمسلمين حول العالم.',
  },
};
