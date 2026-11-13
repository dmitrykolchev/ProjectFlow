import { CSSResult, LitElement, TemplateResult, html, render } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './app-modal-portal.css';

export type PortalLayerKind = 'modal' | 'popup';

export interface PortalTemplateOptions {
  kind: PortalLayerKind;
  styles?: CSSResult;
  template: TemplateResult;
  host?: object;
  closeOnBackdrop?: boolean;
  onClose?: () => void;
}

export interface PortalElementOptions {
  kind: PortalLayerKind;
  element: HTMLElement;
  closeOnBackdrop?: boolean;
  onClose?: () => void;
}

export interface PortalHandle {
  id: string;
  update(template: TemplateResult): void;
  setActive(active: boolean): void;
  close(): void;
}

interface PortalEntry {
  id: string;
  kind: PortalLayerKind;
  active: boolean;
  closeOnBackdrop: boolean;
  onClose?: () => void;
  layerEl: HTMLDivElement;
  backdropEl: HTMLDivElement;
  contentEl: HTMLDivElement;
  shadowHost?: HTMLDivElement;
  shadowRootRef?: ShadowRoot;
  host?: object;
  mountedElement?: HTMLElement;
  slotEl?: HTMLSlotElement;
}

const BASE_Z_INDEX = 9000;
const Z_STEP = 20;

