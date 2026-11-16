import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './app-material-icon-gallery.css';
import '../app-input/app-input';
import '../app-select/app-select';
import type { SelectOption } from '../app-select/app-select';
import '../app-badge/app-badge';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { SupportedLang } from '../../../types';
import { eventValue } from '../event-value';
import { categoriesOf, filterIcons } from '../../../domain/material-icons/search';
import type { MaterialIconDef } from '../../../domain/material-icons/icons.data';

export type GalleryFamily = 'outlined' | 'rounded' | 'sharp';
// canonical icon scale shared with SVG icons and <app-material-icon>:
// xxs|xs|sm|md|lg|xl|xxl = 12/14/16/20/24/28/36px; legacy aliases xsm = xs, xlg = xl
export type GallerySize = 'xxs' | 'xs' | 'xsm' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xlg';

const GALLERY_SIZE_CLASS: Record<GallerySize, string> = {
  xxs: 'xxs',
  xs: 'xs',
  xsm: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  xxl: 'xxl',
  xlg: 'xl',
};

// Material Symbols palette — every ligature glyph of the self-hosted variable fonts
// (fonts.google.com/icons) with search by name, category and tags. Toolbar: query +
// category + family + size + axes; the grid is role=grid with roving tabindex and
// arrow keys ←→↑↓, Enter/Space selects an icon → "icon-select" {name} event.
// Glyphs render with the same variable fonts as <app-material-icon> (fill/weight/grade
// axes from props); "params-change" reports toolbar parameter changes.
@customElement('app-material-icon-gallery')
export class AppMaterialIconGallery extends LitElement {
  static styles = styles;

  @property({ type: Array }) icons: MaterialIconDef[] = [];
  @property() query = '';
  @property() category = 'all';
  @property() family: GalleryFamily = 'outlined';
  // canonical scale names, legacy aliases (xsm = xs, xlg = xl), or a numeric px size
  @property({
    converter: {
      fromAttribute: (value: string) => {
        const n = Number(value);
        return value.trim() !== '' && Number.isFinite(n) ? n : value;
      },
    },
  })
  size: GallerySize | number = 'md'; // canonical scale, md default (20px)
  @property({ type: Number }) fill = 0; // 0 | 1 — FILL axis
  @property({ type: Number }) weight = 400; // 100..700 — wght axis
  @property({ type: Number }) grade = 0; // -50..200 — GRAD axis
  @property({ type: Boolean }) disabled = false;

