import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-persona';

export const meta: ComponentStoryMeta = {
  title: 'Common/Persona',
  component: 'app-persona',
  description:
    'Person representation: avatar (photo or initials on a colored tile), name, position/role line and a presence badge in seven sizes. The status is graphic only — its words live in the tooltip and the accessible name.',
  category: 'Common',
  propsDoc: {
    size: 'Avatar diameter preset (24/32/40/48/56/72/100, default 48)',
    image: 'Photo URL; falls back to initials when empty',
    initials: 'Initials; derived from primaryText when not set (Cyrillic names included)',
    primaryText: 'Name or identification',
    secondaryText: 'Position / project role under the name',
    tertiaryText: 'Extra line, e.g. "In a meeting" (sizes 56+)',
    presence: 'Presence badge status (none/online/available/away/busy/dnd/blocked/offline); words go to the tooltip and accessible name, never to visible text',
    showOverflowTooltip: 'Native tooltip with the full text on truncated lines (default true)',
    color: 'Background of the initials tile',
    ariaLabel: 'Accessible name override',
    interactive: 'Renders the persona as a focusable ghost button (default true) so consumers bind @click / persona-click on the host; false renders plain markup',
    personaDisabled: "Dims the persona and disables its button (attribute persona-disabled); the persona-click event is not dispatched",
  },
  stories: [
    {
      name: 'Sizes',
      description:
        '24 / 32 / 40 / 48 (default) / 56 / 72 / 100 — the badge sits in the bottom-right corner of the avatar square and grows with it; hover a persona to read "name — status"',
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
        'Badge colors follow the status tokens; the glyph changes with the state. The secondary line carries the position, not the status',
      render: () => html`
        <div style="display: flex; flex-wrap: wrap; gap: 1.25rem;">
          <app-persona size="48" initials="KS" presence="online" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'Product Designer'}"></app-persona>
          <app-persona size="48" initials="KS" presence="available" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'Software Engineer'}"></app-persona>
          <app-persona size="48" initials="KS" presence="away" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'Lead Architect'}"></app-persona>
          <app-persona size="48" initials="KS" presence="busy" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'DevOps & SRE Lead'}"></app-persona>
          <app-persona size="48" initials="KS" presence="dnd" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'Senior Project Manager'}"></app-persona>
          <app-persona size="48" initials="KS" presence="blocked" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'QA & Security Specialist'}"></app-persona>
          <app-persona size="48" initials="KS" presence="offline" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'Lead Data Analyst'}"></app-persona>
        </div>
      `,
    },
    {
      name: 'Small Personas',
      description:
        'At sizes 24 and 32 the badge is a colour-only dot; hover the dot or the name to read the status in the tooltip',
      render: () => html`
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <app-persona size="24" initials="AL" presence="available" .primaryText="${'Annie Lindqvist'}"></app-persona>
          <app-persona size="32" initials="AL" presence="busy" .primaryText="${'Annie Lindqvist'}"></app-persona>
          <app-persona size="24" initials="KS" presence="away" .primaryText="${'Kevin Sturgis'}" .secondaryText="${'Lead Architect'}"></app-persona>
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
