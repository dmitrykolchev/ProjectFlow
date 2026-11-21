import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { store } from '../../../state/store';
import './app-tags-row';
import '../app-option/app-option';

export const meta: ComponentStoryMeta = {
  title: 'Elements/TagsRow',
  component: 'app-tags-row',
  description:
    'Canonical tags row for document cards, preview bars and readonly displays. The component owns the chip list, the inline add form draft and the add button that toggles it; views pass the tags array, pick a mode (readonly shows plain chips without any editing UI, add-button shows editable chips with an add button opening the inline form, add-form shows editable chips with the form always open) and receive tag-remove / tag-add events carrying { tag } so they write to the store themselves. showEmptyLabel renders the no-tags hint for an empty list.',
  category: 'Elements',
  propsDoc: {
    tags: 'Tag strings rendered as chips (source of truth, never mutated by the component); combines with declarative app-option children',
    mode: "readonly = plain chips; add-button = editable chips + add button opening the inline form; add-form = editable chips with the inline form always open",
    showEmptyLabel: 'Render the no-tags hint when the list is empty (preview bars)',
  },
  eventsDoc: {
    'tag-add': { detail: '{ tag: string }', description: 'Fires when a tag is added' },
    'tag-remove': { detail: '{ tag: string }', description: 'Fires when a tag chip is removed' },
  },
  stories: [
    {
      name: 'Readonly Chips',
      description: 'Plain chips without any editing UI, tags of the first document in the store',
      render: () => html`
        <app-tags-row
          mode="readonly"
          .tags="${store.documents[0]?.tags || []}"
        ></app-tags-row>
      `,
    },
    {
      name: 'Card Add Button',
      description:
        'Editable chips with remove buttons and the dashed add button opening the inline form with confirm and cancel, card flavor',
      render: () => html`
        <app-tags-row
          mode="add-button"
          .tags="${store.documents[0]?.tags || []}"
          @tag-add="${(e: CustomEvent) => console.log('tag-add', e.detail)}"
          @tag-remove="${(e: CustomEvent) => console.log('tag-remove', e.detail)}"
        ></app-tags-row>
      `,
    },
    {
      name: 'Preview Add Form',
      description:
        'Editable chips with the inline add form always open and the no-tags hint shown for an empty list, preview bar flavor',
      render: () => html`
        <app-tags-row
          mode="add-form"
          showEmptyLabel
          .tags="${store.documents[1]?.tags || []}"
        ></app-tags-row>
      `,
    },
    {
      name: 'Declarative Options',
      description:
        'Chips built from canonical app-option children, the label text becomes the chip caption; combines with the tags array when both are given',
      render: () => html`
        <app-tags-row mode="readonly">
          <app-option value="core" label="Core Platform"></app-option>
          <app-option value="api" label="API"></app-option>
          <app-option value="grpc" label="gRPC"></app-option>
        </app-tags-row>
      `,
    },
  ],
};

export default meta;
