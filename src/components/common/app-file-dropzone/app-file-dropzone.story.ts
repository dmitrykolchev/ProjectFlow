import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-file-dropzone';

export const meta: ComponentStoryMeta = {
  title: 'Common/File Dropzone',
  component: 'app-file-dropzone',
  category: 'Common',
  description:
    'Интерактивная область загрузки файлов (drag & drop + системный выбор файла) с отображением выбранного файла, его размера и кнопкой очистки.',
  propsDoc: {
    accept: 'Accepted file extensions (native accept attribute)',
    title: 'Headline inside the drop area',
    hint: 'Secondary hint text under the headline',
    buttonLabel: 'Caption of the browse button',
    clearLabel: 'Caption of the clear button for a selected file',
    selectedLabel: 'Template caption for the selected-file line',
    compact: 'Reduced height for dense forms',
    selectedFileName: 'Name of the file already selected outside the component — renders the selected-file line (attribute form selected-file-name)',
    selectedFileSize: 'Size in bytes shown next to the selected file name; 0 hides the size (attribute form selected-file-size)',
    disabled: 'Disables drop and browse',
    'selected-file-name': 'Name of the file already selected outside the component — renders the selected-file line (attribute form selected-file-name)',
    'selected-file-size': 'Size in bytes shown next to the selected file name; 0 hides the size (attribute form selected-file-size)',
    multiple: 'Allows picking several files (native multiple on the input); the files event carries all of them, false carries only the first',
  },
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
