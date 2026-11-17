import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { iconChevronDown, iconChevronUp, iconGripVertical, iconX } from '../icons';
import '../app-checkbox/app-checkbox';
import styles from './app-draggable-list-item.css';

export interface DraggableItemData {
  value: string;
  label: string;
  checked?: boolean;
}

/**
 * One row of a draggable list, shaped like a form control: `value` is the
 * entity id behind the row (task / subtask id), `checked` is its completion
 * state and `label` the visible title. The row is a native HTML5 drag source;
 * every user action is emitted as a composed bubbling event so the parent
 * app-draggable-list (or any listener) can react:
 * item-toggle {value}, item-up {index}, item-down {index}, item-remove {value},
 * item-drag-start {value}, item-drag-over {value, position},
 * item-drag-leave {value}, item-drop {value}, item-drag-end. The parent owns
 * the data writes and resolves `value` against its own records.
 */
@customElement('app-draggable-list-item')
export class AppDraggableListItem extends LitElement {
  @property({ type: String }) value = '';
  @property({ type: String }) label = '';
  @property({ type: Boolean }) checked = false;
  @property({ type: Number }) index = 0;
  @property({ type: Number }) total = 0;
  @property({ type: Boolean }) dragging = false;
  // drop indicator on this row while another row is being dragged over it
  @property({ type: String }) drop: 'before' | 'after' | null = null;

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

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private handleDragStart(e: DragEvent, value: string): void {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', value);
    }
    this.emit('item-drag-start', { value });
  }

  private handleDragOver(e: DragEvent, value: string): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position: 'before' | 'after' =
      e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    this.emit('item-drag-over', { value, position });
  }

  render() {
    const t = getTranslation(this.currentLang);
    if (!this.value) return html``;

    const dropClass = this.drop ? `is-drop-${this.drop}` : '';

    return html`
      <div
        class="item ${this.dragging ? 'is-dragging' : ''} ${dropClass}"
        draggable="true"
        @dragstart="${(e: DragEvent) => this.handleDragStart(e, this.value)}"
        @dragover="${(e: DragEvent) => this.handleDragOver(e, this.value)}"
        @dragleave="${() => this.emit('item-drag-leave', { value: this.value })}"
        @drop="${(e: DragEvent) => {
          e.preventDefault();
          this.emit('item-drop', { value: this.value });
        }}"
        @dragend="${() => this.emit('item-drag-end')}"
      >
        <span class="drag-handle" title="${t.draggableList.dragHandle}">
          ${iconGripVertical(14)}
        </span>
        <span class="item-order">${this.index + 1}.</span>
        <app-checkbox
          ?checked="${this.checked}"
          @change="${() => this.emit('item-toggle', { value: this.value })}"
        ></app-checkbox>
        <span class="item-title ${this.checked ? 'is-done' : ''}">${this.label}</span>
        <div class="item-actions">
          <app-button
            class="action-btn"
            size="xs"
            variant="icon"
            action="default"
            ?disabled="${this.index === 0}"
            title="${t.draggableList.moveUp}"
            aria-label="${t.draggableList.moveUp}"
            @click="${() => this.emit('item-up', { index: this.index })}"
          >
            <span slot="start">${iconChevronUp(14)}</span>
          </app-button>
          <app-button
            class="action-btn"
            size="xs"
            variant="icon"
            action="default"
            ?disabled="${this.index === this.total - 1}"
            title="${t.draggableList.moveDown}"
            aria-label="${t.draggableList.moveDown}"
            @click="${() => this.emit('item-down', { index: this.index })}"
          >
            <span slot="start">${iconChevronDown(14)}</span>
          </app-button>
          <app-button
            class="action-btn is-remove"
            size="xs"
            variant="icon"
            action="delete"
            title="${t.draggableList.remove}"
            aria-label="${t.draggableList.remove}"
            @click="${() => this.emit('item-remove', { value: this.value })}"
          >
            <span slot="start">${iconX(14)}</span>
          </app-button>
        </div>
      </div>
    `;
  }
}
