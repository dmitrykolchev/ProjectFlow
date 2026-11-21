import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { DraggableItemData } from '../app-draggable-list-item/app-draggable-list-item';
import '../app-draggable-list-item/app-draggable-list-item';
import './app-draggable-list';

const ITEMS: DraggableItemData[] = [
  { value: 'sub-1', label: 'Спроектировать схему топологии L1/L2 и контракт инвалидации' },
  { value: 'sub-2', label: 'Согласовать TTL-политику с командой платформы', checked: true },
  { value: 'sub-3', label: 'Настроить метрики hit/miss ratio и p99 латентности' },
  { value: 'sub-4', label: 'Провести нагрузочный тест на 20k rps' },
];

export const meta: ComponentStoryMeta = {
  title: 'Common/DraggableList',
  component: 'app-draggable-list',
  description:
    'A vertical list of draggable rows with an inner scrollbar. The child element is app-draggable-list-item, used in two modes: property mode — the items array (value, label, checked) renders one child per record; declarative mode — app-draggable-list-item children are declared in the light DOM and rendered through the default slot. The list owns the HTML5 drag state and reorders rows; every reorder is emitted as list-reorder with the new items array. item-toggle and item-remove events pass through to the parent.',
  category: 'Common',
  propsDoc: {
    items: 'DraggableItemData[] — value (entity id), label (title), checked (completion); empty items render the declared light DOM children',
    'child element': 'app-draggable-list-item — grip handle, order number, checkbox, title, up / down / remove actions',
  },
  eventsDoc: {
    'list-reorder': {
      detail: '{ items: DraggableItemData[] }',
      description: 'Fires after an item is dropped; carries the new order (property mode)',
    },
  },
  stories: [
    {
      name: 'Subtask Rows (property mode)',
      description: 'Four rows rendered from the items array with one checked; drag any row to reorder it (list-reorder fires)',
      render: () => html`<app-draggable-list .items="${ITEMS}"></app-draggable-list>`,
    },
    {
      name: 'Declarative Children (light DOM)',
      description:
        'The child elements app-draggable-list-item are declared directly inside the list; the list reads their value / label / checked, assigns order numbers and reorders the child nodes on drop. Clicking a checkbox flips that child\u0027s checked state.',
      render: () => html`
        <app-draggable-list
          @item-toggle="${(e: CustomEvent<{ value: string }>) => {
            const host = e.currentTarget as HTMLElement;
            const child = host.querySelector(`app-draggable-list-item[value='${e.detail.value}']`) as any;
            if (child) child.checked = !child.checked;
          }}"
        >
          <app-draggable-list-item value="sub-1" label="Спроектировать схему топологии L1/L2"></app-draggable-list-item>
          <app-draggable-list-item value="sub-2" label="Согласовать TTL-политику" .checked="${true}"></app-draggable-list-item>
          <app-draggable-list-item value="sub-3" label="Настроить метрики hit/miss ratio"></app-draggable-list-item>
        </app-draggable-list>
      `,
    },
    {
      name: 'Empty List',
      description: 'No items and no children renders nothing',
      render: () => html`<app-draggable-list .items="${[]}"></app-draggable-list>`,
    },
  ],
};

export default meta;
