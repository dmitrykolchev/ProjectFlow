import type { EmployeeStatus, PresenceStatus } from '../types';

/** Visual + textual representation of a person's presence (Fluent-style persona badge). */
export type PersonaPresence =
  | 'none'
  | 'online'
  | 'available'
  | 'away'
  | 'busy'
  | 'dnd'
  | 'ooo'
  | 'blocked'
  | 'offline';

/** Persona diameter presets (px), 48 is the default. */
export type PersonaSize = '24' | '32' | '40' | '48' | '56' | '72' | '100';

export interface PresenceToken {
  /** Badge fill — a CSS color expression. */
  color: string;
  /** Glyph drawn inside the badge in white. */
  glyph: 'check' | 'clock' | 'minus' | 'moon' | 'slash' | 'ring';
  /** Key in the `presence` i18n section (text alternative for accessibility). */
  i18nKey?: string;
}

export const PRESENCE_TOKENS: Record<PersonaPresence, PresenceToken | null> = {
  none: null,
  online: { color: 'var(--color-success, #10b981)', glyph: 'check', i18nKey: 'online' },
  available: { color: 'var(--color-success, #10b981)', glyph: 'check', i18nKey: 'available' },
  away: { color: 'var(--color-warning, #f59e0b)', glyph: 'clock', i18nKey: 'away' },
  busy: { color: 'var(--color-danger, #ef4444)', glyph: 'minus', i18nKey: 'busy' },
  dnd: { color: 'var(--color-danger, #ef4444)', glyph: 'moon', i18nKey: 'dnd' },
  ooo: { color: 'var(--color-warning, #f59e0b)', glyph: 'clock', i18nKey: 'ooo' },
  blocked: { color: 'var(--color-danger, #ef4444)', glyph: 'slash', i18nKey: 'blocked' },
  offline: { color: 'var(--text-muted, #94a3b8)', glyph: 'ring', i18nKey: 'offline' },
};

/** Employee status -> presence badge (Fluent mapping: OOO is away, onboarding is busy). */
export function presenceFromStatus(status?: EmployeeStatus): PersonaPresence {
  switch (status) {
    case 'active':
      return 'available';
    case 'remote':
      return 'online';
    case 'vacation':
      return 'away';
    case 'onboarding':
      return 'busy';
    default:
      return 'none';
  }
}

/** Manual presence (User.presence, written by the sidebar footer menu) wins over the
   badge derived from the employee status. Presence is its own status: choosing it does
   not touch EmployeeStatus. */
export function effectivePresence(user: {
  status?: EmployeeStatus;
  presence?: PresenceStatus;
}): PersonaPresence {
  return user.presence ?? presenceFromStatus(user.status);
}

/** Resolve the presence label in the given language ('' when no badge). */
export function presenceLabel(
  presence: PersonaPresence,
  lang: 'ru' | 'en',
  translation: Record<string, unknown>
): string {
  const token = PRESENCE_TOKENS[presence];
  if (!token || !token.i18nKey) return '';
  const section = (translation as Record<string, Record<string, string>>).presence;
  return section?.[token.i18nKey] ?? '';
}
