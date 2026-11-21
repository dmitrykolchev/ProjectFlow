import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-switch.css';

// canonical frame and label-row variants (docs/ComponentApiSpecs.md, Priority E); the defaults keep
// every existing consumer pixel-identical: frame none = the bare switch, field-label-style none = no
// external label row, and the caption behaviour of the control itself (the label property text next to
// the track, the default slot overriding it) is unchanged in every variant
export type SwitchFrame = 'none' | 'normal' | 'transparent';
export type SwitchFieldLabelStyle = 'none' | 'normal' | 'ghost';
export type SwitchSize = 'sm' | 'md' | 'lg'; // canonical control scale (docs/ComponentApiSpecs.md, Priority E)

@customElement('app-switch')
export class AppSwitch extends LitElement {
  @property({ type: Boolean }) checked: boolean = false;
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: String }) label: string = '';
  // additive hooks: frame normal draws the control box with the app-input geometry (control-height-md,
  // bg-surface, border-subtle, radius-md, 0.75rem horizontal padding) around the switch; frame
  // transparent keeps the identical box with background and border transparent, so the switch occupies a
  // form row like an input without visible chrome. The frame tokens retune the box locally.
  @property({ type: String, reflect: true }) frame: SwitchFrame = 'none';
  // additive hooks for the external label row attached to the frame (the caption inside the control is
  // untouched): field-label carries the row text; field-label-style normal shows the row with the
  // app-input label typography, ghost renders it invisible so it keeps its place in the form grid. An
  // empty row is rendered for ghost, and not rendered for normal. With ghost and no field-label set, the
  // row text falls back to the label property — the invisible row carries the control caption, so a
  // single label attribute drives both the row geometry and the caption (the row is visibility hidden,
  // so the fallback never changes the layout of existing consumers).
  @property({ type: String, attribute: 'field-label' }) fieldLabel: string = '';
  @property({ type: String, attribute: 'field-label-style', reflect: true })
  fieldLabelStyle: SwitchFieldLabelStyle = 'none';
  // additive hook: the canonical control size scale sm | md | lg (30/38/44px frame heights, the root
  // control-height tokens). md is the historical geometry, so every existing consumer stays
  // pixel-identical; sm and lg scale the track, thumb, caption and the framed box together. The size
  // tokens retune the switch locally in a view.
  @property({ type: String }) size: SwitchSize = 'md';

  static styles = styles;

  render() {
    const labelRow =
      this.fieldLabelStyle === 'ghost'
        ? html`<label class="field-label is-ghost">${this.fieldLabel || this.label}</label>`
        : this.fieldLabelStyle === 'normal' && this.fieldLabel
          ? html`<label class="field-label">${this.fieldLabel}</label>`
          : '';

    return html`
      ${labelRow}
      <div
        class="switch-container size-${this.size} ${this.frame === 'normal' ? 'frame-normal' : this.frame === 'transparent' ? 'frame-transparent' : ''}"
        @click="${this.toggle}"
      >
        <div class="track ${this.checked ? 'is-checked' : ''}">
          <div class="thumb"></div>
        </div>
        ${this.label ? html`<span class="label-text">${this.label}</span>` : html`<slot></slot>`}
      </div>
    `;
  }

  private toggle() {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { checked: this.checked },
        bubbles: true,
        composed: true,
      })
    );
  }
}
