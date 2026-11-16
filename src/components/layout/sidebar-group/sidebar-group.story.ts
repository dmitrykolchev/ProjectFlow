import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './sidebar-group';
import '../sidebar-item/sidebar-item';
import {
  iconAnalytics,
  iconCalendar,
  iconDashboard,
  iconGantt,
  iconKanban,
  iconSettings,
  iconTable,
} from '../../common/icons';

export const meta: ComponentStoryMeta = {
  title: 'Layout/SidebarGroup',
  component: 'sidebar-group',
  description:
    'Collapsible navigation group container for <app-sidebar> supporting smooth CSS collapse animations and active-route indicator. The default slot accepts sidebar-item children.',
  category: 'Layout',
  slotsDoc: {
    '(default)': 'Sidebar items of the group',
  },
  childrenDoc: {
    'sidebar-item': 'Navigation item with icon, badge, and active state rendered inside the group',
  },
  propsDoc: {
    groupId: 'Stable group id used by the sidebar controller',
    label: 'Group caption',
    expanded: 'Group is expanded (items visible)',
    collapsed: 'Sidebar is in icon-only mode',
    hasActive: 'Group contains the active item',
  },
  stories: [
    {
      name: 'Expanded & Collapsed Groups',
      description: 'Interactive standalone collapsible groups with active route dot indicator when collapsed',
      render: () => html`
        <div style="width: 248px; display: flex; flex-direction: column; gap: 0.25rem; background: var(--bg-surface, #111827); padding: 0.75rem; border-radius: var(--radius-md, 8px); border: 1px solid var(--border-subtle, #1e293b);">
          <sidebar-group group-id="workspace" label="Рабочая область" expanded has-active>
            <sidebar-item value="dashboard" label="Дашборд" active .icon="${iconDashboard()}"></sidebar-item>
            <sidebar-item value="kanban" label="Канбан-доска" badge="14" .icon="${iconKanban()}"></sidebar-item>
            <sidebar-item value="gantt" label="Диаграмма Ганта" .icon="${iconGantt()}"></sidebar-item>
          </sidebar-group>

          <sidebar-group group-id="views" label="Данные и аналитика" .expanded="${false}" has-active>
            <sidebar-item value="grid" label="Таблица задач" active .icon="${iconTable()}"></sidebar-item>
            <sidebar-item value="calendar" label="Календарь" .icon="${iconCalendar()}"></sidebar-item>
            <sidebar-item value="analytics" label="Аналитика" .icon="${iconAnalytics()}"></sidebar-item>
          </sidebar-group>

          <sidebar-group group-id="system" label="Система" expanded>
            <sidebar-item value="settings" label="Кастомизация" .icon="${iconSettings()}"></sidebar-item>
          </sidebar-group>
        </div>
      `,
    },
  ],
};

export default meta;
