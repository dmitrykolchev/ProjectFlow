import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-markdown';

const FULL_DOC = `# Cache Layer Design

## Goals
Reduce read load on PostgreSQL by **70%** via L1/L2 caching.

> Invalidation events must propagate within 50 ms.

- Publish invalidation over \`Redis Pub/Sub\`
- Fallback TTL <= 60 sec
- Align gRPC contracts with Gateway v2.1

## Rollout
1. Instrument hit/miss metrics
2. Deploy L2 cluster
3. Enable singleflight guard

\`\`\`ts
const guard = createSingleflight(key);
\`\`\`
`;

const CHECKLIST_DOC = `## Acceptance checklist

- [x] p99 latency below 120 ms
- [ ] Load test cache stampede
- [ ] **Audit** logging for admin overrides
`;

const EDITABLE_CHECKLIST_DOC = `## Release checklist

- [ ] Publish the changelog
- [x] Freeze the release branch
- [ ] **Tag** the build
`;

/** Story helper: flip the checklist source line reported by checklist-toggle. */
function flipChecklistLine(e: CustomEvent<{ line: number; checked: boolean }>) {
  const el = e.currentTarget as HTMLElement & { content: string };
  const lines = el.content.split('\n');
  const target = lines[e.detail.line];
  if (!target) return;
  lines[e.detail.line] = e.detail.checked
    ? target.replace('- [ ] ', '- [x] ')
    : target.replace(/- \[[xX]\] /, '- [ ] ');
  el.content = lines.join('\n');
}

const TABLE_DOC = `## Rate card

| Role | Rate | Hours |
|---|---|:---:|
| **Lead** | 2400 ₽/h | 160 |
| Senior | 1800 ₽/h | 320 |
| Middle | \`1200 ₽/h\` | 640 |

Totals are aligned right in the third column.
`;

const MATH_DOC = `## Sizing model

Inline math: utilization $\\rho = \\lambda / \\mu$ stays below 1, and the mean
response time is $T = \\frac{1}{\\mu - \\lambda}$ milliseconds.

$$
T = \\frac{1}{\\mu - \\lambda}
$$

Bracket fence form: \\[ \\sum_{i=1}^{n} i = \\frac{n(n+1)}{2} \\]
`;

export const meta: ComponentStoryMeta = {
  title: 'Common/Markdown',
  component: 'app-markdown',
  description:
    'Canonical markdown renderer: headings, paragraphs, quotes, bullet / numbered lists, checklists (display-only), GFM pipe tables, LaTeX math via KaTeX and fenced code blocks with a copy action. Markdown source is passed as the content property.',
  category: 'Common',
  propsDoc: {
    content: 'Markdown source text; empty content renders nothing',
    children: 'Markdown declared directly as light-DOM children (slot capture); the content property wins when both are set',
    editable: 'Checklist checkboxes are interactive and emit checklist-toggle {line, checked} when true',
  },
  stories: [
    {
      name: 'Full Document',
      description: 'Headings, bold and inline code, quote, bullet and numbered lists, fenced ts code block with copy button',
      render: () => html`<app-markdown .content="${FULL_DOC}"></app-markdown>`,
    },
    {
      name: 'Declarative Slot',
      description: 'Markdown declared directly as light-DOM children of the component, captured through the slot',
      render: () => html`<app-markdown>${FULL_DOC}</app-markdown>`,
    },
    {
      name: 'Checklist',
      description: 'Display-only checklist rows with checked / unchecked states',
      render: () => html`<app-markdown .content="${CHECKLIST_DOC}"></app-markdown>`,
    },
    {
      name: 'Editable Checklist',
      description: 'editable property makes the checkboxes interactive; each click emits checklist-toggle {line, checked} and this story flips the matching source line',
      render: () => html`<app-markdown .content="${EDITABLE_CHECKLIST_DOC}" editable @checklist-toggle="${flipChecklistLine}"></app-markdown>`,
    },
    {
      name: 'Table',
      description: 'GFM pipe table with header row, per-column alignment (default left, center via :---:) and inline markup in cells',
      render: () => html`<app-markdown .content="${TABLE_DOC}"></app-markdown>`,
    },
    {
      name: 'Math',
      description: 'KaTeX LaTeX: inline $...$ inside prose, display $$...$$ fence and \\[ ... \\] fence, fonts bundled offline',
      render: () => html`<app-markdown .content="${MATH_DOC}"></app-markdown>`,
    },
    {
      name: 'Plain Paragraphs',
      description: 'Paragraph text with inline **bold** and `code` runs',
      render: () =>
        html`<app-markdown .content="${'The task aligns with the **security baseline**; extract token refresh into a dedicated service and add `401` retry integration tests.'}"></app-markdown>`,
    },
    {
      name: 'Empty Content',
      description: 'No content renders nothing',
      render: () => html`<app-markdown .content="${''}"></app-markdown>`,
    },
  ],
};

export default meta;
