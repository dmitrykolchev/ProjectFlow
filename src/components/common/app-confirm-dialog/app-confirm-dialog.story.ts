import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-confirm-dialog';

export const meta: ComponentStoryMeta = {
  title: 'Common/Confirm Dialog',
  component: 'app-confirm-dialog',
  description:
    'Confirmation modal built on app-modal: header icon + title, "выполняемое действие" and "ожидаемый результат" sections, cancel/confirm buttons. Variants: info, success, warning, danger; events confirm and cancel.',
  category: 'Common',
  propsDoc: {
    open: 'Opens the dialog',
    title: 'Header caption',
    variant: 'Semantic color: info / success / warning / danger',
    icon: 'Header icon name',
    action: 'Text of the "action being performed" section',
    result: 'Text of the "expected result" box',
    message: 'Legacy single-body message (used when action/result are empty)',
    actionLabel: 'Caption of the action section header',
    resultLabel: 'Caption of the result section header',
    confirmLabel: 'Caption of the confirm button',
    cancelLabel: 'Caption of the cancel button',
    size: 'Dialog width preset',
  },
  eventsDoc: {
    confirm: { detail: '—', description: 'Fires when the primary (confirm) button is pressed' },
    cancel: { detail: '—', description: 'Fires when the dialog is dismissed' },
  },
  stories: [
    {
      name: 'Danger Confirm',
      description: 'Gateway shutdown confirmation (danger variant, red confirm button)',
      render: () => html`
        <app-confirm-dialog
          open
          title="Отключение шлюза"
          variant="danger"
          action="Шлюз «Directum СЭД — routes of contracts» будет отключен; очередь (2) замрёт до повторного включения."
          result="Событие фиксируется в журнале шлюза и Журнале аудита холдинга."
          .actionLabel="${'Выполняемое действие:'}"
          .resultLabel="${'Ожидаемый результат:'}"
          .cancelLabel="${'Отмена'}"
          .confirmLabel="${'Отключить шлюз'}"
        ></app-confirm-dialog>
      `,
    },
    {
      name: 'Warning Confirm',
      description: 'warning variant (primary confirm button)',
      render: () => html`
        <app-confirm-dialog
          open
          title="Перезапуск шлюза"
          variant="warning"
          action="Шлюз будет перезапущен; обработка очереди прервётся на несколько секунд."
          result="Незавершённые сообщения будут обработаны после восстановления."
          .actionLabel="${'Выполняемое действие:'}"
          .resultLabel="${'Ожидаемый результат:'}"
          .cancelLabel="${'Отмена'}"
          .confirmLabel="${'Перезапустить'}"
        ></app-confirm-dialog>
      `,
    },
    {
      name: 'Info Confirm',
      description: 'info variant with circle icon',
      render: () => html`
        <app-confirm-dialog
          open
          title="Отправить калькуляцию?"
          variant="info"
          action="Калькуляция №7 будет отправлена на согласование заказчику."
          result="Статус изменится на «Отправлено», редактирование станет недоступным."
          .actionLabel="${'Выполняемое действие:'}"
          .resultLabel="${'Ожидаемый результат:'}"
          .cancelLabel="${'Cancel'}"
          .confirmLabel="${'Send'}"
        ></app-confirm-dialog>
      `,
    },
    {
      name: 'Legacy Message',
      description: 'Single-paragraph message when action/result are not provided',
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
  ],
};

export default meta;
