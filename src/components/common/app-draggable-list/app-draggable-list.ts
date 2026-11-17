import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { AppDraggableListItem, DraggableItemData } from '../app-draggable-list-item/app-draggable-list-item';
import '../app-draggable-list-item/app-draggable-list-item';
import styles from './app-draggable-list.css';

/**
 * A vertical draggable list of rows. The child element is app-draggable-list-item,
 * used in two ways:
 * - property mode: the `items` array carries DraggableItemData records
 *   (value = entity id, label = title, checked = completion) and the list
 *   renders one app-draggable-list-item per record;
 * - declarative mode: app-draggable-list-item children are declared in the
 *   light DOM and rendered through the default slot; the list reads their
 *   value / label / checked properties and reorders the child nodes on drop.
 * The list owns the HTML5 drag state (dragging row, drop target, before /
 * after position). Row events (item-drag-*, item-up, item-down) bubble up
 * from the children; the list reorders and emits `list-reorder` with the new
 * items array. item-toggle and item-remove events pass through untouched.
 */
@customElement('app-draggable-list')
export class AppDraggableList extends LitElement {
  @property({ attribute: false }) items: DraggableItemData[] = [];

  @state() private draggedId: string | null = null;
  @state() private dropTargetId: string | null = null;
  @state() private dropPosition: 'before' | 'after' = 'before';
  // light DOM app-draggable-list-item children captured through the slot
  @state() private slottedChildren: DraggableItemData[] = [];

  static styles = styles;

  private boundHandlers: Array<[string, EventListener]> = [];

  connectedCallback() {
    super.connectedCallback();
    const pairs: Array<[string, EventListener]> = [
      ['item-drag-start', ((e: CustomEvent<{ value: string }>) => {
        this.draggedId = e.detail.value;
      }) as EventListener],
      ['item-drag-over', ((e: CustomEvent<{ value: string; position: 'before' | 'after' }>) => {
        if (!this.draggedId) return;
        if (this.draggedId === e.detail.value) {
          this.dropTargetId = null;
          return;
        }
        this.dropTargetId = e.detail.value;
        this.dropPosition = e.detail.position;
      }) as EventListener],
      ['item-drag-leave', ((e: CustomEvent<{ value: string }>) => {
        if (this.dropTargetId === e.detail.value) {
          this.dropTargetId = null;
        }
      }) as EventListener],
      ['item-drop', ((e: CustomEvent<{ value: string }>) => this.handleDrop(e.detail.value)) as EventListener],
      ['item-drag-end', (() => {
        this.draggedId = null;
        this.dropTargetId = null;
      }) as EventListener],
      ['item-up', ((e: CustomEvent<{ index: number }>) => this.moveRow(e.detail.index, -1)) as EventListener],
      ['item-down', ((e: CustomEvent<{ index: number }>) => this.moveRow(e.detail.index, 1)) as EventListener],
    ];
    for (const [name, listener] of pairs) {
      this.addEventListener(name, listener);
    }
    this.boundHandlers = pairs;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const [name, listener] of this.boundHandlers) {
      this.removeEventListener(name, listener);
    }
    this.boundHandlers = [];
  }

  private get effectiveItems(): DraggableItemData[] {
    return this.items.length > 0 ? this.items : this.slottedChildren;
  }

  private readSlottedItems(): DraggableItemData[] {
    const slot = this.shadowRoot?.querySelector('slot');
    if (!slot) return [];
    return slot
      .assignedElements()
      .filter((el) => el.tagName.toLowerCase() === 'app-draggable-list-item')
      .map((el) => ({
        value: (el as AppDraggableListItem).value,
        label: (el as AppDraggableListItem).label,
        checked: (el as AppDraggableListItem).checked,
      }));
  }

  private handleSlotChange(): void {
    const read = this.readSlottedItems();
    const changed =
      read.length !== this.slottedChildren.length ||
      read.some((it, i) => {
        const prev = this.slottedChildren[i];
        return !prev || prev.value !== it.value || prev.label !== it.label || prev.checked !== it.checked;
      });
    if (changed) {
      this.slottedChildren = read;
    }
  }

  // in declarative mode the child elements live in the light DOM, so the list
  // pushes index / total / dragging / drop state onto them after every update
  protected updated(): void {
    if (this.items.length > 0) return;
    const slot = this.shadowRoot?.querySelector('slot');
    if (!slot) return;
    const children = slot
      .assignedElements()
      .filter((el) => el.tagName.toLowerCase() === 'app-draggable-list-item') as AppDraggableListItem[];
    children.forEach((el, index) => {
      el.index = index;
      el.total = children.length;
      el.dragging = this.draggedId === el.value;
      el.drop = this.dropTargetId === el.value && this.draggedId !== el.value ? this.dropPosition : null;
    });
  }

  private emitReorder(next: DraggableItemData[]): void {
    this.dispatchEvent(
      new CustomEvent('list-reorder', { detail: { items: next }, bubbles: true, composed: true })
    );
  }

  private moveRow(index: number, delta: -1 | 1): void {
    const targetIndex = index + delta;
    const current = this.effectiveItems;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const next = [...current];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    this.applyOrder(next);
  }

  private handleDrop(targetValue: string): void {
    const sourceId = this.draggedId;
    const position = this.dropPosition;
    this.draggedId = null;
    this.dropTargetId = null;

    if (!sourceId || sourceId === targetValue) return;

    const current = this.effectiveItems;
    const next = [...current];
    const fromIndex = next.findIndex((s) => s.value === sourceId);
    if (fromIndex === -1) return;
    const [moved] = next.splice(fromIndex, 1);
    let insertIndex = next.findIndex((s) => s.value === targetValue);
    if (insertIndex === -1) {
      next.push(moved);
    } else {
      if (position === 'after') {
        insertIndex += 1;
      }
      next.splice(insertIndex, 0, moved);
    }
    this.applyOrder(next);
  }

  private applyOrder(next: DraggableItemData[]): void {
    if (this.items.length > 0) {
      // property mode: the parent owns the array through list-reorder
      this.emitReorder(next);
      return;
    }
    // declarative mode: move the light DOM child nodes into the new order
    const slot = this.shadowRoot?.querySelector('slot');
    const children = slot
      ? slot.assignedElements().filter((el) => el.tagName.toLowerCase() === 'app-draggable-list-item')
      : [];
    const byValue = new Map(children.map((el) => [(el as AppDraggableListItem).value, el]));
    for (const item of next) {
      const el = byValue.get(item.value);
      if (el) this.appendChild(el);
    }
    this.emitReorder(next);
  }

  render() {
    const hasChildren = this.querySelectorAll('app-draggable-list-item').length > 0;
    if (this.items.length === 0 && !hasChildren) return html``;

    const declarative = this.items.length === 0;

    return html`
      <div class="draggable-list">
        ${declarative
          ? html`<slot class="slot-host" @slotchange="${this.handleSlotChange}"></slot>`
          : repeat(
              this.items,
              (item) => item.value,
              (item, index) => {
                const isDropTarget = this.dropTargetId === item.value && this.draggedId !== item.value;
                return html`
                  <app-draggable-list-item
                    .value="${item.value}"
                    .label="${item.label}"
                    .checked="${Boolean(item.checked)}"
                    .index="${index}"
                    .total="${this.items.length}"
                    .dragging="${this.draggedId === item.value}"
                    .drop="${isDropTarget ? this.dropPosition : null}"
                  ></app-draggable-list-item>
                `;
              }
            )}
      </div>
    `;
  }
}
