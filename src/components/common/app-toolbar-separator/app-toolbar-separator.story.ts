import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-toolbar-separator';
import '../app-toolbar/app-toolbar';
import '../app-toolbar-button/app-toolbar-button';

export const meta: ComponentStoryMeta = {
  title: 'Common/ToolbarSeparator',
  component: 'app-toolbar-separator',
  description:
    'Visual divider between toolbar buttons. It renders inside an app-toolbar and reads the inherited row scale (--tb-height), so the separator matches the control scale of its row.',
  category: 'Common',
  propsDoc: {},
  slotsDoc: {},
  stories: [
    {
      name: 'Separators In A Row',
      description: 'The separator line hugs the button height at every size',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
          <app-toolbar size="sm">
            <app-toolbar-button aria-label="Bold"><b slot="start">B</b></app-toolbar-button>
            <app-toolbar-separator></app-toolbar-separator>
            <app-toolbar-button aria-label="Italic"><i slot="start">I</i></app-toolbar-button>
            <app-toolbar-separator></app-toolbar-separator>
            <app-toolbar-button aria-label="Code"><span slot="start">&lt;/&gt;</span></app-toolbar-button>
          </app-toolbar>
          <app-toolbar size="md">
            <app-toolbar-button aria-label="Bold"><b slot="start">B</b></app-toolbar-button>
            <app-toolbar-separator></app-toolbar-separator>
            <app-toolbar-button aria-label="Italic"><i slot="start">I</i></app-toolbar-button>
            <app-toolbar-separator></app-toolbar-separator>
            <app-toolbar-button aria-label="Code"><span slot="start">&lt;/&gt;</span></app-toolbar-button>
          </app-toolbar>
          <app-toolbar size="lg">
            <app-toolbar-button aria-label="Bold"><b slot="start">B</b></app-toolbar-button>
            <app-toolbar-separator></app-toolbar-separator>
            <app-toolbar-button aria-label="Italic"><i slot="start">I</i></app-toolbar-button>
            <app-toolbar-separator></app-toolbar-separator>
            <app-toolbar-button aria-label="Code"><span slot="start">&lt;/&gt;</span></app-toolbar-button>
          </app-toolbar>
        </div>
      `,
    },
  ],
};

export default meta;
