import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './app-card-footer.css';

// Card footer row used inside entity cards: actions assigned to the start slot are
// aligned to the left edge of the card, actions assigned to the end slot are aligned
// to the right edge. The host renders the historical card footer chrome (border-top,
// padding-top, margin-top auto) so views keep their pixel layout.
@customElement('app-card-footer')
export class AppCardFooter extends LitElement {
  static styles = styles;

  render() {
    return html`
      <div class="footer-row">
        <div class="footer-start">
          <slot name="start"></slot>
        </div>
        <div class="footer-end">
          <slot name="end"></slot>
        </div>
      </div>
    `;
  }
}
