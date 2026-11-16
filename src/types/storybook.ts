import { TemplateResult } from 'lit';

export interface Story {
  name: string;
  description?: string;
  render: () => TemplateResult;
}

/** Per-property English descriptions for the API spec table (developer documentation). */
export type PropsDoc = Record<string, string>;

/** Per-slot English descriptions keyed by slot name ("(default)" for the unnamed slot). */
export type SlotsDoc = Record<string, string>;

/** Child components usable inside the component, keyed by tag name with an English description. */
export type ChildrenDoc = Record<string, string>;

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
  slotsDoc?: SlotsDoc;
  childrenDoc?: ChildrenDoc;
}
