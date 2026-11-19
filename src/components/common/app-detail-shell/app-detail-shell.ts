import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { eventValue } from '../event-value';
import { iconChevronLeft } from '../icons';
import {
  EntityEmblemKind,
} from '../app-entity-emblem/app-entity-emblem';
import {
  EntitySelectorOption,
} from '../app-entity-selector/app-entity-selector';
import '../app-button/app-button';
import '../app-entity-emblem/app-entity-emblem';
import '../app-entity-selector/app-entity-selector';
import detailShellStyles from './app-detail-shell.css';
import styles from './app-detail-shell-layout.css';

export interface DetailSwitchDetail {
  value: string;
}

/**
 * Shared skeleton of the entity detail views: the top navigation bar (back button +
 * entity switcher + action buttons), the overview card (emblem, title block, KPI
 * strip, context grid) and the page shell layout. Content is supplied through named
 * slots — `nav-actions`, `hero-meta`, `title`, `hero-sub`, `hero-side`, `kpi`,
 * `context` and the default slot for the section cards below the overview. Slotted
 * elements live in the host view's shadow tree, so the shared detail shell CSS layer
 * styles them there; the shell owns only the skeleton markup.
 */
@customElement('app-detail-shell')
export class AppDetailShell extends LitElement {
  /** Label of the back button (from the view's i18n section). */
  @property({ type: String }) backLabel = '';

  /** Placeholder of the entity switcher when nothing is selected. */
  @property({ type: String }) switcherPlaceholder = '';

  /** Options rendered by the entity switcher. */
  @property({ attribute: false }) switcherOptions: EntitySelectorOption[] = [];

  /** Id of the entity currently displayed. */
  @property({ type: String }) switcherValue = '';

  /** Emblem kind rendered in the hero identity. */
  @property({ type: String }) entity: EntityEmblemKind = 'project';

  static styles = [detailShellStyles, styles];

  private emitBack() {
    this.dispatchEvent(
      new CustomEvent('detail-back', { bubbles: true, composed: true })
    );
  }

  private handleSwitch(e: Event) {
    const value = eventValue(e);
    if (value && value !== this.switcherValue) {
      this.dispatchEvent(
        new CustomEvent<DetailSwitchDetail>('entity-switch', {
          detail: { value },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  render() {
    return html`
      <div class="page-shell">
        <div class="top-nav-bar">
          <div class="nav-left">
            <app-button
              variant="outline"
              size="sm"
              @click="${this.emitBack}"
            >
              <span slot="icon-start">${iconChevronLeft(15)}</span>
              <span>${this.backLabel}</span>
            </app-button>

            <div class="switcher">
              <app-entity-selector
                size="sm"
                placeholder="${this.switcherPlaceholder}"
                .options="${this.switcherOptions}"
                .value="${this.switcherValue}"
                @change="${this.handleSwitch}"
              ></app-entity-selector>
            </div>
          </div>

          <div class="nav-actions">
            <slot name="nav-actions"></slot>
          </div>
        </div>

        <section class="overview-card">
          <div class="hero-top">
            <div class="hero-identity">
              <app-entity-emblem entity="${this.entity}" size="lg"></app-entity-emblem>
              <div class="title-block">
                <div class="hero-meta-row">
                  <slot name="hero-meta"></slot>
                </div>
                <div class="title-row">
                  <slot name="title"></slot>
                </div>
                <slot name="hero-sub"></slot>
              </div>
            </div>
            <slot name="hero-side"></slot>
          </div>

          <div class="kpi-strip">
            <slot name="kpi"></slot>
          </div>

          <div class="context-grid">
            <slot name="context"></slot>
          </div>
        </section>

        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-detail-shell': AppDetailShell;
  }
}
