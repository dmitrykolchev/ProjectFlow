import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  PRESENCE_TOKENS,
  presenceLabel,
  type PersonaPresence,
  type PersonaSize,
} from '../../../domain/presence-tokens';
import '../app-presence-icon/app-presence-icon';
import styles from './app-persona.css';

const BADGE_PX: Record<PersonaSize, number> = {
  '24': 8,
  '32': 12,
  '40': 16,
  '48': 20,
  '56': 24,
  '72': 32,
  '100': 40,
};

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
  /** Presence badge status ('none' renders no badge). Its words go to the tooltip and the accessible name. */
  @property({ type: String }) presence: PersonaPresence = 'none';
  /** Native tooltip with the full text on truncated lines. */
  @property({ type: Boolean, attribute: 'show-overflow-tooltip' })
  showOverflowTooltip: boolean = true;
  /** Background of the initials tile. */
  @property({ type: String }) color: string = '';
  /** Accessible name override; defaults to "name — presence". */
  @property({ type: String }) ariaLabel: string = '';
  /** Ghost-button behaviour on by default: focusable, cursor pointer, hover fill. */
  @property({ type: Boolean, attribute: 'interactive' }) interactive: boolean = true;
  /** Disabled ghost button (no hover, no click, dimmed). */
  @property({ type: Boolean, attribute: 'persona-disabled' }) personaDisabled: boolean = false;

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
    const badgePx = BADGE_PX[this.size] ?? 20;
    const accessible = this.ariaLabel || [this.primaryText, label].filter(Boolean).join(' — ');
    const tip = (text: string) => (this.showOverflowTooltip ? text : '');
    // The status is graphic only: its words go to the tooltip and the accessible name,
    // the secondary line carries the position / project role.
    const primaryTip = [this.primaryText, label].filter(Boolean).join(' — ');

    const body = html`
      <div class="avatar-wrap">
        <div class="avatar" style="background: ${bg};">
          ${this.image
            ? html`<img src="${this.image}" alt="${this.primaryText}" />`
            : html`<span>${initials}</span>`}
        </div>
        ${token
          ? html`
              <app-presence-icon
                class="presence"
                presence="${this.presence}"
                size="${String(badgePx)}"
                .showOverflowTooltip="${this.showOverflowTooltip}"
              ></app-presence-icon>
            `
          : ''}
      </div>
      ${this.primaryText
        ? html`
            <div class="text">
              <span class="line primary" title="${tip(primaryTip)}">${this.primaryText}</span>
              ${this.secondaryText
                ? html`<span class="line secondary" title="${tip(this.secondaryText)}">${this.secondaryText}</span>`
                : ''}
              ${this.tertiaryText
                ? html`<span class="line tertiary" title="${tip(this.tertiaryText)}">${this.tertiaryText}</span>`
                : ''}
            </div>
          `
        : ''}
    `;

    // Ghost-button by default: the persona is a focusable control, so consumers bind
    // @click on the host (a button inside a button would be invalid markup).
    return this.interactive
      ? html`
          <button
            type="button"
            class="persona size-${this.size}"
            aria-label="${accessible}"
            ?disabled="${this.personaDisabled}"
            @click="${() => this.dispatchEvent(new Event('persona-click', { bubbles: true, composed: true }))}"
          >
            ${body}
          </button>
        `
      : html`<div class="persona size-${this.size}" aria-label="${accessible}">${body}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-persona': AppPersona;
  }
}
