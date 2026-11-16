import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-requirement-detail';

const meta: ComponentStoryMeta = {
  title: 'Views/Requirement Detail',
  component: 'app-requirement-detail',
  category: 'Views',
  description:
    'Страница детальной работы с отдельным требованием: редактирование критериев приёмки, трассировка к спецификации и базе знаний, покрытие задачами, AI-декомпозиция и совместное уточнение с AI.',
  stories: [
    {
      name: 'Single Requirement Workspace',
      description: 'Детальное представление одного требования со всеми связями и совместным разбором с AI.',
      render: () => html`
        <div style="height: 680px; display: flex; flex-direction: column; border: 1px solid var(--border-subtle, #334155); border-radius: var(--radius-lg, 12px); overflow: hidden;">
          <app-requirement-detail></app-requirement-detail>
        </div>
      `,
    },
  ],
};

export default meta;
