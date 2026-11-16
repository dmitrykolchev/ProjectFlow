import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-material-icon';

export const meta: ComponentStoryMeta = {
  title: 'Common/Material Icon',
  component: 'app-material-icon',
  description:
    'Material Symbols ligature icon (self-hosted variable font) with Google axes fill/weight/grade, family style, app size scale, and status color variants.',
  category: 'Common',
  stories: [
    {
      name: 'Size Scale',
      description: 'Canonical icon scale xxs|xs|sm|md|lg|xl|xxl (12/14/16/20/24/28/36px), shared with SVG icons',
      render: () => html`
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <app-material-icon size="xxs">star</app-material-icon>
          <app-material-icon size="xs">star</app-material-icon>
          <app-material-icon size="sm">star</app-material-icon>
          <app-material-icon size="md">star</app-material-icon>
          <app-material-icon size="lg">star</app-material-icon>
          <app-material-icon size="xl">star</app-material-icon>
          <app-material-icon size="xxl">star</app-material-icon>
        </div>
      `,
    },
    {
      name: 'Numeric Size',
      description: 'size also accepts a plain number = nominal box in px, the same unit as SVG icons (ink parity at equal px)',
      render: () => html`
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <app-material-icon size="14">star</app-material-icon>
          <app-material-icon size="18">star</app-material-icon>
          <app-material-icon size="24">star</app-material-icon>
          <app-material-icon size="32">star</app-material-icon>
        </div>
      `,
    },
    {
      name: 'Status Variants',
      description: 'Icon color from status tokens; neutral inherits currentColor',
      render: () => html`
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <app-material-icon variant="neutral">home</app-material-icon>
          <app-material-icon variant="primary">bolt</app-material-icon>
          <app-material-icon variant="info">info</app-material-icon>
          <app-material-icon variant="success">check_circle</app-material-icon>
          <app-material-icon variant="warning">warning</app-material-icon>
          <app-material-icon variant="danger">delete</app-material-icon>
        </div>
      `,
    },
    {
      name: 'Families & Axes',
      description: 'Family style (Outlined/Rounded/Sharp) and Google axes fill, weight, grade',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
            <app-material-icon family="outlined">favorite</app-material-icon>
            <app-material-icon family="rounded">favorite</app-material-icon>
            <app-material-icon family="sharp">favorite</app-material-icon>
          </div>
          <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
            <app-material-icon fill="1">favorite</app-material-icon>
            <app-material-icon weight="700">favorite</app-material-icon>
            <app-material-icon weight="200">favorite</app-material-icon>
            <app-material-icon grade="200">favorite</app-material-icon>
            <app-material-icon grade="-50">favorite</app-material-icon>
          </div>
        </div>
      `,
    },
  ],
};

export default meta;
