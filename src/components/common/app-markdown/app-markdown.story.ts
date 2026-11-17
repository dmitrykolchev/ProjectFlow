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

export const meta: ComponentStoryMeta = {
  title: 'Common/Markdown',
  component: 'app-markdown',
  description:
    'Canonical markdown renderer: headings, paragraphs, quotes, bullet / numbered lists, checklists (display-only) and fenced code blocks with a copy action. Markdown source is passed as the content property.',
  category: 'Common',
  propsDoc: {
    content: 'Markdown source text; empty content renders nothing',
  },
  stories: [
    {
      name: 'Full Document',
      description: 'Headings, bold and inline code, quote, bullet and numbered lists, fenced ts code block with copy button',
      render: () => html`<app-markdown .content="${FULL_DOC}"></app-markdown>`,
    },
    {
      name: 'Checklist',
      description: 'Display-only checklist rows with checked / unchecked states',
      render: () => html`<app-markdown .content="${CHECKLIST_DOC}"></app-markdown>`,
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
