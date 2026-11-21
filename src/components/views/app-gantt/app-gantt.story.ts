import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import { generateLargeGanttSchedule } from './app-gantt';
import './app-gantt';

const largeScheduleTasks = generateLargeGanttSchedule(2000);

export const meta: ComponentStoryMeta = {
  title: 'Views/GanttChart',
  component: 'app-gantt',
  description: '2D virtualized timeline Gantt chart supporting thousands of tasks and multi-year schedules.',
  category: 'Views',
  propsDoc: {
    virtual: '2D windowing (vertical rows + horizontal days) — only visible tasks and day columns render; default true',
    tasksData: 'Task objects rendered on the timeline (property binding, array); empty renders the empty state',
    datasetMode: "Built-in dataset to display (attribute dataset-mode): project (the working project schedule) or large (2,000-task multi-year stress dataset)",
  },
  stories: [
    {
      name: 'Interactive Timeline',
      description: 'Gantt schedule chart with project / large dataset switch and day/week/month scales',
      render: () => html`
        <div style="height: 550px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-gantt></app-gantt>
        </div>
      `,
    },
    {
      name: '2D Virtualized (2,000 tasks · 3 years)',
      description: 'Vertical and horizontal windowing across 2,000 tasks and 1,090+ days',
      render: () => html`
        <div style="height: 550px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-gantt .tasksData="${largeScheduleTasks}" virtual></app-gantt>
        </div>
      `,
    },
  ],
};

export default meta;
