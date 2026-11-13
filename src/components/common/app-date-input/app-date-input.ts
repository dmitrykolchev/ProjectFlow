import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { iconCalendar, iconChevronLeft, iconChevronRight, iconX } from '../icons';
import { PortalHandle, portalManager } from '../app-modal-portal/app-modal-portal';
import styles from './app-date-input.css';

@customElement('app-date-input')
export class AppDateInput extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: String }) value: string = ''; // YYYY-MM-DD
  @property({ type: String }) placeholder: string = 'YYYY-MM-DD';
  @property({ type: String }) min: string = '';
  @property({ type: String }) max: string = '';
  @property({ type: Boolean }) required: boolean = false;
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: String }) error: string = '';

  @state() private isOpen: boolean = false;
  @state() private viewYear: number = 2026;
  @state() private viewMonth: number = 10; // 0-indexed
  @state() private currentLang = store.customization.language;
  @state() private popoverTop: number = 0;
  @state() private popoverLeft: number = 0;

  private unsubscribe?: () => void;
  private portalHandle: PortalHandle | null = null;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncViewFromValue();
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
    });
    window.addEventListener('resize', this.handleReposition);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
    window.removeEventListener('resize', this.handleReposition);
    this.closePortal();
  }

  private handleReposition = () => {
    if (this.isOpen) {
      this.updatePopoverPosition();
    }
  };

  private updatePopoverPosition() {
    const triggerEl = this.shadowRoot?.querySelector('.date-trigger') as HTMLElement | null;
    if (!triggerEl) return;

    const rect = triggerEl.getBoundingClientRect();
    const popoverHeight = 328;
    const popoverWidth = 286;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top =
      spaceBelow >= popoverHeight || rect.top < popoverHeight
        ? Math.min(rect.bottom + 6, window.innerHeight - popoverHeight - 8)
        : Math.max(8, rect.top - popoverHeight - 6);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 8));
    this.popoverTop = top;
    this.popoverLeft = left;
  }

  private closePortal() {
    if (this.portalHandle) {
      this.portalHandle.close();
      this.portalHandle = null;
    }
  }

  protected updated() {
    if (this.isOpen && !this.disabled) {
      const t = getTranslation(this.currentLang);
      const monthName = t.calendar.months[this.viewMonth] || '';
      const template = this.renderPopover(t, monthName);
      if (!this.portalHandle) {
        this.portalHandle = portalManager.mountTemplate({
          kind: 'popup',
          styles,
          template,
          host: this,
          closeOnBackdrop: true,
          onClose: () => {
            this.isOpen = false;
          },
        });
      } else {
        this.portalHandle.update(template);
      }
    } else {
      this.closePortal();
    }
  }

  private syncViewFromValue() {
    if (this.value && /^\d{4}-\d{2}-\d{2}$/.test(this.value)) {
      const [y, m] = this.value.split('-').map(Number);
      this.viewYear = y;
      this.viewMonth = m - 1;
    } else {
      const now = new Date();
      this.viewYear = now.getFullYear();
      this.viewMonth = now.getMonth();
    }
  }

  private formatDisplay(val: string): string {
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const [y, m, d] = val.split('-');
    return `${d}.${m}.${y}`;
  }

  render() {
    return html`
      <div class="form-group">
        ${this.label
          ? html`
              <label>
                ${this.label}
                ${this.required ? html`<span class="required-star">*</span>` : ''}
              </label>
            `
          : ''}

        <div
          class="date-trigger ${this.isOpen ? 'is-open' : ''} ${this.error ? 'has-error' : ''} ${this.disabled ? 'is-disabled' : ''}"
          tabindex="${this.disabled ? -1 : 0}"
          role="combobox"
          aria-expanded="${this.isOpen}"
          @click="${this.toggleOpen}"
          @keydown="${(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              this.toggleOpen(e);
            }
          }}"
        >
          <div class="trigger-left">
            <span class="cal-icon">${iconCalendar()}</span>
            ${this.value
              ? html`<span class="date-value">${this.formatDisplay(this.value)}</span>`
              : html`<span class="date-placeholder">${this.placeholder}</span>`}
          </div>

          ${this.value && !this.disabled && !this.required
            ? html`
                <button
                  type="button"
                  class="clear-btn"
                  aria-label="Clear date"
                  @click="${this.clearDate}"
                >
                  ${iconX(13)}
                </button>
              `
            : ''}
        </div>

        ${this.error ? html`<div class="error-text">${this.error}</div>` : ''}
      </div>
    `;
  }

  private renderPopover(t: ReturnType<typeof getTranslation>, monthName: string) {
    const firstDay = new Date(this.viewYear, this.viewMonth, 1);
    const lastDay = new Date(this.viewYear, this.viewMonth + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();

    const todayStr = new Date().toISOString().slice(0, 10);
    const cells: { dateStr: string; day: number; otherMonth: boolean }[] = [];

    const prevLast = new Date(this.viewYear, this.viewMonth, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevLast - i;
      const m = this.viewMonth === 0 ? 12 : this.viewMonth;
      const y = this.viewMonth === 0 ? this.viewYear - 1 : this.viewYear;
      cells.push({
        dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        otherMonth: true,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const m = this.viewMonth + 1;
      cells.push({
        dateStr: `${this.viewYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        otherMonth: false,
      });
    }

    const totalNeeded = cells.length <= 35 ? 35 : 42;
    const rem = totalNeeded - cells.length;
    for (let d = 1; d <= rem; d++) {
      const m = this.viewMonth === 11 ? 1 : this.viewMonth + 2;
      const y = this.viewMonth === 11 ? this.viewYear + 1 : this.viewYear;
      cells.push({
        dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        otherMonth: true,
      });
    }

    return html`
      <div
        class="picker-popover"
        style="top: ${this.popoverTop}px; left: ${this.popoverLeft}px;"
        @click="${(e: Event) => e.stopPropagation()}"
      >
        <div class="picker-header">
          <button
            type="button"
            class="picker-nav-btn"
            aria-label="Previous month"
            @click="${this.prevMonth}"
          >
            ${iconChevronLeft(14)}
          </button>
          <div class="picker-period">${monthName} ${this.viewYear}</div>
          <button
            type="button"
            class="picker-nav-btn"
            aria-label="Next month"
            @click="${this.nextMonth}"
          >
            ${iconChevronRight(14)}
          </button>
        </div>

        <div class="weekdays-row">
          ${t.calendar.weekdaysShort.map((wd) => html`<div class="weekday-label">${wd}</div>`)}
        </div>

        <div class="days-grid">
          ${cells.map((c) => {
            const isSelected = c.dateStr === this.value;
            const isToday = c.dateStr === todayStr;
            const isDisabled =
              (this.min && c.dateStr < this.min) || (this.max && c.dateStr > this.max);

            return html`
              <button
                type="button"
                class="day-btn ${c.otherMonth ? 'is-other-month' : ''} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}"
                ?disabled="${Boolean(isDisabled)}"
                @click="${() => this.selectDate(c.dateStr)}"
              >
                ${c.day}
              </button>
            `;
          })}
        </div>

        <div class="picker-footer">
          <button type="button" class="footer-link-btn" @click="${this.pickToday}">
            ${t.common.today}
          </button>
          ${!this.required
            ? html`
                <button type="button" class="footer-link-btn muted" @click="${this.clearDate}">
                  ${t.common.clear}
                </button>
              `
            : ''}
        </div>
      </div>
    `;
  }

  private toggleOpen(e: Event) {
    e.stopPropagation();
    if (this.disabled) return;
    if (!this.isOpen) {
      this.syncViewFromValue();
      this.updatePopoverPosition();
    }
    this.isOpen = !this.isOpen;
  }

  private prevMonth() {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear -= 1;
    } else {
      this.viewMonth -= 1;
    }
  }

  private nextMonth() {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear += 1;
    } else {
      this.viewMonth += 1;
    }
  }

  private selectDate(dateStr: string) {
    this.value = dateStr;
    this.isOpen = false;
    this.emitChange();
  }

  private pickToday() {
    const today = new Date().toISOString().slice(0, 10);
    this.value = today;
    this.syncViewFromValue();
    this.isOpen = false;
    this.emitChange();
  }

  private clearDate(e: Event) {
    e.stopPropagation();
    this.value = '';
    this.isOpen = false;
    this.emitChange();
  }

  private emitChange() {
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }
}
