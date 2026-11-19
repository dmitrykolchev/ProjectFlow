import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { PRESENCE_TOKENS, presenceLabel, type PersonaPresence } from '../../../domain/presence-tokens';
import styles from './app-presence-icon.css';

/** White glyph inside the presence badge. Attributes are written literally: lit-html
    has no attribute spread, so a single `${string}` placeholder leaves the svg without
    width/height/viewBox (defaulting to 300x150) and the glyph escapes the badge. */
export function presenceGlyph(glyph: string, px: number): TemplateResult {
  switch (glyph) {
    case 'check':
      return html`<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>`;
    case 'clock':
      return html`<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>`;
    case 'minus':
      return html`<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`;
    case 'moon':
      return html`<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    case 'slash':
      return html`<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12"/></svg>`;
    default:
      return html`<svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"/></svg>`;
  }
}

/** Presence status icon: a colored dot with the state glyph, the same geometry as the
   persona badge. Owns its styles, so it renders correctly inside other components'
   shadow trees (menu item icons) and can be slotted anywhere. */
@customElement('app-presence-icon')
export class AppPresenceIcon extends LitElement {
  /** Presence status whose token paints the dot ('none' renders nothing). */
  @property({ type: String }) presence: PersonaPresence = 'none';
  /** Dot diameter in px (the persona badge sizes are 8/12/16/20/24/32/40). */
  @property({ type: String }) size: string = '12';
  /** Glyph size in px. 'auto' follows the persona rule — round(size x 0.6), suppressed
     below 16px (colour-only dot); '0' forces a colour-only dot. */
  @property({ type: String }) glyph: string = 'auto';
  /** Dot fill override; defaults to the presence token color. */
  @property({ type: String }) color: string = '';
  /** Accessible name override; defaults to the presence label. */
  @property({ type: String }) ariaLabel: string = '';
  /** Native tooltip with the presence label (default true). */
  @property({ type: Boolean, attribute: 'show-overflow-tooltip' })
  showOverflowTooltip: boolean = true;

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

  render() {
    const token = PRESENCE_TOKENS[this.presence];
    if (!token) return '';
    const lang = store.customization.language;
    const label = presenceLabel(this.presence, lang, getTranslation(lang));
    const px = Math.max(1, parseInt(this.size, 10) || 12);
    const glyphPx =
      this.glyph === 'auto'
        ? px >= 16
          ? Math.round(px * 0.6)
          : 0
        : Math.max(0, parseInt(this.glyph, 10) || 0);
    const accessible = this.ariaLabel || label;

    return html`
      <div
        class="dot"
        role="img"
        aria-label="${accessible}"
        title="${this.showOverflowTooltip ? label : ''}"
        style="background: ${this.color || token.color}; width: ${px}px; height: ${px}px;"
      >
        ${glyphPx ? presenceGlyph(token.glyph, glyphPx) : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-presence-icon': AppPresenceIcon;
  }
}
