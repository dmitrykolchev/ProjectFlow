import { TemplateResult } from 'lit';

export interface Story {
  name: string;
  description?: string;
  render: () => TemplateResult;
}

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
}
