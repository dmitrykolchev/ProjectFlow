import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './sidebar-item';
import { iconDashboard, iconKanban, iconTable, iconSettings } from '../../common/icons';

export const meta: ComponentStoryMeta = {
  title: 'Layout/SidebarItem',
  component: 'sidebar-item',
  description: 'Declarative navigation item component used to compose <app-sidebar> menus with icons, badges, and collapsed mode.',
  category: 'Layout',
  stories: [
    {
      name: 'States & Badges',
      description: 'Active, default, badge, and collapsed sidebar items',
      render: () => html`
        <div style="width: 240px; display: flex; flex-direction: column; gap: 0.35rem; background: var(--bg-surface, #111827); padding: 0.75rem; border-radius: var(--radius-md, 8px); border: 1px solid var(--border-subtle, #1e293b);">
          <sidebar-item value="dashboard" label="Дашборд" active .icon="${iconDashboard()}"></sidebar-item>
          <sidebar-item value="kanban" label="Канбан-доска" badge="14" .icon="${iconKanban()}"></sidebar-item>
          <sidebar-item value="grid" label="Таблица задач" .icon="${iconTable()}"></sidebar-item>
          <sidebar-item value="settings" label="Кастомизация" disabled .icon="${iconSettings()}"></sidebar-item>
        </div>
      `,
    },
  ],
};

export default meta;
