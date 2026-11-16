import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { iconGrid } from '../../common/icons';
import styles from './app-material-icons.css';
import '../../common/app-page-header/app-page-header';
import '../../common/app-section-card/app-section-card';
import '../../common/app-button/app-button';
import '../../common/app-material-icon/app-material-icon';
import '../../common/app-material-icon-gallery/app-material-icon-gallery';
import {
  AppMaterialIconGallery,
  GalleryFamily,
  GallerySize,
} from '../../common/app-material-icon-gallery/app-material-icon-gallery';
import { materialIcons } from '../../../domain/material-icons/icons.data';

// Material Symbols palette view — every ligature glyph of the self-hosted variable fonts
// (3945 icons) with search by name/category/tags; the gallery toolbar drives the
// <app-material-icon> snippet panel, Enter/Space on a cell copies its name into the
// snippet, and the copy button writes the snippet to the clipboard.
@customElement('app-material-icons')
export class AppMaterialIcons extends LitElement {
  static styles = styles;

  @state() private currentLang = store.customization.language;
  @state() private selected = 'check_circle';
  @state() private family: GalleryFamily = 'outlined';
  @state() private size: GallerySize | number = 'md';
  @state() private fill = 0;
  @state() private weight = 400;
  @state() private grade = 0;
  @state() private copied = false;

  private unsubscribe?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private snippet(): string {
    // axes are emitted only when they deviate from <app-material-icon> defaults
    const axes: string[] = [];
    if (this.fill !== 0) axes.push(`fill="${this.fill}"`);
    if (this.weight !== 400) axes.push(`weight="${this.weight}"`);
    if (this.grade !== 0) axes.push(`grade="${this.grade}"`);
    const attrs = [`name="${this.selected}"`, `size="${this.size}"`, `family="${this.family}"`, ...axes];
    return `<app-material-icon ${attrs.join(' ')}></app-material-icon>`;
  }

  private copy(): void {
    const text = this.snippet();
    // async clipboard requires user gesture/permission — fallback via temporary textarea
    const done = () => {
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    };
    if (navigator.clipboard !== undefined) {
      void navigator.clipboard.writeText(text).then(done, () => this.copyFallback(text, done));
    } else {
      this.copyFallback(text, done);
    }
  }

  private copyFallback(text: string, done: () => void): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (ok) done();
  }

  render() {
    const t = getTranslation(this.currentLang);
    return html`
      <app-page-header
        title="Material Symbols"
        subtitle="${t.viewTexts.pageSubtitles.materialIcons}"
      >
        <span slot="icon">${iconGrid(28)}</span>
      </app-page-header>

      <div class="layout">
        <app-material-icon-gallery
          class="palette"
          .icons="${materialIcons}"
          @icon-select="${(e: CustomEvent<{ name: string }>) => {
            this.selected = e.detail.name;
            // family/size from the gallery toolbar drive the snippet
            const g = e.currentTarget as AppMaterialIconGallery;
            this.family = g.family;
            this.size = g.size;
          }}"
          @params-change="${(e: CustomEvent<{ family: GalleryFamily; size: GallerySize | number; fill: number; weight: number; grade: number }>) => {
            this.family = e.detail.family;
            this.size = e.detail.size;
            this.fill = e.detail.fill;
            this.weight = e.detail.weight;
            this.grade = e.detail.grade;
          }}"
        ></app-material-icon-gallery>

        <aside class="panel">
          <app-section-card title="${t.viewTexts.materialIcons.selected}">
            <div class="preview">
              <app-material-icon
                size="xxl"
                name=${this.selected}
                family=${this.family}
                fill=${this.fill}
                weight=${this.weight}
                grade=${this.grade}
              ></app-material-icon>
              <code>${this.selected}</code>
            </div>
          </app-section-card>

          <app-section-card title="${t.viewTexts.materialIcons.code}">
            <app-button slot="actions" variant="primary" size="sm" @click="${() => this.copy()}">
              ${this.copied ? t.viewTexts.materialIcons.copied : t.viewTexts.materialIcons.copy}
            </app-button>
            <pre class="snippet">${this.snippet()}</pre>
          </app-section-card>
        </aside>
      </div>
    `;
  }
}
