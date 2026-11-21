import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './app-segmented-switch.css';
import { DeclarativeOption, OptionDataSource, optionsFromElements, resolveDataSource } from '../app-option/app-option';

export interface SegmentedOption {
  value: string;
  label: string;
  disabled?: boolean;
  // cloned graphic content from the canonical start / end slots of <app-option>
  start?: Node[];
  end?: Node[];
}

@customElement('app-segmented-switch')
export class AppSegmentedSwitch extends LitElement {
  @property({ type: Array }) options: SegmentedOption[] = [];
  // declarative <app-option> children and data sources fill the track as well:
  // array, promise, or a function returning an array (sync or async)
  @property({ type: Object, attribute: false }) dataSource?: OptionDataSource;
  @property({ type: String }) value: string = '';
  // canonical control size scale (docs/ComponentApiSpecs.md, Priority E), md default = historical look
  @property({ type: String }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: Boolean, attribute: 'full-width', reflect: true }) fullWidth: boolean = false;
  @property({ type: Boolean }) disabled: boolean = false;

  @state() private declarativeOptions: DeclarativeOption[] = [];
  @state() private resolvedOptions: DeclarativeOption[] = [];
  private loadedSource: OptionDataSource | undefined;

  static styles = styles;

  // options from the prop, declarative <app-option> children, and the data source
  private allOptions(): SegmentedOption[] {
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
    return html`
      <div
        class="segmented-track size-${this.size} ${this.disabled ? 'is-disabled' : ''}"
        role="radiogroup"
      >
        ${this.allOptions().map((opt) => {
          const isActive = opt.value === this.value;
          return html`
            <button
              type="button"
              role="radio"
              aria-checked="${isActive}"
              class="segment-btn ${isActive ? 'is-active' : ''}"
              ?disabled="${this.disabled || opt.disabled}"
              @click="${() => this.selectOption(opt)}"
            >
              ${opt.start ? html`<span class="option-slot-start">${opt.start}</span>` : ''}
              ${opt.label}
              ${opt.end ? html`<span class="option-slot-end">${opt.end}</span>` : ''}
            </button>
          `;
        })}
      </div>

      <!-- declarative <app-option> children -->
      <slot @slotchange="${this.handleSlotChange}"></slot>
    `;
  }

  private selectOption(opt: SegmentedOption) {
    if (this.disabled || opt.disabled || this.value === opt.value) return;
    this.value = opt.value;
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value, option: opt },
        bubbles: true,
        composed: true,
      })
    );
  }
}
