import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './app-radio-group.css';
import { DeclarativeOption, OptionDataSource, optionsFromElements, resolveDataSource } from '../app-option/app-option';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  // cloned graphic content from the canonical start / end slots of <app-option>
  start?: Node[];
  end?: Node[];
}

// detail of the `change` event (named event-detail interface, AGENTS.md §6)
export interface RadioGroupChangeDetail {
  value: string;
  option: RadioOption;
}

@customElement('app-radio-group')
export class AppRadioGroup extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: String }) name: string = '';
  @property({ type: String, reflect: true }) value: string = '';
  @property({ type: Array }) options: RadioOption[] = [];
  // declarative <app-option> children and data sources fill the group as well:
  // array, promise, or a function returning an array (sync or async)
  @property({ type: Object, attribute: false }) dataSource?: OptionDataSource;
  @property({ type: String }) orientation: 'vertical' | 'horizontal' = 'vertical';
  @property({ type: String }) variant: 'default' | 'card' = 'default';
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;

  @state() private declarativeOptions: DeclarativeOption[] = [];
  @state() private resolvedOptions: DeclarativeOption[] = [];
  private loadedSource: OptionDataSource | undefined;

  static styles = styles;

  // options from the prop, declarative <app-option> children, and the data source
  private allOptions(): RadioOption[] {
    return [...this.options, ...this.declarativeOptions, ...this.resolvedOptions];
  }

  private handleSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this.declarativeOptions = optionsFromElements(
      slot.assignedElements({ flatten: true }) as HTMLElement[]
    );
  }

  private async loadDataSource() {
    const source = this.dataSource;
    const result = await resolveDataSource(source);
    // ignore a stale response if the source changed while loading
    if (this.dataSource === source) {
      this.resolvedOptions = result;
    }
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('dataSource') && this.dataSource !== this.loadedSource) {
      this.loadedSource = this.dataSource;
      void this.loadDataSource();
    }
  }

  render() {
    const all = this.allOptions();

    return html`
      <div class="radio-group-wrapper" role="radiogroup" aria-label="${this.label || this.name}">
        ${this.label ? html`<span class="group-label">${this.label}</span>` : ''}
        <div class="options-list ${this.orientation} variant-${this.variant}">
          ${all.map((opt, idx) => {
            const isSelected = opt.value === this.value;
            const isDisabled = this.disabled || opt.disabled;
            return html`
              <div
                role="radio"
                tabindex="${isDisabled ? -1 : 0}"
                aria-checked="${isSelected}"
                aria-disabled="${Boolean(isDisabled)}"
                class="radio-option ${isSelected ? 'is-selected' : ''} ${isDisabled ? 'is-disabled' : ''}"
                @click="${() => this.selectOption(opt)}"
                @keydown="${(e: KeyboardEvent) => this.handleKeyDown(e, idx, opt)}"
              >
                <div class="radio-circle">
                  <div class="radio-dot"></div>
                </div>
                <div class="option-content">
                  <span class="option-label">
                    ${opt.start ? html`<span class="option-slot-start">${opt.start}</span>` : ''}
                    ${opt.label}
                    ${opt.end ? html`<span class="option-slot-end">${opt.end}</span>` : ''}
                  </span>
                  ${opt.description ? html`<span class="option-desc">${opt.description}</span>` : ''}
                </div>
              </div>
            `;
          })}
        </div>

        <!-- declarative <app-option> children -->
        <slot @slotchange="${this.handleSlotChange}"></slot>
      </div>
    `;
  }

  private handleKeyDown(e: KeyboardEvent, idx: number, opt: RadioOption) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.selectOption(opt);
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const all = this.allOptions();
      if (this.disabled || all.length === 0) return;
      const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
      for (let offset = 1; offset <= all.length; offset++) {
        const nextIdx = (idx + step * offset + all.length) % all.length;
        const nextOpt = all[nextIdx];
        if (!nextOpt.disabled) {
          this.selectOption(nextOpt);
          const radios = this.shadowRoot?.querySelectorAll('[role="radio"]');
          (radios?.[nextIdx] as HTMLElement | undefined)?.focus();
          break;
        }
      }
    }
  }

  private selectOption(opt: RadioOption) {
    if (this.disabled || opt.disabled || this.value === opt.value) return;
    this.value = opt.value;
    this.dispatchEvent(
      new CustomEvent<RadioGroupChangeDetail>('change', {
        detail: { value: this.value, option: opt },
        bubbles: true,
        composed: true,
      })
    );
  }
}
