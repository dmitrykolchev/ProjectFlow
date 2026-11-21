import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ButtonSize } from '../app-button/app-button';
import styles from './app-toolbar.css';

/**
 * Row container for toolbar buttons (app-toolbar-button), separators
 * (app-toolbar-separator) and any slotted content. The size property sets the
 * canonical control scale once; the scale is published as inherited custom
 * properties (--tb-height / --tb-font / --tb-icon / --tb-pad-x) so every child
 * control matches the toolbar row pixel-for-pixel.
 */
@customElement('app-toolbar')
export class AppToolbar extends LitElement {
  @property({ type: String, reflect: true }) size: ButtonSize = 'md';

  static styles = styles;

  render() {
    return html`
      <div class="toolbar" role="toolbar">
        <slot></slot>
      </div>
    `;
  }
}
