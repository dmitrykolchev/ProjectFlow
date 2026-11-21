import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-toolbar';
import '../app-toolbar-button/app-toolbar-button';
import '../app-toolbar-separator/app-toolbar-separator';
import { iconFileText } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/Toolbar',
  component: 'app-toolbar',
  description:
    'Row container for toolbar buttons and separators. The size property sets the canonical control scale once and publishes it as inherited custom properties, so the row and its buttons always share one geometry (xs / sm / md / lg).',
  category: 'Common',
  propsDoc: {
    size: 'Canonical control scale of the row: xs / sm / md / lg; published to children as inherited tokens',
  },
  slotsDoc: {
    '(default)': 'Toolbar content — app-toolbar-button, app-toolbar-separator and any inline controls',
  },
  childrenDoc: {
    'app-toolbar-button': 'Push, dropdown or toggle button rendered in the toolbar row',
    'app-toolbar-separator': 'Visual divider between toolbar buttons, sized to the row scale',
  },
  stories: [
    {
      name: 'Markdown Toolbar',
      description: 'Text and icon-only buttons with separators in a canonical md row',
      render: () => html`
        <app-toolbar size="md">
          <app-toolbar-button aria-label="Heading 2"><span slot="start">H2</span></app-toolbar-button>
          <app-toolbar-button aria-label="Heading 3"><span slot="start">H3</span></app-toolbar-button>
          <app-toolbar-separator></app-toolbar-separator>
          <app-toolbar-button aria-label="Bold"><b slot="start">B</b></app-toolbar-button>
          <app-toolbar-button aria-label="Italic"><i slot="start">I</i></app-toolbar-button>
          <app-toolbar-button aria-label="Code"><span slot="start">&lt;/&gt;</span></app-toolbar-button>
          <app-toolbar-separator></app-toolbar-separator>
          <app-toolbar-button aria-label="Attach section">
            <span slot="start">${iconFileText(16)}</span>
          </app-toolbar-button>
        </app-toolbar>
      `,
    },
    {
      name: 'Control Scale',
      description: 'The same toolbar content at xs, sm, md and lg — row and buttons share one scale',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
          <app-toolbar size="xs">
            <app-toolbar-button aria-label="Bold"><b slot="start">B</b></app-toolbar-button>
            <app-toolbar-separator></app-toolbar-separator>
            <app-toolbar-button aria-label="Italic"><i slot="start">I</i></app-toolbar-button>
          </app-toolbar>
          <app-toolbar size="sm">
            <app-toolbar-button aria-label="Bold"><b slot="start">B</b></app-toolbar-button>
            <app-toolbar-separator></app-toolbar-separator>
            <app-toolbar-button aria-label="Italic"><i slot="start">I</i></app-toolbar-button>
          </app-toolbar>
          <app-toolbar size="md">
            <app-toolbar-button aria-label="Bold"><b slot="start">B</b></app-toolbar-button>
            <app-toolbar-separator></app-toolbar-separator>
            <app-toolbar-button aria-label="Italic"><i slot="start">I</i></app-toolbar-button>
          </app-toolbar>
          <app-toolbar size="lg">
            <app-toolbar-button aria-label="Bold"><b slot="start">B</b></app-toolbar-button>
            <app-toolbar-separator></app-toolbar-separator>
            <app-toolbar-button aria-label="Italic"><i slot="start">I</i></app-toolbar-button>
          </app-toolbar>
        </div>
      `,
    },
  ],
};

export default meta;
