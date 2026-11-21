import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-sidebar';
import '../app-sidebar-group/app-sidebar-group';
import '../app-sidebar-item/app-sidebar-item';
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
  description: 'Collapsible navigation sidebar composed declaratively with <app-sidebar-group> and <app-sidebar-item> elements, supporting single (accordion) and multiple group expansion modes.',
  category: 'Layout',
  childrenDoc: {
    'app-sidebar-group': 'Collapsible navigation group container composing the sidebar menu',
    'app-sidebar-item': 'Navigation item with icon, badge, and active state (inside an app-sidebar-group)',
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
            <app-sidebar-group group-id="workspace" label="Рабочая область" expanded>
              <app-sidebar-item value="dashboard" label="Дашборд" .icon="${iconDashboard()}"></app-sidebar-item>
              <app-sidebar-item value="kanban" label="Канбан-доска" badge="12" .icon="${iconKanban()}"></app-sidebar-item>
              <app-sidebar-item value="gantt" label="Диаграмма Ганта" .icon="${iconGantt()}"></app-sidebar-item>
            </app-sidebar-group>

            <app-sidebar-group group-id="views" label="Данные и аналитика" expanded>
              <app-sidebar-item value="grid" label="Таблица задач" .icon="${iconTable()}"></app-sidebar-item>
              <app-sidebar-item value="calendar" label="Календарь" .icon="${iconCalendar()}"></app-sidebar-item>
              <app-sidebar-item value="analytics" label="Аналитика" .icon="${iconAnalytics()}"></app-sidebar-item>
            </app-sidebar-group>

            <app-sidebar-group group-id="system" label="Система" .expanded="${false}">
              <app-sidebar-item value="activity" label="Активность" .icon="${iconActivity()}"></app-sidebar-item>
              <app-sidebar-item value="settings" label="Настройки" .icon="${iconSettings()}"></app-sidebar-item>
            </app-sidebar-group>
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
            <app-sidebar-group group-id="workspace" label="Рабочая область" .expanded="${false}">
              <app-sidebar-item value="dashboard" label="Дашборд" .icon="${iconDashboard()}"></app-sidebar-item>
              <app-sidebar-item value="kanban" label="Канбан-доска" badge="12" .icon="${iconKanban()}"></app-sidebar-item>
            </app-sidebar-group>

            <app-sidebar-group group-id="views" label="Данные и аналитика" expanded>
              <app-sidebar-item value="grid" label="Таблица задач" .icon="${iconTable()}"></app-sidebar-item>
              <app-sidebar-item value="calendar" label="Календарь" .icon="${iconCalendar()}"></app-sidebar-item>
            </app-sidebar-group>

            <app-sidebar-group group-id="system" label="Система" .expanded="${false}">
              <app-sidebar-item value="settings" label="Настройки" .icon="${iconSettings()}"></app-sidebar-item>
            </app-sidebar-group>
          </app-sidebar>
        </div>
      `,
    },
  ],
};

export default meta;
