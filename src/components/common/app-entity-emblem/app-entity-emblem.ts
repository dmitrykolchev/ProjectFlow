import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  iconBuilding,
  iconCalculator,
  iconFileText,
  iconFolder,
  iconHandshake,
  iconKanban,
  iconLayers,
  iconUser,
} from '../icons';
import styles from './app-entity-emblem.css';

export type EntityEmblemKind =
  | 'project'
  | 'task'
  | 'requirement'
  | 'company'
  | 'counterparty'
  | 'contract'
  | 'calculation'
  | 'employee';

@customElement('app-entity-emblem')
export class AppEntityEmblem extends LitElement {
  @property({ type: String, reflect: true }) entity: EntityEmblemKind = 'project';
  @property({ type: String, reflect: true }) size: 'xs' | 'sm' | 'md' | 'lg' = 'lg';
  @property({ type: String, reflect: true }) variant: 'emblem' | 'pill' = 'emblem';
  @property({ type: String }) color: string = '';

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

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('color')) {
      if (this.color.trim()) {
        this.style.setProperty('--emblem-color', this.color.trim());
      } else {
        this.style.removeProperty('--emblem-color');
      }
    }
  }

  private getIconSize(): number {
    if (this.variant === 'pill') {
      return this.size === 'md' || this.size === 'lg' ? 14 : 12;
    }
    switch (this.size) {
      case 'xs':
        return 13;
      case 'sm':
        return 15;
      case 'md':
        return 20;
      case 'lg':
      default:
        return 24;
    }
  }

  private renderEntityIcon(iconSize: number): TemplateResult {
    switch (this.entity) {
      case 'project':
        return iconFolder(iconSize);
      case 'task':
        return iconKanban(iconSize);
      case 'requirement':
        return iconLayers(iconSize);
      case 'company':
        return iconBuilding(iconSize);
      case 'counterparty':
        return iconHandshake(iconSize);
      case 'contract':
        return iconFileText(iconSize);
      case 'calculation':
        return iconCalculator(iconSize);
      case 'employee':
      default:
        return iconUser(iconSize);
    }
  }

  render() {
    const t = getTranslation(this.currentLang);
    const label = t.entityTypes[this.entity] || '';
    const iconSize = this.getIconSize();

    if (this.variant === 'pill') {
      return html`
        <span class="entity-pill size-${this.size}" title="${label}" aria-label="${label}">
          <span class="pill-icon">${this.renderEntityIcon(iconSize)}</span>
          <span>${label}</span>
        </span>
      `;
    }

    return html`
      <span class="emblem-box size-${this.size}" title="${label}" aria-label="${label}">
        ${this.renderEntityIcon(iconSize)}
      </span>
    `;
  }
}
