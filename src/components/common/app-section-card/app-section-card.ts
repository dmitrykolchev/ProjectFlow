import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { iconChevronDown } from '../icons';
import styles from './app-section-card.css';

// detail of the `toggle` event (named event-detail interface, AGENTS.md §6)
export interface SectionCardToggleDetail {
  collapsed: boolean;
}

@customElement('app-section-card')
export class AppSectionCard extends LitElement {
  @property({ type: String }) title: string = '';
  @property({ type: String }) subtitle: string = '';
  @property({ type: String, attribute: 'aria-label' }) ariaLabel: string = '';
  @property({ type: String }) variant: 'default' | 'plain' | 'panel' | 'tabbed' = 'default';
  @property({ type: Boolean, attribute: 'collapsible' }) collapsible: boolean = false;
  @property({ type: Boolean, reflect: true }) collapsed: boolean = false;
  // CSS length ('26rem', '320px', ...): caps the section body height and activates its scrollbar
  @property({ type: String, attribute: 'max-height' }) maxHeight: string = '';

  static styles = styles;

  render() {
    return html`
      <section class="section-card ${this.variant}">
        <div
          class="section-header ${this.collapsible ? 'is-collapsible' : ''}"
          role="${this.collapsible ? 'button' : 'presentation'}"
          tabindex="${this.collapsible ? 0 : -1}"
          aria-label="${this.ariaLabel || this.title}"
          aria-expanded="${this.collapsible && !this.collapsed ? 'true' : 'false'}"
          @click="${(e: MouseEvent) => this.handleToggle(e)}"
          @keydown="${(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              this.handleToggle();
            }
          }}"
        >
          <div class="header-titles">
            <slot name="icon"></slot>
            ${this.title ? html`<span class="section-title">${this.title}</span>` : ''}
            ${this.subtitle ? html`<span class="section-subtitle">${this.subtitle}</span>` : ''}
            <slot name="header-left"></slot>
          </div>
          <div class="header-right">
            <slot name="actions"></slot>
            ${this.collapsible ? html`<span class="chevron ${this.collapsed ? 'is-collapsed' : ''}">${iconChevronDown(16)}</span>` : ''}
          </div>
        </div>
        ${!this.collapsed
          ? html`<div
              class="section-body ${this.maxHeight ? 'is-limited' : ''}"
              style="${this.maxHeight ? `--body-max: ${this.maxHeight};` : ''}"
            ><slot></slot></div>`
          : ''}
      </section>
    `;
  }

  private handleToggle(e?: MouseEvent) {
    if (!this.collapsible) return;
    // clicks on controls in the header slots must not toggle the section
    if (e) {
      const slots = this.shadowRoot?.querySelectorAll('slot[name="actions"], slot[name="header-left"]');
      if (slots && e.composedPath().some((el) => el === slots[0] || el === slots[1])) return;
    }
    this.collapsed = !this.collapsed;
    this.dispatchEvent(
      new CustomEvent<SectionCardToggleDetail>('toggle', {
        detail: { collapsed: this.collapsed },
        bubbles: true,
        composed: true,
      })
    );
  }
}
