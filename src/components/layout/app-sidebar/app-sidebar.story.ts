import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-sidebar';
import '../sidebar-item/sidebar-item';
import { iconDashboard, iconKanban, iconTable, iconCalendar, iconSettings } from '../../common/icons';

export const meta: ComponentStoryMeta = {
  title: 'Layout/Sidebar',
  component: 'app-sidebar',
  description: 'Collapsible navigation sidebar composed declaratively using <sidebar-item> child elements.',
  category: 'Layout',
  stories: [
    {
      name: 'Declarative Sidebar Composition',
      description: 'Sidebar populated declaratively with <sidebar-item> nodes',
      render: () => html`
        <div style="height: 520px; display: flex; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-sidebar activeValue="dashboard">
            <div class="nav-section-title">Проекты</div>
            <sidebar-item value="dashboard" label="Дашборд" .icon="${iconDashboard()}"></sidebar-item>
            <sidebar-item value="kanban" label="Канбан-доска" badge="12" .icon="${iconKanban()}"></sidebar-item>
            <sidebar-item value="grid" label="Таблица задач" .icon="${iconTable()}"></sidebar-item>
            <sidebar-item value="calendar" label="Календарь" .icon="${iconCalendar()}"></sidebar-item>
            <div class="nav-section-title" style="margin-top: 0.75rem;">Система</div>
            <sidebar-item value="settings" label="Кастомизация" .icon="${iconSettings()}"></sidebar-item>
          </app-sidebar>
        </div>
      `,
    },
  ],
};

export default meta;
