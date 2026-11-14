import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-progress-bar.css';

export interface ProgressSegment {
  value: number;
  color: string;
  label?: string;
}

@customElement('app-progress-bar')
export class AppProgressBar extends LitElement {
  @property({ type: Number }) value: number = 0;
  @property({ type: Array }) segments: ProgressSegment[] = [];
  @property({ type: String }) color: string = 'var(--accent-primary, #6366f1)';
  @property({ type: Boolean, attribute: 'show-label' }) showLabel: boolean = false;
  @property({ type: String }) size: 'sm' | 'md' = 'md';

  static styles = styles;

  render() {
    const total = this.segments.reduce((s, seg) => s + seg.value, 0);
    return html`
      <div class="progress-bar ${this.size === 'sm' ? 'is-sm' : ''}">
        <div class="track" role="progressbar" aria-valuenow="${total > 0 ? total : this.value}" aria-valuemin="0" aria-valuemax="100">
          ${this.segments.length > 0
            ? this.segments.map(
                (seg) => html`
                  <div
                    class="fill segment"
                    style="width: ${Math.min(100, seg.value)}%; background: ${seg.color};"
                    title="${seg.label ?? ''}"
                  ></div>
                `
              )
            : html`
                <div
                  class="fill"
                  style="width: ${Math.min(100, Math.max(0, this.value))}%; background: ${this.color};"
                ></div>
              `}
        </div>
        ${this.showLabel
          ? html`<span class="pct-label tabular-nums">${total > 0 ? total : this.value}%</span>`
          : ''}
      </div>
    `;
  }
}
