import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  PRESENCE_TOKENS,
  presenceLabel,
  type PersonaPresence,
  type PersonaSize,
} from '../../../domain/presence-tokens';
import styles from './app-persona.css';

const BADGE_PX: Record<PersonaSize, number> = {
  '24': 12,
  '32': 16,
  '40': 20,
  '48': 24,
  '56': 28,
  '72': 32,
  '100': 40,
};

/** White glyph inside the presence badge. */
function presenceGlyph(glyph: string, px: number): TemplateResult {
  const common = `width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"`;
  switch (glyph) {
    case 'check':
      return html`<svg ${common} stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>`;
    case 'clock':
      return html`<svg ${common} stroke-width="2.5"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>`;
    case 'minus':
      return html`<svg ${common} stroke-width="3"><path d="M5 12h14"/></svg>`;
    case 'moon':
      return html`<svg ${common} stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    case 'slash':
      return html`<svg ${common} stroke-width="3"><path d="M6 6l12 12"/></svg>`;
    default:
      return html`<svg ${common} stroke-width="3"><circle cx="12" cy="12" r="7"/></svg>`;
  }
}

@customElement('app-persona')
export class AppPersona extends LitElement {
  /** Avatar diameter preset (24/32/40/48/56/72/100). */
  @property({ type: String }) size: PersonaSize = '48';
  /** Photo URL; falls back to initials when empty or broken. */
  @property({ type: String }) image: string = '';
  /** Initials; derived from primaryText when not set. */
  @property({ type: String }) initials: string = '';
  @property({ type: String }) primaryText: string = '';
  @property({ type: String }) secondaryText: string = '';
  @property({ type: String }) tertiaryText: string = '';
  /** Presence badge status ('none' renders no badge). */
  @property({ type: String }) presence: PersonaPresence = 'none';
  /** Text alternative next to the name (recommended for sizes <= 32, colour-only dots). */
  @property({ type: Boolean, attribute: 'presence-text' }) presenceText: boolean = false;
  /** Native tooltip with the full text on truncated lines. */
  @property({ type: Boolean, attribute: 'show-overflow-tooltip' })
  showOverflowTooltip: boolean = true;
  /** Background of the initials tile. */
  @property({ type: String }) color: string = '';
  /** Accessible name override; defaults to "name — presence". */
  @property({ type: String }) ariaLabel: string = '';

  private unsubscribe: (() => void) | null = null;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = store.subscribe(() => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private deriveInitials(): string {
    if (this.initials.trim()) return this.initials.trim().toUpperCase();
    const words = this.primaryText.trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  }

  render() {
    const lang = store.customization.language;
    const t = getTranslation(lang);
    const token = PRESENCE_TOKENS[this.presence];
    const label = presenceLabel(this.presence, lang, t);
    const initials = this.deriveInitials();
    const bg = this.color || 'var(--accent-soft, rgba(99, 102, 241, 0.15))';
    const compact = this.size === '24' || this.size === '32';
    const badgePx = BADGE_PX[this.size] ?? 24;
    const glyphPx = Math.max(6, badgePx - 4);
    const showPresenceText = Boolean(label) && this.presenceText;
    const primaryLine = compact && showPresenceText ? `${this.primaryText} (${label})` : this.primaryText;
    const accessible = this.ariaLabel || [this.primaryText, label].filter(Boolean).join(' — ');
    const tip = (text: string) => (this.showOverflowTooltip ? text : '');

    return html`
      <div class="persona size-${this.size}" aria-label="${accessible}">
        <div class="avatar-wrap">
          <div class="avatar" style="background: ${bg};">
            ${this.image
              ? html`<img src="${this.image}" alt="${this.primaryText}" />`
              : html`<span>${initials}</span>`}
          </div>
          ${token
            ? html`
                <span class="presence" style="background: ${token.color};">
                  ${presenceGlyph(token.glyph, glyphPx)}
                </span>
              `
            : ''}
        </div>
        ${this.primaryText
          ? html`
              <div class="text">
                <span class="line primary" title="${tip(primaryLine)}">${primaryLine}</span>
                ${compact
                  ? ''
                  : html`
                      ${this.secondaryText
                        ? html`<span class="line secondary" title="${tip(this.secondaryText)}">${this.secondaryText}</span>`
                        : ''}
                      ${this.tertiaryText
                        ? html`<span class="line tertiary" title="${tip(this.tertiaryText)}">${this.tertiaryText}</span>`
                        : ''}
                    `}
              </div>
            `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-persona': AppPersona;
  }
}
