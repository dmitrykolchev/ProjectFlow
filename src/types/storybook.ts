import { TemplateResult } from 'lit';

export interface Story {
  name: string;
  description?: string;
  render: () => TemplateResult;
}

/** Per-property English descriptions for the API spec table (developer documentation). */
export type PropsDoc = Record<string, string>;

export interface ComponentStoryMeta {
  title: string;
  component: string;
  description: string;
  category:
    | 'Elements'
    | 'Inputs'
    | 'Common'
    | 'Dashboard'
    | 'Layout'
    | 'Views'
    | 'Overlays'
    | 'Feedback';
  stories: Story[];
  propsDoc?: PropsDoc;
}