  @state() private currentLang: SupportedLang = store.customization.language;
  @state() private cursor = 0; // roving index in the filtered list
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

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('size')) {
      this.classList.remove('xxs', 'xs', 'xsm', 'sm', 'md', 'lg', 'xl', 'xlg');
      if (typeof this.size === 'number') {
        // numeric size = glyph box in px; label font-size stays proportional and readable
        const px = Math.max(1, Math.round(this.size));
        this.style.setProperty('--gh', `${px}px`);
        this.style.setProperty('--fs', `${Math.min(18, Math.max(10, Math.round(px * 0.7)))}px`);
        this.style.setProperty('--mi-opsz', String(Math.min(48, Math.max(20, px))));
      } else {
        this.style.removeProperty('--gh');
        this.style.removeProperty('--fs');
        this.style.removeProperty('--mi-opsz');
        this.classList.add(GALLERY_SIZE_CLASS[this.size] ?? 'md');
      }
    }
  }

  private filtered(): MaterialIconDef[] {
    return filterIcons(this.icons, this.query, this.category);
  }

  private pick(name: string): void {
    if (this.disabled) {
      return;
    }
    this.dispatchEvent(new CustomEvent<{ name: string }>('icon-select', { detail: { name }, bubbles: true, composed: true }));
  }

  // toolbar params = every axis/property of <app-material-icon> (family/size/fill/weight/grade);
  // the parent updates its snippet; event fires on change
  private emitParams(): void {
    this.dispatchEvent(new CustomEvent<{ family: GalleryFamily; size: GallerySize | number; fill: number; weight: number; grade: number }>(
      'params-change', { detail: { family: this.family, size: this.size, fill: this.fill, weight: this.weight, grade: this.grade }, bubbles: true, composed: true }));
  }

  // roving-tabindex: arrows ←→↑↓ move focus across the grid
  private onGridKeys(e: KeyboardEvent): void {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];
    if (!keys.includes(e.key)) return;
    const root = this.shadowRoot;
    if (root === null) return;
    const cells = Array.from(root.querySelectorAll<HTMLButtonElement>('.cell'));
    if (cells.length === 0) return;
    const active = root.activeElement as HTMLButtonElement | null;
    const idx = active !== null ? cells.indexOf(active) : -1;
    const cols = this.columns(cells);
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? cols : -cols;
    const next = Math.min(Math.max(idx + delta, 0), cells.length - 1);
    const cell = cells[next];
    if (cell !== undefined) {
      cell.focus();
      this.cursor = next;
    }
    e.preventDefault();
  }

  private columns(cells: HTMLButtonElement[]): number {
    const first = cells[0];
    if (cells.length < 2 || first === undefined) return 1;
    const top = first.offsetTop;
    let c = 1;
    while (c < cells.length) {
      const cell = cells[c];
      if (cell === undefined || cell.offsetTop !== top) break;
      c++;
    }
    return c;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const items = this.filtered();
    const cats = ['all', ...categoriesOf(this.icons)];
    const catOpts: SelectOption[] = cats.map((c) => ({ value: c, label: c === 'all' ? t.common.icons.all : c }));
    const famOpts: SelectOption[] = (['outlined', 'rounded', 'sharp'] as GalleryFamily[]).map((f) => ({ value: f, label: f }));
    const sizeOpts: SelectOption[] = (['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const).map((s) => ({ value: s, label: s }));
    // Google axes — fixed registry levels, same as the playground
    const fillOpts: SelectOption[] = ['0', '1'].map((v) => ({ value: v, label: v }));
    const weightOpts: SelectOption[] = ['100', '200', '300', '400', '500', '600', '700'].map((v) => ({ value: v, label: v }));
    const gradeOpts: SelectOption[] = ['-50', '-25', '0', '25', '100', '200'].map((v) => ({ value: v, label: v }));
    const axes = `--mi-fill:${this.fill};--mi-wght:${this.weight};--mi-grad:${this.grade}`;
    return html`
      <div class="toolbar">
        <div class="controls">
          <app-input label=${t.common.icons.search} .value=${this.query}
            @input="${(e: Event) => { this.query = String(eventValue(e) ?? ''); this.cursor = 0; }}"></app-input>
          <app-select class="category" label=${t.common.icons.category} .options=${catOpts} .value=${this.category}
            @change="${(e: Event) => { this.category = String(eventValue(e)); this.cursor = 0; }}"></app-select>
          <app-select label=${t.common.icons.family} .options=${famOpts} .value=${this.family}
            @change="${(e: Event) => { this.family = String(eventValue(e)) as GalleryFamily; this.cursor = 0; this.emitParams(); }}"></app-select>
          <app-select label=${t.common.icons.size} .options=${sizeOpts}
            .value=${typeof this.size === 'number' ? '' : this.size}
            @change="${(e: Event) => { this.size = String(eventValue(e)) as GallerySize; this.cursor = 0; this.emitParams(); }}"></app-select>
          <app-select label=${t.common.icons.fill} .options=${fillOpts} .value=${String(this.fill)}
            @change="${(e: Event) => { this.fill = Number(eventValue(e)); this.cursor = 0; this.emitParams(); }}"></app-select>
          <app-select label=${t.common.icons.weight} .options=${weightOpts} .value=${String(this.weight)}
            @change="${(e: Event) => { this.weight = Number(eventValue(e)); this.cursor = 0; this.emitParams(); }}"></app-select>
          <app-select label=${t.common.icons.grade} .options=${gradeOpts} .value=${String(this.grade)}
            @change="${(e: Event) => { this.grade = Number(eventValue(e)); this.cursor = 0; this.emitParams(); }}"></app-select>
        </div>
        <app-badge variant="neutral" size="md">${String(items.length)}</app-badge>
      </div>
      ${items.length === 0 ? html`<p class="empty">${t.common.icons.empty}</p>` : html`
        <div class="grid" role="grid" aria-label=${t.common.icons.palette} @keydown=${this.onGridKeys}>
          ${items.map((it, i) => html`
            <button type="button" role="gridcell" class="cell" part="cell" tabindex=${i === this.cursor ? 0 : -1}
              ?disabled=${this.disabled}
              aria-label=${it.name.replace(/_/g, ' ')} @click=${() => { this.cursor = i; this.pick(it.name); }}>
              <span class="glyph f-${this.family}" style=${axes}>${it.name}</span>
              <span class="name">${it.name}</span>
            </button>
          `)}
        </div>
      `}
    `;
  }
}
