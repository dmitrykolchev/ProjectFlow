import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-confirm-dialog';

export const meta: ComponentStoryMeta = {
  title: 'Common/Confirm Dialog',
  component: 'app-confirm-dialog',
  description:
    'Delete-confirmation modal built on app-modal: title, message, cancel/confirm buttons; events confirm and cancel.',
  category: 'Common',
  stories: [
    {
      name: 'Danger Confirm',
      description: 'Standard delete confirmation',
      render: () => html`
        <app-confirm-dialog
          open
          title="Удалить проект?"
          message="Вы уверены, что хотите удалить проект «Core Platform 3.0»?"
          .cancelLabel="${'Отмена'}"
          .confirmLabel="${'Удалить'}"
        ></app-confirm-dialog>
      `,
    },
    {
      name: 'Neutral Confirm',
      description: 'Non-danger action (danger=false uses primary button)',
      render: () => html`
        <app-confirm-dialog
          open
          title="Отправить калькуляцию?"
          message="Калькуляция будет отправлена на согласование заказчику."
          .cancelLabel="${'Cancel'}"
          .confirmLabel="${'Send'}"
          .danger="${false}"
        ></app-confirm-dialog>
      `,
    },
  ],
};

export default meta;
