import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-sidebar';
import '../sidebar-group/sidebar-group';
import '../sidebar-item/sidebar-item';
import {
  iconActivity,
  iconAnalytics,
  iconCalendar,
  iconDashboard,
  iconGantt,
  iconKanban,
  iconSettings,
  iconTable,
} from '../../common/icons';

export const meta: ComponentStoryMeta = {
  title: 'Layout/Sidebar',
  component: 'app-sidebar',
  description: 'Collapsible navigation sidebar composed declaratively with <sidebar-group> and <sidebar-item> elements, supporting single (accordion) and multiple group expansion modes.',
  category: 'Layout',
  childrenDoc: {
    'sidebar-group': 'Collapsible navigation group container composing the sidebar menu',
    'sidebar-item': 'Navigation item with icon, badge, and active state (inside a sidebar-group)',
  },
  propsDoc: {
    collapsed: 'Icon-only sidebar width',
    activeValue: 'Value of the currently active item',
    groupMode: 'Group behavior: single (accordion) / multiple',
    standalone: 'Rendered outside app-root (manages its own state)',
    theme: 'Current theme for icon accents',
    currentLang: 'UI language',
    selectedProjectId: 'Project filter selection shown in the projects group',
  },
  stories: [
    {
      name: 'Multiple Groups Mode',
      description: 'Multiple collapsible groups can stay open simultaneously; mode can also be switched directly via the sidebar toggle.',
      render: () => html`
        <div style="height: 540px; display: flex; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-sidebar standalone group-mode="multiple" activeValue="dashboard">
            <sidebar-group group-id="workspace" label="Рабочая область" expanded>
              <sidebar-item value="dashboard" label="Дашборд" .icon="${iconDashboard()}"></sidebar-item>
              <sidebar-item value="kanban" label="Канбан-доска" badge="12" .icon="${iconKanban()}"></sidebar-item>
              <sidebar-item value="gantt" label="Диаграмма Ганта" .icon="${iconGantt()}"></sidebar-item>
            </sidebar-group>

            <sidebar-group group-id="views" label="Данные и аналитика" expanded>
              <sidebar-item value="grid" label="Таблица задач" .icon="${iconTable()}"></sidebar-item>
              <sidebar-item value="calendar" label="Календарь" .icon="${iconCalendar()}"></sidebar-item>
              <sidebar-item value="analytics" label="Аналитика" .icon="${iconAnalytics()}"></sidebar-item>
            </sidebar-group>

            <sidebar-group group-id="system" label="Система" .expanded="${false}">
              <sidebar-item value="activity" label="Активность" .icon="${iconActivity()}"></sidebar-item>
              <sidebar-item value="settings" label="Настройки" .icon="${iconSettings()}"></sidebar-item>
            </sidebar-group>
          </app-sidebar>
        </div>
      `,
    },
    {
      name: 'Single Group Mode (Accordion)',
      description: 'Expanding one group automatically collapses all other groups.',
      render: () => html`
        <div style="height: 540px; display: flex; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-sidebar standalone group-mode="single" activeValue="grid">
            <sidebar-group group-id="workspace" label="Рабочая область" .expanded="${false}">
              <sidebar-item value="dashboard" label="Дашборд" .icon="${iconDashboard()}"></sidebar-item>
              <sidebar-item value="kanban" label="Канбан-доска" badge="12" .icon="${iconKanban()}"></sidebar-item>
            </sidebar-group>

            <sidebar-group group-id="views" label="Данные и аналитика" expanded>
              <sidebar-item value="grid" label="Таблица задач" .icon="${iconTable()}"></sidebar-item>
              <sidebar-item value="calendar" label="Календарь" .icon="${iconCalendar()}"></sidebar-item>
            </sidebar-group>

            <sidebar-group group-id="system" label="Система" .expanded="${false}">
              <sidebar-item value="settings" label="Настройки" .icon="${iconSettings()}"></sidebar-item>
            </sidebar-group>
          </app-sidebar>
        </div>
      `,
    },
  ],
};

export default meta;
