import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-color-swatches.css';

/**
 * Canonical color swatch picker: a row of round color buttons rendered from a
 * palette array. The component owns the active highlight; clicking a swatch
 * sets `value` and dispatches a `change` event carrying { value } so the
 * opening form writes it into its own field. Used by the project create/edit
 * form for the project color; any view that needs a fixed palette choice
 * (labels, categories, entity accents) can pass its own colors array.
 */
@customElement('app-color-swatches')
export class AppColorSwatches extends LitElement {
  @property({ type: Array }) colors: string[] = [];
  @property({ type: String }) value: string = '';

  static styles = styles;

  private selectColor(hex: string) {
    if (this.value === hex) return;
    this.value = hex;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      ${this.colors.map(
        (hex) => html`
          <button
            type="button"
            class="color-swatch ${this.value === hex ? 'is-active' : ''}"
            style="background: ${hex};"
            title="${hex}"
            @click="${() => this.selectColor(hex)}"
          ></button>
        `
      )}
    `;
  }
}
