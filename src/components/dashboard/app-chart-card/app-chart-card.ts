import { LitElement, html, svg } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-chart-card.css';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

@customElement('app-chart-card')
export class AppChartCard extends LitElement {
  @property({ type: String }) title: string = '';
  @property({ type: String }) subtitle: string = '';
  @property({ type: String }) type: 'bar' | 'donut' | 'line' = 'bar';
  @property({ type: Array }) data: ChartDataPoint[] = [];
  @property({ type: String }) centerLabel: string = 'Всего';

  static styles = styles;

  render() {
    return html`
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title-wrap">
            <span class="chart-title">${this.title}</span>
            ${this.subtitle ? html`<span class="chart-subtitle">${this.subtitle}</span>` : ''}
          </div>
          <slot name="actions"></slot>
        </div>

        ${this.data.length === 0
          ? html`<div style="padding: 2rem 0; text-align: center; color: var(--text-muted);">Нет данных</div>`
          : this.type === 'donut'
          ? this.renderDonut()
          : this.type === 'line'
          ? this.renderLine()
          : this.renderBar()}
      </div>
    `;
  }

  private renderBar() {
    const total = this.data.reduce((s, d) => s + d.value, 0) || 1;
    const max = Math.max(...this.data.map((d) => d.value), 1);

    return html`
      <div class="bar-chart-list">
        ${this.data.map((d) => {
          const widthPct = Math.round((d.value / max) * 100);
          const sharePct = Math.round((d.value / total) * 100);
          return html`
            <div class="bar-item">
              <div class="bar-row-meta">
                <span class="bar-label">${d.label}</span>
                <span class="bar-value">${d.value} (${sharePct}%)</span>
              </div>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  style="width: ${widthPct}%; background: ${d.color || 'var(--accent-primary, #6366f1)'};"
                ></div>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderDonut() {
    const total = this.data.reduce((s, d) => s + d.value, 0);
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    let accumulated = 0;

    return html`
      <div class="donut-layout">
        <div class="donut-svg-wrap">
          <svg viewBox="0 0 140 140" width="144" height="144">
            <circle
              cx="70"
              cy="70"
              r="${radius}"
              fill="none"
              stroke="var(--bg-subtle, #1a2438)"
              stroke-width="16"
            />
            ${total > 0
              ? this.data.map((d) => {
                  const fraction = d.value / total;
                  const dash = fraction * circumference;
                  const gap = circumference - dash;
                  const offset = -accumulated * circumference;
                  accumulated += fraction;
                  return svg`
                    <circle
                      cx="70"
                      cy="70"
                      r="${radius}"
                      fill="none"
                      stroke="${d.color || '#6366f1'}"
                      stroke-width="16"
                      stroke-dasharray="${dash} ${gap}"
                      stroke-dashoffset="${offset}"
                      transform="rotate(-90 70 70)"
                    />
                  `;
                })
              : ''}
          </svg>
          <div class="donut-center">
            <span class="donut-total">${total}</span>
            <span class="donut-caption">${this.centerLabel}</span>
          </div>
        </div>

        <div class="donut-legend">
          ${this.data.map((d) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return html`
              <div class="legend-row">
                <div class="legend-left">
                  <span class="legend-swatch" style="background: ${d.color || '#6366f1'};"></span>
                  <span>${d.label}</span>
                </div>
                <span class="legend-val">${d.value} · ${pct}%</span>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private renderLine() {
    const w = 480;
    const h = 150;
    const padX = 10;
    const padY = 14;
    const vals = this.data.map((d) => d.value);
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 1);
    const range = max - min || 1;

    const coords = this.data.map((d, i) => {
      const x = padX + (i / Math.max(1, this.data.length - 1)) * (w - padX * 2);
      const y = h - padY - ((d.value - min) / range) * (h - padY * 2);
      return { x, y, ...d };
    });

    const linePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const areaPoints = `${padX},${h - padY} ${linePoints} ${w - padX},${h - padY}`;

    return html`
      <div class="line-svg-wrap">
        <svg class="line-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
          ${svg`
            <line x1="0" y1="${h * 0.25}" x2="${w}" y2="${h * 0.25}" stroke="var(--border-subtle, #1e293b)" stroke-dasharray="4 4" />
            <line x1="0" y1="${h * 0.5}" x2="${w}" y2="${h * 0.5}" stroke="var(--border-subtle, #1e293b)" stroke-dasharray="4 4" />
            <line x1="0" y1="${h * 0.75}" x2="${w}" y2="${h * 0.75}" stroke="var(--border-subtle, #1e293b)" stroke-dasharray="4 4" />
            <polygon points="${areaPoints}" fill="var(--accent-soft, rgba(99, 102, 241, 0.16))" />
            <polyline fill="none" stroke="var(--accent-primary, #6366f1)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${linePoints}" />
            ${coords.map(
              (c) => svg`
                <circle cx="${c.x}" cy="${c.y}" r="3.5" fill="var(--bg-surface, #111827)" stroke="var(--accent-primary, #6366f1)" stroke-width="2" />
              `
            )}
          `}
        </svg>
        <div class="axis-labels">
          ${this.data.map((d) => html`<span>${d.label}</span>`)}
        </div>
      </div>
    `;
  }
}
