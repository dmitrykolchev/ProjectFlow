import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { iconCopy } from '../icons';
import { parseMarkdownBlocks, renderInlineMarkdown, renderMath, MarkdownCell } from '../markdown';
import '../app-button/app-button';
import '../app-checkbox/app-checkbox';
import styles from './app-markdown.css';
import katexStyles from './katex.css';

/**
 * Canonical markdown renderer web component: headings, paragraphs, quotes,
 * bullet / numbered lists, checklists (display-only checkboxes, interactive
 * when `editable` is set — then a `checklist-toggle` event carries
 * `{ line, checked }`), GFM pipe tables, LaTeX math (KaTeX, inline `$...$`
 * and display `$$...$$`) and fenced code blocks with a copy action. The
 * markdown source is passed as the `content` property or declared directly as
 * light-DOM children; the component owns its prose styling.
 */
@customElement('app-markdown')
export class AppMarkdown extends LitElement {
  @property({ attribute: false }) content = '';

  /** Checklist checkboxes are interactive and emit `checklist-toggle` when true. */
  @property({ type: Boolean }) editable = false;

  @state() private currentLang = store.customization.language;
  @state() private copiedBlockKey: string | null = null;
  // markdown declared as light-DOM children, captured from the slot
  @state() private slottedText = '';

  private unsubscribe?: () => void;

  static styles = [styles, katexStyles];

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

  private handleSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    const text = slot.assignedNodes().reduce((acc, node) => acc + (node.textContent || ''), '');
    this.slottedText = text.trim();
  }

  private async copySnippet(key: string, text: string) {
    try {
      await navigator.clipboard?.writeText(text);
      this.copiedBlockKey = key;
      setTimeout(() => {
        if (this.copiedBlockKey === key) this.copiedBlockKey = null;
      }, 1800);
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
  }

  private emitChecklistToggle(line: number, checked: boolean) {
    if (!this.editable) return;
    this.dispatchEvent(
      new CustomEvent('checklist-toggle', {
        detail: { line, checked },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const source = this.content || this.slottedText;
    const blocks = parseMarkdownBlocks(source);

    if (blocks.length === 0) return html`<slot @slotchange="${(e: Event) => this.handleSlotChange(e)}"></slot>`;

    return html`
      <slot @slotchange="${(e: Event) => this.handleSlotChange(e)}"></slot>
      <div class="prose">
        ${blocks.map((block, bIdx) => {
          switch (block.type) {
            case 'h1':
              return html`<h1>${renderInlineMarkdown(block.text || '')}</h1>`;
            case 'h2':
              return html`<h2>${renderInlineMarkdown(block.text || '')}</h2>`;
            case 'h3':
              return html`<h3>${renderInlineMarkdown(block.text || '')}</h3>`;
            case 'quote':
              return html`<div class="prose-quote">${renderInlineMarkdown(block.text || '')}</div>`;
            case 'ul':
              return html`
                <ul>
                  ${(block.items || []).map((it) => html`<li>${renderInlineMarkdown(it.text)}</li>`)}
                </ul>
              `;
            case 'ol':
              return html`
                <ol>
                  ${(block.items || []).map((it) => html`<li>${renderInlineMarkdown(it.text)}</li>`)}
                </ol>
              `;
            case 'checklist':
              return html`
                <ul class="prose-checklist">
                  ${(block.items || []).map(
                    (it) => html`
                      <li class="checklist-row ${it.checked ? 'is-checked' : ''}">
                        <app-checkbox
                          ?checked="${Boolean(it.checked)}"
                          ?disabled="${!this.editable}"
                          @change="${(e: CustomEvent<{ checked: boolean }>) => {
                            if (it.line !== undefined) this.emitChecklistToggle(it.line, e.detail.checked);
                          }}"
                        >
                          <span>${renderInlineMarkdown(it.text)}</span>
                        </app-checkbox>
                      </li>
                    `
                  )}
                </ul>
              `;
            case 'math':
              return html`<div class="math-block">${renderMath(block.text || '', true)}</div>`;
            case 'table': {
              const alignClass = (align: MarkdownCell['align']) =>
                align === 'center' ? 'cell-center' : align === 'right' ? 'cell-right' : '';
              return html`
                <div class="table-wrap">
                  <table class="prose-table">
                    <thead>
                      <tr>
                        ${(block.header || []).map(
                          (cell) => html`<th class="${alignClass(cell.align)}">${renderInlineMarkdown(cell.text)}</th>`
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      ${(block.rows || []).map(
                        (row) => html`
                          <tr>
                            ${row.map(
                              (cell) => html`<td class="${alignClass(cell.align)}">${renderInlineMarkdown(cell.text)}</td>`
                            )}
                          </tr>
                        `
                      )}
                    </tbody>
                  </table>
                </div>
              `;
            }
            case 'code': {
              const key = `md-${bIdx}`;
              const isCopied = this.copiedBlockKey === key;
              return html`
                <div class="code-block-wrap">
                  <div class="code-block-head">
                    <span>${block.lang || 'snippet'}</span>
                    <app-button
                      size="xs"
                      variant="ghost"
                      @click="${() => this.copySnippet(key, block.text || '')}"
                    >
                      <span slot="start">${iconCopy(13)}</span>
                      <span>${isCopied ? t.markdown.copiedCode : t.markdown.copyCode}</span>
                    </app-button>
                  </div>
                  <pre class="code-block-pre">${block.text}</pre>
                </div>
              `;
            }
            default:
              return html`<p>${renderInlineMarkdown(block.text || '')}</p>`;
          }
        })}
      </div>
    `;
  }
}
