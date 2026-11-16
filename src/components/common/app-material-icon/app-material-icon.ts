import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-material-icon.css';

export type MaterialIconFamily = 'outlined' | 'rounded' | 'sharp';
// canonical icon scale shared with SVG icons: xxs|xs|sm|md|lg|xl|xxl = 12/14/16/20/24/28/36px.
// legacy aliases xsm = xs, xlg = xl stay accepted.
export type MaterialIconSize = 'xxs' | 'xs' | 'xsm' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xlg';

const MATERIAL_SIZE_CLASS: Record<MaterialIconSize, string> = {
  xxs: 'xxs',
  xs: 'xs',
  xsm: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  xxl: 'xxl',
  xlg: 'xl',
};

export type MaterialIconVariant = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger';

// Material Symbols (fonts.google.com/icons) — self-hosted variable font, Google axes:
// fill (0|1), weight (100..700), grade (-50..200); family = Google style (Outlined/Rounded/Sharp).
// size — the canonical app icon scale xxs|xs|sm|md|lg|xl|xxl (12/14/16/20/24/28/36px) — glyph inherits the size.
// name — ligature icon name of the Google registry (snake_case, e.g. "check_circle").
// Accessibility: role=img + aria-label from the name; aria-hidden for decorative icons.
@customElement('app-material-icon')
export class AppMaterialIcon extends LitElement {
  static styles = styles;

  @property() name = 'star';
  @property() size: MaterialIconSize = 'md'; // canonical scale, md default (20px)
  @property({ type: Number }) fill = 0; // 0 | 1
  @property({ type: Number }) weight = 400; // 100..700
  @property({ type: Number }) grade = 0; // -50..200
  @property() family: MaterialIconFamily = 'outlined'; // Google style: variable font family
  @property({ type: Boolean }) decorative = false; // aria-hidden, no label
  // variant — icon color from status tokens (neutral inherits currentColor)
  @property() variant: MaterialIconVariant = 'neutral';

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('size')) {
      this.classList.remove('xxs', 'xs', 'xsm', 'sm', 'md', 'lg', 'xl', 'xlg');
      this.classList.add(MATERIAL_SIZE_CLASS[this.size] ?? 'md');
    }
    if (changed.has('variant')) {
      this.setAttribute('data-variant', this.variant);
    }
  }

  render() {
    const label = this.name.replace(/_/g, ' ');
    // Google axes (FILL/wght/GRAD) — from props into CSS custom properties consumed by .glyph
    const axes = `--mi-fill:${this.fill};--mi-wght:${this.weight};--mi-grad:${this.grade}`;
    return html`<span class="glyph f-${this.family}" part="glyph" style=${axes}
      aria-hidden=${this.decorative ? 'true' : 'false'}
      aria-label=${this.decorative ? '' : label}
      role=${this.decorative ? 'presentation' : 'img'}>${this.name}</span>`;
  }
}
