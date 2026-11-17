import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './app-button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'icon';
export type ButtonSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg';
// canonical business actions: the component owns the highlight color for each one,
// views declare the semantic action instead of writing per-view hover classes
export type ButtonAction =
  | 'default'
  | 'view'
  | 'edit'
  | 'delete'
  | 'submit'
  | 'cancel'
  | 'accept'
  | 'reject';

@customElement('app-button')
export class AppButton extends LitElement {
  @property({ type: String }) variant: ButtonVariant = 'primary';
  @property({ type: String }) size: ButtonSize = 'md';
  // reflected so a view can pin a historical hover token value on one action with an
  // [action='...'] attribute selector, without writing styling classes on the component
  @property({ type: String, reflect: true }) action: ButtonAction = 'default';
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: Boolean }) loading: boolean = false;
  @property({ type: Boolean, attribute: 'icon-only' }) iconOnly: boolean = false;
  @property({ type: String }) type: 'button' | 'submit' | 'reset' = 'button';

  // a button whose light DOM holds only an icon (no text) is square on its own,
  // no need to declare icon-only explicitly
  @state() private autoIconOnly: boolean = false;

  static styles = styles;

  render() {
    const iconOnly = this.iconOnly || this.autoIconOnly;
    return html`
      <button
        type="${this.type}"
        ?disabled="${this.disabled || this.loading}"
        class="variant-${this.variant} size-${this.size} action-${this.action} ${iconOnly ? 'icon-only' : ''}"
        @click="${this.handleClick}"
      >
        <!-- canonical slots: start / default / end; icon-start and icon-end are legacy aliases -->
        ${this.loading
          ? html`<div class="spinner" aria-hidden="true"></div>`
          : html`<slot name="start" @slotchange="${this.handleSlotChange}">
              <slot name="icon-start"></slot>
            </slot>`}
        ${!iconOnly
          ? html`<slot @slotchange="${this.handleSlotChange}"></slot>`
          : html`<slot name="icon-only" @slotchange="${this.handleSlotChange}"><slot></slot></slot>`}
        <slot name="end" @slotchange="${this.handleSlotChange}">
          <slot name="icon-end"></slot>
        </slot>
      </button>
    `;
  }

  private handleSlotChange() {
    this.evaluateContent();
  }

  private evaluateContent() {
    let hasIcon = false;
    let hasText = false;
    for (const node of Array.from(this.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const slot = (node as HTMLElement).getAttribute('slot');
        if (slot === 'start' || slot === 'end' || slot === 'icon-start' || slot === 'icon-end') {
          hasIcon = true;
        } else {
          hasText = true;
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        if ((node.textContent ?? '').trim() !== '') {
          hasText = true;
        }
      }
    }
    this.autoIconOnly = hasIcon && !hasText;
  }

  protected firstUpdated() {
    this.evaluateContent();
  }

  private handleClick(e: MouseEvent) {
    if (this.disabled || this.loading) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}
