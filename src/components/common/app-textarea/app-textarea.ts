import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './app-textarea.css';

// detail of the `input` and `change` events (named event-detail interface, AGENTS.md §6)
export interface TextareaChangeDetail {
  value: string;
}

@customElement('app-textarea')
export class AppTextarea extends LitElement {
  @property({ type: String }) label: string = '';
  @property({ type: String }) placeholder: string = '';
  @property({ type: String }) value: string = '';
  @property({ type: Number }) rows: number = 3;
  @property({ type: Boolean }) required: boolean = false;
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: String }) error: string = '';
  @property({ type: Number }) maxlength: number = 0;
  @property({ type: Boolean }) monospace: boolean = false;

  static styles = styles;

  /**
   * Wrap current selection (or insert placeholder) with prefix/suffix, update value,
   * and emit a bubbling input event so parent bindings stay synced.
   */
  public wrapSelection(prefix: string, suffix = '', placeholder = ''): string {
    const textarea = this.shadowRoot?.querySelector('textarea');
    const cur = this.value || '';
    if (!textarea) {
      const next = cur + (cur && !cur.endsWith('\n') ? '\n' : '') + prefix + placeholder + suffix;
      this.value = next;
      this.dispatchEvent(new CustomEvent<TextareaChangeDetail>('input', { detail: { value: next }, bubbles: true, composed: true }));
      return next;
    }
    const start = textarea.selectionStart ?? cur.length;
    const end = textarea.selectionEnd ?? cur.length;
    const selected = cur.slice(start, end) || placeholder;
    const inserted = `${prefix}${selected}${suffix}`;
    const next = `${cur.slice(0, start)}${inserted}${cur.slice(end)}`;
    this.value = next;
    textarea.value = next;
    this.dispatchEvent(new CustomEvent<TextareaChangeDetail>('input', { detail: { value: next }, bubbles: true, composed: true }));
    const caretStart = start + prefix.length;
    const caretEnd = caretStart + selected.length;
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(caretStart, caretEnd);
    });
    return next;
  }

  render() {
    return html`
      <div class="form-group">
        <div class="label-row">
          ${this.label
            ? html`
                <label>
                  ${this.label}
                  ${this.required ? html`<span class="required-star">*</span>` : ''}
                </label>
              `
            : html`<span></span>`}
          ${this.maxlength > 0
            ? html`<span class="char-count">${(this.value || '').length}/${this.maxlength}</span>`
            : ''}
        </div>
        <textarea
          rows="${this.rows}"
          placeholder="${this.placeholder}"
          .value="${this.value || ''}"
          ?required="${this.required}"
          ?disabled="${this.disabled}"
          maxlength="${this.maxlength > 0 ? this.maxlength : undefined}"
          class="${this.error ? 'has-error' : ''} ${this.monospace ? 'is-mono' : ''}"
          @input="${this.handleInput}"
          @change="${this.handleChange}"
        ></textarea>
        ${this.error ? html`<div class="error-text">${this.error}</div>` : ''}
      </div>
    `;
  }

  private handleInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.value = textarea.value;
    this.dispatchEvent(
      new CustomEvent<TextareaChangeDetail>('input', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleChange(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.value = textarea.value;
    this.dispatchEvent(
      new CustomEvent<TextareaChangeDetail>('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }
}
