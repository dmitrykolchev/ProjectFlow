import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import '../../common/app-badge/app-badge';
import { statusLabel, statusVariant, type StatusDomain } from '../../../domain/status-tokens';

@customElement('app-status-chip')
export class AppStatusChip extends LitElement {
  @property({ type: String }) domain: StatusDomain = 'task';
  @property({ type: String }) status: string = '';
  @property({ type: String }) size: 'sm' | 'md' = 'sm';
  @property({ type: String }) appearance: 'soft' | 'solid' | 'outline' = 'soft';
  @property({ type: Boolean, attribute: 'dot' }) dot: boolean = false;

  private unsubscribe: (() => void) | null = null;

  static styles = css`
    :host {
      display: inline-flex;
      vertical-align: middle;
    }
  `;

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
    const lang = store.customization.language;
    const t = getTranslation(lang);
    const variant = statusVariant(this.domain, this.status);
    const label = statusLabel(this.domain, this.status, lang, t);
    return html`
      <app-badge
        variant="${variant}"
        appearance="${this.appearance}"
        size="${this.size}"
        ?dot="${this.dot}"
      >
        ${label}
      </app-badge>
    `;
  }
}
