import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './app-toolbar-separator.css';

/**
 * Visual divider between toolbar buttons. It renders inside an app-toolbar and
 * reads the toolbar's inherited size tokens (--tb-height), so the separator
 * matches the control scale of its row (sm / md / lg).
 */
@customElement('app-toolbar-separator')
export class AppToolbarSeparator extends LitElement {
  static styles = styles;

  render() {
    return html`<div class="sep" aria-hidden="true"></div>`;
  }
}
