import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-file-dropzone';

export const meta: ComponentStoryMeta = {
  title: 'Common/File Dropzone',
  component: 'app-file-dropzone',
  category: 'Common',
  description:
    'Интерактивная область загрузки файлов (drag & drop + системный выбор файла) с отображением выбранного файла, его размера и кнопкой очистки.',
  stories: [
    {
      name: 'Default Dropzone',
      description: 'Стандартная область загрузки файлов для модальных окон и форм.',
      render: () => html`<app-file-dropzone></app-file-dropzone>`,
    },
    {
      name: 'Selected File State',
      description: 'Состояние после выбора файла с отображением имени, размера и кнопки сброса.',
      render: () => html`
        <app-file-dropzone
          selected-file-name="Architecture_Specification_v3.pdf"
          selected-file-size="482900"
        ></app-file-dropzone>
      `,
    },
    {
      name: 'Compact Inline Mode',
      description: 'Компактная строка для встраивания в панели быстрого обновления версий.',
      render: () => html`<app-file-dropzone compact></app-file-dropzone>`,
    },
  ],
};

export default meta;
