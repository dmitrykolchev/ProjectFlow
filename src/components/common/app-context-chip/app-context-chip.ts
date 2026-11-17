import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { iconArrowUpRight, iconBookOpen, iconFileText, iconLayers } from '../icons';
import { ContextChipData, contextKindLabel, contextReasonLabel } from '../context-chip-data';
import '../app-button/app-button';
import styles from './app-context-chip.css';

/**
 * One context source chip: kind icon badge, entity title and the match reason
 * line inside a single bordered frame. In `select` mode clicking the chip body
 * toggles its selection state (event chip-toggle); the single trailing arrow
 * button opens the source entity in the app (event chip-open). The parent owns
 * store writes.
 */
@customElement('app-context-chip')
export class AppContextChip extends LitElement {
  @property({ attribute: false }) data?: ContextChipData;
  // select = toggleable picker chip, display = read-only chip with open action
  @property({ type: String }) mode: 'select' | 'display' = 'display';

  @state() private currentLang = store.customization.language;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  render() {
    const t = getTranslation(this.currentLang);
    const d = this.data;
    if (!d) return html``;

    const kindCls = d.kind === 'requirement' ? 'is-req' : d.kind === 'knowledge' ? 'is-kb' : 'is-doc';
    const kindIcon = d.kind === 'requirement' ? iconLayers(12) : d.kind === 'knowledge' ? iconBookOpen(12) : iconFileText(12);
    const metaLine = d.reason
      ? `${contextKindLabel(d.kind, t)} · ${contextReasonLabel(d.reason, t)}`
      : contextKindLabel(d.kind, t);

    return html`
      <div class="chip ${d.selected ? 'is-selected' : ''}">
        <div
          class="chip-body ${this.mode === 'select' ? 'is-clickable' : ''}"
          @click="${this.mode === 'select' ? () => this.emit('chip-toggle', { key: d.key }) : null}"
        >
          <span class="kind-icon ${kindCls}">${kindIcon}</span>
          <span class="chip-text">
            <span class="chip-title" title="${d.title}">${d.title}</span>
            <span class="chip-meta" title="${metaLine}">${metaLine}</span>
          </span>
        </div>
        <app-button
          class="chip-open"
          size="xs"
          variant="icon"
          title="${d.title}"
          @click="${() => this.emit('chip-open', { kind: d.kind, id: d.id })}"
        >
          <span slot="start">${iconArrowUpRight(12)}</span>
        </app-button>
      </div>
    `;
  }
}
