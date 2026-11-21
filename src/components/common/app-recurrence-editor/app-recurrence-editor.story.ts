import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import type { RecurrenceEditorChangeDetail } from './app-recurrence-editor';
import './app-recurrence-editor';

function attachLiveOutput(e: CustomEvent<RecurrenceEditorChangeDetail>) {
  const host = (e.currentTarget as HTMLElement).parentElement;
  const output = host?.querySelector('[data-rrule-out]') as HTMLElement | null;
  if (output) {
    output.textContent = e.detail.value || '(empty — one-time)';
  }
}

const meta: ComponentStoryMeta = {
  component: 'app-recurrence-editor',
  title: 'Common/Recurrence Editor (RFC 5545)',
  description:
    'Visual, human-friendly recurrence rule builder covering the full RFC 5545 specification (FREQ, INTERVAL, BYMONTH, BYWEEKNO, BYYEARDAY, BYMONTHDAY, BYDAY with ordinals, BYHOUR, BYMINUTE, BYSETPOS, COUNT, UNTIL, WKST) with two-way RRULE string initialization and canonical serialization.',
  category: 'Common',
  propsDoc: {
    value: 'Initial and current RFC 5545 RRULE string (with or without RRULE: prefix)',
    'start-date': 'Reference DTSTART (YYYY-MM-DDTHH:mm) used for live upcoming dates preview',
    'include-prefix': 'Whether emitted RRULE includes the "RRULE:" prefix (default true)',
    'allow-one-time': 'Allows selecting "Does not repeat" empty rule (default true)',
    compact: 'Reduces vertical spacing for embedding inside modals',
    'hide-rrule-bar': 'Hides raw RRULE string bar while preserving visual editing',
  },
  eventsDoc: {
    change: {
      detail: '{ value: string, rrule: string, rule: Rfc5545Rule | null, isValid: boolean, summary: string }',
      description: 'Fires when the recurrence rule changes',
    },
  },
  stories: [
    {
      name: 'Friday the 13th (Monthly Intersection)',
      description:
        'Initialized with RRULE:FREQ=MONTHLY;BYMONTHDAY=13;BYDAY=FR. Combines calendar day 13 with weekday Friday.',
      render: () => html`
        <div style="max-width: 780px; display: flex; flex-direction: column; gap: 0.75rem;">
          <app-recurrence-editor
            value="RRULE:FREQ=MONTHLY;BYMONTHDAY=13;BYDAY=FR"
            start-date="2026-01-01T13:00"
            @change="${attachLiveOutput}"
          ></app-recurrence-editor>
          <div style="font-size: 0.78rem; color: var(--text-muted, #64748b);">
            Emitted value:
            <code data-rrule-out style="font-family: var(--font-mono, monospace); color: var(--text-primary, #f8fafc); margin-left: 0.35rem;">
              RRULE:FREQ=MONTHLY;BYMONTHDAY=13;BYDAY=FR
            </code>
          </div>
        </div>
      `,
    },
    {
      name: 'Last Business Day of Month',
      description:
        'Initialized with RRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1 — visual business-day + ordinal selector.',
      render: () => html`
        <div style="max-width: 780px; display: flex; flex-direction: column; gap: 0.75rem;">
          <app-recurrence-editor
            compact
            value="RRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1"
            start-date="2026-10-01T17:00"
            @change="${attachLiveOutput}"
          ></app-recurrence-editor>
          <div style="font-size: 0.78rem; color: var(--text-muted, #64748b);">
            Emitted value:
            <code data-rrule-out style="font-family: var(--font-mono, monospace); color: var(--text-primary, #f8fafc); margin-left: 0.35rem;">
              RRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1
            </code>
          </div>
        </div>
      `,
    },
    {
      name: 'Intraday Schedule (Work Hours, Half-Hourly)',
      description:
        'Hourly/Minutely cadence with 24-hour visual grid, minute slots, and business-day filter (include-prefix=false).',
      render: () => html`
        <div style="max-width: 780px; display: flex; flex-direction: column; gap: 0.75rem;">
          <app-recurrence-editor
            compact
            .includePrefix="${false}"
            .allowOneTime="${false}"
            value="FREQ=HOURLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=9,10,11,12,13,14,15,16,17,18;BYMINUTE=0,30"
            start-date="2026-11-16T09:00"
            @change="${attachLiveOutput}"
          ></app-recurrence-editor>
          <div style="font-size: 0.78rem; color: var(--text-muted, #64748b);">
            Emitted value (without RRULE: prefix):
            <code data-rrule-out style="font-family: var(--font-mono, monospace); color: var(--text-primary, #f8fafc); margin-left: 0.35rem;">
              FREQ=HOURLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=9,10,11,12,13,14,15,16,17,18;BYMINUTE=0,30
            </code>
          </div>
        </div>
      `,
    },
    {
      name: 'Yearly 256th Day & Compound Rules',
      description:
        'Annual pattern using BYYEARDAY / BYMONTH / BYWEEKNO and finite COUNT.',
      render: () => html`
        <div style="max-width: 780px; display: flex; flex-direction: column; gap: 0.75rem;">
          <app-recurrence-editor
            compact
            value="RRULE:FREQ=YEARLY;COUNT=5;BYYEARDAY=256"
            start-date="2026-01-01T10:00"
            @change="${attachLiveOutput}"
          ></app-recurrence-editor>
          <div style="font-size: 0.78rem; color: var(--text-muted, #64748b);">
            Emitted value:
            <code data-rrule-out style="font-family: var(--font-mono, monospace); color: var(--text-primary, #f8fafc); margin-left: 0.35rem;">
              RRULE:FREQ=YEARLY;COUNT=5;BYYEARDAY=256
            </code>
          </div>
        </div>
      `,
    },
  ],
};

export default meta;
