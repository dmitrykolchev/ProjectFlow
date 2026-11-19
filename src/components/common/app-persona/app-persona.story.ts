import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-persona';

export const meta: ComponentStoryMeta = {
  title: 'Common/Persona',
  component: 'app-persona',
  description:
    'Person representation: avatar (photo or initials on a colored tile), name, secondary/tertiary lines and a presence badge in seven sizes.',
  category: 'Common',
  propsDoc: {
    size: 'Avatar diameter preset (24/32/40/48/56/72/100, default 48)',
    image: 'Photo URL; falls back to initials when empty',
    initials: 'Initials; derived from primaryText when not set',
    primaryText: 'Name or identification',
    secondaryText: 'Job title / status line under the name (when presence-text is off)',
    tertiaryText: 'Extra line, e.g. "In a meeting" (sizes 56+)',
    presence: 'Presence badge status (none/online/available/away/busy/dnd/blocked/offline)',
    presenceText: 'Show the presence label as the secondary line under the name — recommended for sizes ≤ 32',
    showOverflowTooltip: 'Native tooltip with the full text on truncated lines (default true)',
    color: 'Background of the initials tile',
    ariaLabel: 'Accessible name override',
  },
  stories: [
    {
      name: 'Sizes',
      description:
        '24 / 32 / 40 / 48 (default) / 56 / 72 / 100 — presence badge grows with the avatar',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <app-persona size="24" initials="AL" presence="available" .primaryText="${'Annie Lindqvist'}"></app-persona>
          <app-persona size="32" initials="AL" presence="available" .primaryText="${'Annie Lindqvist'}"></app-persona>
          <app-persona size="40" initials="AL" presence="away" .primaryText="${'Annie Lindqvist'}" .secondaryText="${'Software Engineer'}"></app-persona>
          <app-persona size="48" initials="AL" presence="busy" .primaryText="${'Annie Lindqvist'}" .secondaryText="${'Software Engineer'}"></app-persona>
          <app-persona size="56" initials="AL" presence="available" .primaryText="${'Annie Lindqvist'}" .secondaryText="${'Software Engineer'}"></app-persona>
          <app-persona size="72" initials="AL" presence="blocked" .primaryText="${'Annie Lindqvist'}" .secondaryText="${'Software Engineer'}" .tertiaryText="${'In a meeting'}"></app-persona>
          <app-persona size="100" initials="AL" presence="offline" .primaryText="${'Annie Lindqvist'}" .secondaryText="${'Software Engineer'}" .tertiaryText="${'Available at 4:00pm'}"></app-persona>
        </div>
      `,
    },
    {
      name: 'Presence Variants',
      description:
        'Badge colors follow the status tokens; the glyph changes with the state',
      render: () => html`
        <div style="display: flex; flex-wrap: wrap; gap: 1.25rem;">
          <app-persona size="48" initials="KS" presence="online" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'Available'}"></app-persona>
          <app-persona size="48" initials="KS" presence="available" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'Software Engineer'}"></app-persona>
          <app-persona size="48" initials="KS" presence="away" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'Microsoft'}"></app-persona>
          <app-persona size="48" initials="KS" presence="busy" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'In a meeting'}"></app-persona>
          <app-persona size="48" initials="KS" presence="dnd" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'Do not disturb'}"></app-persona>
          <app-persona size="48" initials="KS" presence="blocked" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'Blocked'}"></app-persona>
          <app-persona size="48" initials="KS" presence="offline" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'Offline'}"></app-persona>
        </div>
      `,
    },
    {
      name: 'Small Personas With Text Alternative',
      description:
        'At sizes 24 and 32 the badge is a colour-only dot, so presence-text puts the status under the name',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <app-persona size="24" initials="AL" presence="available" presence-text .primaryText="${'Annie Lindqvist'}"></app-persona>
          <app-persona size="32" initials="AL" presence="busy" presence-text .primaryText="${'Annie Lindqvist'}"></app-persona>
          <app-persona size="24" initials="KS" presence="away" presence-text .primaryText="${'Kevin Sturgis'}"></app-persona>
        </div>
      `,
    },
    {
      name: 'Truncation and Tooltip',
      description:
        'Long lines truncate; show-overflow-tooltip=false suppresses the tooltip for dropdown use',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <app-persona size="48" initials="ES" presence="away" .primaryText="${'Elena Smirnova'}" .secondaryText="${'Head of Platform Engineering — Core Platform 3.0'}" style="max-width: 220px;"></app-persona>
          <app-persona
            size="48"
            initials="ES"
            presence="busy"
            .showOverflowTooltip="${false}"
            .primaryText="${'Elena Smirnova'}"
            .secondaryText="${'Head of Platform Engineering — Core Platform 3.0'}"
            style="max-width: 220px;"
          ></app-persona>
        </div>
      `,
    },
  ],
};

export default meta;
