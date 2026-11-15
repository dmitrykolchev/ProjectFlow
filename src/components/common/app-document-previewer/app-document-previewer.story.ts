import { html } from 'lit';
import { initialDocuments } from '../../../state/mock-data';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-document-previewer';

const mdDoc = initialDocuments.find((d) => d.id === 'doc-1') || initialDocuments[0];
const svgDoc = initialDocuments.find((d) => d.id === 'doc-2') || initialDocuments[1];
const pdfDoc = initialDocuments.find((d) => d.id === 'doc-3') || initialDocuments[2];
const csvDoc = initialDocuments.find((d) => d.id === 'doc-11') || initialDocuments[0];
const binaryDoc = initialDocuments.find((d) => d.id === 'doc-9') || initialDocuments[0];

export const meta: ComponentStoryMeta = {
  title: 'Common/Document Previewer',
  component: 'app-document-previewer',
  category: 'Common',
  description:
    'Встроенный просмотрщик документов без скачивания: PDF (через Blob Object URL в iframe), масштабируемые изображения/SVG, форматированный Markdown, табличный CSV, JSON/SQL/код с нумерацией строк и переносом, а также fallback для бинарных форматов.',
  stories: [
    {
      name: 'PDF Document Preview',
      description: 'Встроенный просмотр PDF-файла (договор ДГ-2026/001) без скачивания.',
      render: () => html`
        <app-document-previewer
          .document="${pdfDoc}"
          .documents="${[pdfDoc, mdDoc, svgDoc]}"
          height="460px"
        ></app-document-previewer>
      `,
    },
    {
      name: 'Image & Diagram Zoom Preview',
      description: 'Просмотр векторной SVG-схемы с управлением масштабом (50%–200%) и фоном-сеткой.',
      render: () => html`
        <app-document-previewer
          .document="${svgDoc}"
          height="420px"
        ></app-document-previewer>
      `,
    },
    {
      name: 'Markdown Rendered / Source',
      description: 'Переключатель между отформатированным Markdown и исходником с нумерацией строк.',
      render: () => html`
        <app-document-previewer
          .document="${mdDoc}"
          height="360px"
        ></app-document-previewer>
      `,
    },
    {
      name: 'CSV Table Preview',
      description: 'Табличный просмотр CSV-регламента с переключением в сырой текст.',
      render: () => html`
        <app-document-previewer
          .document="${csvDoc}"
          height="320px"
        ></app-document-previewer>
      `,
    },
    {
      name: 'Binary Format Fallback',
      description: 'Информативная карточка метаданных с кнопкой скачивания для .xlsx/.docx.',
      render: () => html`
        <app-document-previewer
          .document="${binaryDoc}"
          height="280px"
        ></app-document-previewer>
      `,
    },
  ],
};

export default meta;
