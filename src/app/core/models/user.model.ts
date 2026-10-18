import type { Timestamp } from 'firebase/firestore';
import type { LocalizedText, SupportedLanguage } from '../../i18n/language.types';

/** User access level. Enforced by security rules — never by UI alone (§9). */
export type UserRole = 'user' | 'admin';

/**
 * `users/{uid}` profile document.
 * `role` mirrors the admin custom claim for display/application purposes;
 * the authoritative admin check in Firestore rules is the custom claim.
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  isActive: boolean;
  bio?: string;
  language?: SupportedLanguage;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Fields the client may write when creating/updating its OWN profile. */
export type UserProfileUpdate = Partial<
  Pick<UserProfile, 'displayName' | 'photoURL' | 'bio' | 'language'>
>;
