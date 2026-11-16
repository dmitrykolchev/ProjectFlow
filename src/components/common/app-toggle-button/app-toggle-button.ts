import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './app-toggle-button.css';

@customElement('app-toggle-button')
export class AppToggleButton extends LitElement {
  @property({ type: Boolean, reflect: true }) pressed: boolean = false;
  @property({ type: String }) variant: 'soft' | 'solid' = 'soft';
  @property({ type: String }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: Boolean, attribute: 'icon-only' }) iconOnly: boolean = false;
  @property({ type: String }) value: string = '';

  // a button whose light DOM holds only an icon (no text) is square on its own,
  // no need to declare icon-only explicitly
  @state() private autoIconOnly: boolean = false;

  static styles = styles;

  render() {
    const iconOnly = this.iconOnly || this.autoIconOnly;
    return html`
      <button
        type="button"
        aria-pressed="${this.pressed}"
        ?disabled="${this.disabled}"
        class="variant-${this.variant} size-${this.size} ${this.pressed ? 'is-pressed' : ''} ${iconOnly ? 'icon-only' : ''}"
        @click="${this.toggle}"
      >
        <slot name="icon-start" @slotchange="${this.handleSlotChange}"></slot>
        ${!iconOnly
          ? html`<slot @slotchange="${this.handleSlotChange}"></slot>`
          : html`<slot name="icon-only" @slotchange="${this.handleSlotChange}"><slot></slot></slot>`}
        <slot name="icon-end" @slotchange="${this.handleSlotChange}"></slot>
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
        if (slot === 'icon-start' || slot === 'icon-end') {
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

  private toggle() {
    if (this.disabled) return;
    this.pressed = !this.pressed;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { pressed: this.pressed, value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }
}
