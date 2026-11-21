import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import styles from './app-otp-input.css';

// detail of the `otp-change` and `otp-complete` events (AGENTS.md §6)
export interface OtpInputDetail {
  value: string;
}

@customElement('app-otp-input')
export class AppOtpInput extends LitElement {
  @property({ type: Number }) length: number = 6;
  @property({ type: String }) value: string = '';
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;
  @property({ type: Boolean, reflect: true }) error: boolean = false;
  @property({ type: Boolean }) autofocus: boolean = false;

  @state() private currentLang = store.customization.language;
  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  firstUpdated() {
    if (this.autofocus && !this.disabled) {
      requestAnimationFrame(() => this.focusCell(0));
    }
  }

  public focusCell(index = 0) {
    const inputs = this.getInputs();
    const clamped = Math.max(0, Math.min(index, inputs.length - 1));
    inputs[clamped]?.focus();
    inputs[clamped]?.select();
  }

  public clear() {
    this.updateDigits(Array(this.length).fill(''), false);
    this.focusCell(0);
  }

  private getInputs(): HTMLInputElement[] {
    if (!this.shadowRoot) return [];
    return Array.from(this.shadowRoot.querySelectorAll('input.otp-cell'));
  }

  private getDigits(): string[] {
    const clean = (this.value || '').replace(/\D/g, '').slice(0, this.length);
    return Array.from({ length: this.length }, (_, idx) => clean[idx] || '');
  }

  private updateDigits(digits: string[], emitCompleteIfFull = true) {
    const joined = digits.join('').slice(0, this.length);
    this.value = joined;

    // Keep native DOM input values strictly synchronized
    const inputs = this.getInputs();
    inputs.forEach((inp, i) => {
      const char = digits[i] || '';
      if (inp.value !== char) {
        inp.value = char;
      }
    });

    this.dispatchEvent(
      new CustomEvent<OtpInputDetail>('otp-change', {
        detail: { value: joined },
        bubbles: true,
        composed: true,
      })
    );

    if (emitCompleteIfFull && joined.length === this.length) {
      this.dispatchEvent(
        new CustomEvent<OtpInputDetail>('otp-complete', {
          detail: { value: joined },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private handleInput(index: number, e: InputEvent) {
    if (this.disabled) return;
    const input = e.target as HTMLInputElement;
    const rawDigits = input.value.replace(/\D/g, '');
    const currentDigits = this.getDigits();

    if (!rawDigits) {
      currentDigits[index] = '';
      this.updateDigits(currentDigits, false);
      return;
    }

    // Handle multi-digit OS autofill (autocomplete="one-time-code") or fast typing
    if (rawDigits.length > 1) {
      const next = [...currentDigits];
      const start = rawDigits.length >= this.length ? 0 : index;
      for (let i = 0; i < rawDigits.length && start + i < this.length; i++) {
        next[start + i] = rawDigits[i];
      }
      this.updateDigits(next, true);
      const focusIdx = Math.min(start + rawDigits.length, this.length - 1);
      this.focusCell(focusIdx);
      return;
    }

    currentDigits[index] = rawDigits[0];
    this.updateDigits(currentDigits, true);

    if (index < this.length - 1) {
      this.focusCell(index + 1);
    }
  }

  private handleKeyDown(index: number, e: KeyboardEvent) {
    if (this.disabled) return;
    const digits = this.getDigits();

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        digits[index] = '';
        this.updateDigits(digits, false);
      } else if (index > 0) {
        digits[index - 1] = '';
        this.updateDigits(digits, false);
        this.focusCell(index - 1);
      }
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      digits[index] = '';
      this.updateDigits(digits, false);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index > 0) this.focusCell(index - 1);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < this.length - 1) this.focusCell(index + 1);
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      this.focusCell(0);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      this.focusCell(this.length - 1);
      return;
    }

    // Allow control shortcuts (Ctrl/Cmd+V, Ctrl/Cmd+C, Tab, etc.)
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Tab' || e.key === 'Enter') {
      return;
    }

    // Ignore non-digit characters silently while allowing numeric replacement on same cell
    if (/^[0-9]$/.test(e.key)) {
      if (digits[index]) {
        e.preventDefault();
        digits[index] = e.key;
        this.updateDigits(digits, true);
        if (index < this.length - 1) {
          this.focusCell(index + 1);
        }
      }
      return;
    }

    if (e.key.length === 1) {
      e.preventDefault();
    }
  }

  private handlePaste(index: number, e: ClipboardEvent) {
    if (this.disabled) return;
    e.preventDefault();
    const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
    if (!pasted) return;

    const digits = this.getDigits();
    const start = pasted.length >= this.length ? 0 : index;
    for (let i = 0; i < pasted.length && start + i < this.length; i++) {
      digits[start + i] = pasted[i];
    }
    this.updateDigits(digits, true);

    const nextFocus = Math.min(start + pasted.length, this.length - 1);
    this.focusCell(nextFocus);
  }

  private handleFocus(e: FocusEvent) {
    const input = e.target as HTMLInputElement;
    requestAnimationFrame(() => input.select());
  }

  render() {
    const t = getTranslation(this.currentLang);
    const digits = this.getDigits();

    return html`
      <div
        class="otp-group"
        role="group"
        aria-label="${t.viewTexts.auth.otpGroupAria}"
      >
        ${digits.map(
          (digit, idx) => html`
            ${this.length === 6 && idx === 3
              ? html`<span class="otp-separator" aria-hidden="true"></span>`
              : ''}
            <input
              type="text"
              class="otp-cell ${digit ? 'is-filled' : ''}"
              inputmode="numeric"
              pattern="[0-9]*"
              autocomplete="${idx === 0 ? 'one-time-code' : 'off'}"
              aria-label="${t.viewTexts.auth.otpCellAria(idx + 1, this.length)}"
              .value="${digit}"
              ?disabled="${this.disabled}"
              @input="${(e: InputEvent) => this.handleInput(idx, e)}"
              @keydown="${(e: KeyboardEvent) => this.handleKeyDown(idx, e)}"
              @paste="${(e: ClipboardEvent) => this.handlePaste(idx, e)}"
              @focus="${this.handleFocus}"
            />
          `
        )}
      </div>
    `;
  }
}
