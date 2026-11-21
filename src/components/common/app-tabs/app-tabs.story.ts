import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-tabs';
import '../app-tab-item/app-tab-item';
import { iconLayers, iconFileText, iconUsers } from '../icons';

export const meta: ComponentStoryMeta = {
  title: 'Common/Tabs',
  component: 'app-tabs',
  description:
    'Tab strip container for app-tab-item children. The active property owns the selection: clicking a tab emits tab-change and moves the active state; setting active from code syncs the items. Arrow keys move between enabled tabs. The size publishes the canonical control scale, so tabs share the toolbar row geometry.',
  category: 'Common',
  propsDoc: {
    size: 'Canonical control scale of the strip: xs / sm / md / lg; published to children as inherited tokens',
    active: 'Value of the selected app-tab-item',
  },
  slotsDoc: {
    '(default)': 'Tab items — app-tab-item children rendered in the strip',
  },
  childrenDoc: {
    'app-tab-item': 'A single tab in the strip',
  },
  eventsDoc: {
    'tab-change': {
      detail: '{ value: string }',
      description: 'Fires when the selected tab changes',
    },
  },
  stories: [
    {
      name: 'Tab Strip',
      description: 'Icon tabs with an active, a disabled and a plain text tab',
      render: () => html`
        <app-tabs size="md" active="overview">
          <app-tab-item value="overview">
            <span slot="start">${iconLayers(16)}</span>
            <span>Обзор</span>
          </app-tab-item>
          <app-tab-item value="docs">
            <span slot="start">${iconFileText(16)}</span>
            <span>Документы</span>
          </app-tab-item>
          <app-tab-item value="team">
            <span slot="start">${iconUsers(16)}</span>
            <span>Команда</span>
          </app-tab-item>
          <app-tab-item value="settings" disabled>
            <span>Настройки</span>
          </app-tab-item>
        </app-tabs>
      `,
    },
    {
      name: 'Control Scale',
      description: 'The same strip at sm, md and lg — tabs share the toolbar control scale',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <app-tabs size="sm" active="a">
            <app-tab-item value="a"><span>Вкладка A</span></app-tab-item>
            <app-tab-item value="b"><span>Вкладка B</span></app-tab-item>
            <app-tab-item value="c"><span>Вкладка C</span></app-tab-item>
          </app-tabs>
          <app-tabs size="md" active="a">
            <app-tab-item value="a"><span>Вкладка A</span></app-tab-item>
            <app-tab-item value="b"><span>Вкладка B</span></app-tab-item>
            <app-tab-item value="c"><span>Вкладка C</span></app-tab-item>
          </app-tabs>
          <app-tabs size="lg" active="a">
            <app-tab-item value="a"><span>Вкладка A</span></app-tab-item>
            <app-tab-item value="b"><span>Вкладка B</span></app-tab-item>
            <app-tab-item value="c"><span>Вкладка C</span></app-tab-item>
          </app-tabs>
        </div>
      `,
    },
  ],
};

export default meta;