@customElement('app-modal-portal')
export class AppModalPortal extends LitElement {
  private entries: PortalEntry[] = [];
  private seq = 0;
  private portalRootEl?: HTMLDivElement;
  private lastTouchY = 0;
  private lastTouchX = 0;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleWindowKeyDown, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleWindowKeyDown, true);
  }

  protected firstUpdated() {
    this.portalRootEl = this.shadowRoot?.querySelector('.portal-root') as HTMLDivElement | undefined;
    for (const entry of this.entries) {
      if (this.portalRootEl && entry.layerEl.parentNode !== this.portalRootEl) {
        this.portalRootEl.appendChild(entry.layerEl);
      }
    }
    this.syncPortalState();
  }

  render() {
    return html`<div class="portal-root"></div>`;
  }

  private handleWindowKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    const topEntry = this.getTopActiveEntry();
    if (!topEntry) return;
    e.preventDefault();
    e.stopPropagation();
    topEntry.onClose?.();
  };

  private getTopActiveEntry(): PortalEntry | undefined {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].active) return this.entries[i];
    }
    return undefined;
  }

  private syncPortalState() {
    const hasActive = this.entries.some((entry) => entry.active);
    if (hasActive) {
      this.setAttribute('active', '');
      document.documentElement.classList.add('has-open-portal');
    } else {
      this.removeAttribute('active');
      document.documentElement.classList.remove('has-open-portal');
    }

    this.entries.forEach((entry, index) => {
      entry.layerEl.style.zIndex = String(BASE_Z_INDEX + index * Z_STEP);
      entry.layerEl.classList.toggle('is-inactive', !entry.active);
    });
  }

  private canConsumeScroll(
    e: Event,
    deltaY: number,
    deltaX: number,
    layerEl: HTMLElement
  ): boolean {
    const path = e.composedPath();
    for (const node of path) {
      if (node === layerEl || node === this) break;
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains('portal-backdrop')) break;

      const computed = window.getComputedStyle(node);
      if (
        deltaY !== 0 &&
        (computed.overflowY === 'auto' || computed.overflowY === 'scroll') &&
        node.scrollHeight > node.clientHeight + 1
      ) {
        if (deltaY < 0 && node.scrollTop > 0) return true;
        if (deltaY > 0 && node.scrollTop + node.clientHeight < node.scrollHeight - 1) return true;
      }

      if (
        deltaX !== 0 &&
        (computed.overflowX === 'auto' || computed.overflowX === 'scroll') &&
        node.scrollWidth > node.clientWidth + 1
      ) {
        if (deltaX < 0 && node.scrollLeft > 0) return true;
        if (deltaX > 0 && node.scrollLeft + node.clientWidth < node.scrollWidth - 1) return true;
      }
    }
    return false;
  }

  private createBaseLayer(
    kind: PortalLayerKind,
    closeOnBackdrop: boolean,
    onClose?: () => void
  ): PortalEntry {
    const id = `portal-${++this.seq}`;
    const layerEl = document.createElement('div');
    layerEl.className = 'portal-layer';
    layerEl.dataset.portalId = id;
    layerEl.dataset.kind = kind;

    const backdropEl = document.createElement('div');
    backdropEl.className = `portal-backdrop kind-${kind}`;

    const contentEl = document.createElement('div');
    contentEl.className = 'portal-content';

    layerEl.appendChild(backdropEl);
    layerEl.appendChild(contentEl);

    const stopOnly = (e: Event) => {
      e.stopPropagation();
    };

    const handleBackdropPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const entry = this.entries.find((item) => item.id === id);
      if (entry?.active && entry.closeOnBackdrop) {
        entry.onClose?.();
      }
    };

    backdropEl.addEventListener('pointerdown', handleBackdropPointerDown);
    backdropEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    backdropEl.addEventListener('pointerup', stopOnly);
    backdropEl.addEventListener('click', stopOnly);
    backdropEl.addEventListener('dblclick', stopOnly);
    backdropEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    backdropEl.addEventListener('pointermove', stopOnly);
    backdropEl.addEventListener('pointerover', stopOnly);
    backdropEl.addEventListener('pointerenter', stopOnly);

    layerEl.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        const entry = this.entries.find((item) => item.id === id);
        if (!entry?.active) return;
        e.stopPropagation();
        if (!this.canConsumeScroll(e, e.deltaY, e.deltaX, layerEl)) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    layerEl.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        if (e.touches.length > 0) {
          this.lastTouchY = e.touches[0].clientY;
          this.lastTouchX = e.touches[0].clientX;
        }
      },
      { passive: true }
    );

    layerEl.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        const entry = this.entries.find((item) => item.id === id);
        if (!entry?.active) return;
        e.stopPropagation();
        const touch = e.touches[0];
        if (!touch) return;
        const deltaY = this.lastTouchY - touch.clientY;
        const deltaX = this.lastTouchX - touch.clientX;
        this.lastTouchY = touch.clientY;
        this.lastTouchX = touch.clientX;
        if (!this.canConsumeScroll(e, deltaY, deltaX, layerEl)) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    const entry: PortalEntry = {
      id,
      kind,
      active: true,
      closeOnBackdrop,
      onClose,
      layerEl,
      backdropEl,
      contentEl,
    };

    this.entries.push(entry);

    if (!this.portalRootEl) {
      this.portalRootEl = this.shadowRoot?.querySelector('.portal-root') as HTMLDivElement | undefined;
    }
    if (this.portalRootEl) {
      this.portalRootEl.appendChild(layerEl);
    }

    this.syncPortalState();
    return entry;
  }

  public mountTemplate(options: PortalTemplateOptions): PortalHandle {
    const entry = this.createBaseLayer(
      options.kind,
      options.closeOnBackdrop ?? true,
      options.onClose
    );

    const shadowHost = document.createElement('div');
    shadowHost.className = 'portal-shadow-host';
    const shadowRootRef = shadowHost.attachShadow({ mode: 'open' });

    if (options.styles?.styleSheet && 'adoptedStyleSheets' in shadowRootRef) {
      shadowRootRef.adoptedStyleSheets = [options.styles.styleSheet];
    } else if (options.styles?.cssText) {
      const styleEl = document.createElement('style');
      styleEl.textContent = options.styles.cssText;
      shadowRootRef.appendChild(styleEl);
    }

    entry.contentEl.appendChild(shadowHost);
    entry.shadowHost = shadowHost;
    entry.shadowRootRef = shadowRootRef;
    entry.host = options.host;

    render(options.template, shadowRootRef, { host: options.host });

    return {
      id: entry.id,
      update: (template: TemplateResult) => {
        if (!this.entries.includes(entry) || !entry.shadowRootRef) return;
        render(template, entry.shadowRootRef, { host: entry.host });
      },
      setActive: (active: boolean) => {
        entry.active = active;
        this.syncPortalState();
      },
      close: () => {
        this.unmountEntry(entry.id);
      },
    };
  }

  public mountElement(options: PortalElementOptions): PortalHandle {
    const entry = this.createBaseLayer(
      options.kind,
      options.closeOnBackdrop ?? false,
      options.onClose
    );

    const slotName = `slot-${entry.id}`;
    const slotEl = document.createElement('slot');
    slotEl.name = slotName;
    entry.contentEl.appendChild(slotEl);

    options.element.setAttribute('slot', slotName);
    this.appendChild(options.element);

    entry.mountedElement = options.element;
    entry.slotEl = slotEl;

    return {
      id: entry.id,
      update: () => {
        // Element updates via its own reactive properties
      },
      setActive: (active: boolean) => {
        entry.active = active;
        this.syncPortalState();
      },
      close: () => {
        this.unmountEntry(entry.id);
      },
    };
  }

  public unmountEntry(id: string) {
    const idx = this.entries.findIndex((item) => item.id === id);
    if (idx === -1) return;
    const [entry] = this.entries.splice(idx, 1);

    if (entry.shadowRootRef) {
      render(html``, entry.shadowRootRef, { host: entry.host });
    }
    if (entry.mountedElement && entry.mountedElement.parentNode === this) {
      entry.mountedElement.removeAttribute('slot');
      this.removeChild(entry.mountedElement);
    } else if (entry.mountedElement) {
      entry.mountedElement.removeAttribute('slot');
    }
    entry.layerEl.remove();
    this.syncPortalState();
  }
}

let portalSingleton: AppModalPortal | null = null;

export function getModalPortal(): AppModalPortal {
  if (portalSingleton && portalSingleton.isConnected) {
    return portalSingleton;
  }
  const existing = document.body.querySelector('app-modal-portal') as AppModalPortal | null;
  if (existing) {
    portalSingleton = existing;
    return existing;
  }
  const portal = document.createElement('app-modal-portal') as AppModalPortal;
  document.body.appendChild(portal);
  portalSingleton = portal;
  return portal;
}

export const portalManager = {
  mountTemplate(options: PortalTemplateOptions): PortalHandle {
    return getModalPortal().mountTemplate(options);
  },
  mountElement(options: PortalElementOptions): PortalHandle {
    return getModalPortal().mountElement(options);
  },
};
