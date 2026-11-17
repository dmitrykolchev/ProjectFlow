import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-draggable-list-item';

export const meta: ComponentStoryMeta = {
  title: 'Common/DraggableListItem',
  component: 'app-draggable-list-item',
  description:
    'One draggable row, shaped like a form control: value is the entity id behind the row (task / subtask id), checked is its completion state, label the visible title. Grip handle, order number and up / down / remove actions included. Every action is emitted as a composed bubbling event (item-toggle {value}, item-up {index}, item-down {index}, item-remove {value}, item-drag-*) for the parent app-draggable-list — the child element of that list.',
  category: 'Common',
  propsDoc: {
    value: 'entity id behind the row (task / subtask id)',
    label: 'visible title text',
    checked: 'completion state (checkbox + struck-through title)',
    index: 'position in the list (order number and up-button disabled state)',
    total: 'list length (down-button disabled state)',
    dragging: 'the row is being dragged (dashed accent border, faded)',
    drop: 'drop indicator on this row: before | after | null',
  },
  stories: [
    {
      name: 'First Row',
      description: 'Up action disabled at the top of the list',
      render: () =>
        html`<app-draggable-list-item value="sub-1" label="Спроектировать схему топологии L1/L2 и контракт инвалидации" .index="${0}" .total="${3}"></app-draggable-list-item>`,
    },
    {
      name: 'Checked Row',
      description: 'checked=true row with the title struck through',
      render: () =>
        html`<app-draggable-list-item value="sub-2" label="Согласовать TTL-политику с командой платформы" .checked="${true}" .index="${1}" .total="${3}"></app-draggable-list-item>`,
    },
    {
      name: 'Drop Indicator',
      description: 'A row marked as the drop target (accent line above)',
      render: () =>
        html`<app-draggable-list-item value="sub-1" label="Спроектировать схему топологии L1/L2" .index="${2}" .total="${3}" drop="before"></app-draggable-list-item>`,
    },
  ],
};

export default meta;
