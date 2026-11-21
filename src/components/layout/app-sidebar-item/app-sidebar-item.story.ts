import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-sidebar-item';
import { iconDashboard, iconKanban, iconTable, iconSettings } from '../../common/icons';

export const meta: ComponentStoryMeta = {
  title: 'Layout/SidebarItem',
  component: 'app-sidebar-item',
  description:
    'Declarative navigation item component used to compose <app-sidebar> menus with icons, badges, and collapsed mode. Canonical start / default / end slots carry leading graphics, label markup, and trailing content; icon is a legacy alias of start.',
  category: 'Layout',
  slotsDoc: {
    start: 'Content rendered before the label (text, SVG icon, material icon) — centered vertically',
    '(default)': 'Item label markup (overrides the label property)',
    end: 'Content rendered after the label (text, SVG icon, material icon) — centered vertically',
    icon: 'Legacy alias of start',
  },
  childrenDoc: {
    'app-material-icon': 'Icon rendered in the start / end slot before or after the item label',
  },
  propsDoc: {
    value: 'View id emitted when the item is clicked',
    label: 'Item caption',
    badge: 'Count badge on the right side',
    active: 'Item is the current view',
    collapsed: 'Sidebar is in icon-only mode',
    disabled: 'Item is not clickable',
    icon: 'Leading icon (SVG template)',
  },
  stories: [
    {
      name: 'States & Badges',
      description: 'Active, default, badge, and collapsed sidebar items',
      render: () => html`
        <div style="width: 240px; display: flex; flex-direction: column; gap: 0.35rem; background: var(--bg-surface, #111827); padding: 0.75rem; border-radius: var(--radius-md, 8px); border: 1px solid var(--border-subtle, #1e293b);">
          <app-sidebar-item value="dashboard" label="Дашборд" active .icon="${iconDashboard()}"></app-sidebar-item>
          <app-sidebar-item value="kanban" label="Канбан-доска" badge="14" .icon="${iconKanban()}"></app-sidebar-item>
          <app-sidebar-item value="grid" label="Таблица задач" .icon="${iconTable()}"></app-sidebar-item>
          <app-sidebar-item value="settings" label="Настройки" disabled .icon="${iconSettings()}"></app-sidebar-item>
        </div>
      `,
    },
  ],
};

export default meta;
