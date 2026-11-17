import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { iconCheck, iconX } from '../icons';
import styles from './app-tags-row.css';

/**
 * Canonical tags row for document cards, preview bars and readonly displays.
 * The component owns the chip list, the inline add form draft and the add button
 * that toggles it; views pass the `tags` array, pick a mode (`readonly` shows
 * plain chips without any editing UI, `add-button` shows editable chips with an
 * add button that opens the inline form, `add-form` shows editable chips with
 * the form always open) and receive `tag-remove` / `tag-add` events carrying
 * `{ tag }` so they write to the store themselves. `showEmptyLabel` renders the
 * no-tags hint for an empty list (preview bars); card rows keep it off.
 */
@customElement('app-tags-row')
export class AppTagsRow extends LitElement {
  @property({ type: Array }) tags: string[] = [];
  @property() mode: 'readonly' | 'add-button' | 'add-form' = 'readonly';
  @property({ type: Boolean }) showEmptyLabel = false;

  @state() private currentLang = store.customization.language;
  @state() private addFormOpen = false;
  @state() private draft = '';

  static styles = styles;

  private commitTag() {
    const tag = this.draft.trim();
    if (!tag) return;
    this.dispatchEvent(
      new CustomEvent('tag-add', { detail: { tag }, bubbles: true, composed: true })
    );
    this.draft = '';
    if (this.mode === 'add-button') this.addFormOpen = false;
  }

  private removeTag(tag: string) {
    this.dispatchEvent(
      new CustomEvent('tag-remove', { detail: { tag }, bubbles: true, composed: true })
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const editable = this.mode !== 'readonly';
    const showForm = this.mode === 'add-form' || (this.mode === 'add-button' && this.addFormOpen);

    return html`
      ${this.tags.length === 0 && this.showEmptyLabel
        ? html`<span class="tags-empty">${t.documents.noTags}</span>`
        : ''}
      ${this.tags.map(
        (tag) => html`
          <span class="tag-chip${editable ? ' is-editable' : ''}">
            <span>#${tag}</span>
            ${editable
              ? html`
                  <button
                    type="button"
                    class="tag-remove-btn"
                    title="${t.documents.removeTagTitle}"
                    @click="${() => this.removeTag(tag)}"
                  >
                    ${iconX(10)}
                  </button>
                `
              : ''}
          </span>
        `
      )}
      ${showForm
        ? html`
            <span class="inline-tag-form">
              <input
                type="text"
                class="inline-tag-input"
                placeholder="${t.documents.addTagPlaceholder}"
                .value="${this.draft}"
                @input="${(e: Event) => {
                  this.draft = (e.target as HTMLInputElement).value;
                }}"
                @keydown="${(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    this.commitTag();
                  } else if (e.key === 'Escape' && this.mode === 'add-button') {
                    this.addFormOpen = false;
                    this.draft = '';
                  }
                }}"
              />
              <button
                type="button"
                class="inline-tag-action is-confirm"
                title="${t.common.add}"
                @click="${() => this.commitTag()}"
              >
                ${iconCheck(11)}
              </button>
              ${this.mode === 'add-button'
                ? html`
                    <button
                      type="button"
                      class="inline-tag-action"
                      title="${t.common.close}"
                      @click="${() => {
                        this.addFormOpen = false;
                        this.draft = '';
                      }}"
                    >
                      ${iconX(11)}
                    </button>
                  `
                : ''}
            </span>
          `
        : ''}
      ${this.mode === 'add-button' && !showForm
        ? html`
            <button
              type="button"
              class="tag-add-btn"
              @click="${() => {
                this.addFormOpen = true;
                this.draft = '';
              }}"
            >
              ${t.documents.addTagBtn}
            </button>
          `
        : ''}
    `;
  }
}
