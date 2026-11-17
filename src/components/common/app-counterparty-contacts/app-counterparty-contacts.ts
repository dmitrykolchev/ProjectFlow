import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CounterpartyContact } from '../../../types';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { eventValue } from '../event-value';
import {
  iconCheck,
  iconCopy,
  iconEdit,
  iconPlus,
  iconTrash,
  iconUser,
  iconUsers,
} from '../icons';
import '../app-avatar/app-avatar';
import '../app-badge/app-badge';
import '../app-button/app-button';
import '../app-checkbox/app-checkbox';
import '../app-confirm-dialog/app-confirm-dialog';
import '../app-empty-state/app-empty-state';
import '../app-form-grid/app-form-grid';
import '../app-input/app-input';
import styles from './app-counterparty-contacts.css';

/**
 * Multi-person counterparty contacts viewer and inline manager.
 * Allows adding, editing, deleting, copying, and setting primary contact persons
 * along with their personal details (full name, role, department, birth date)
 * and contact channels (phones, email, messenger, notes).
 */
@customElement('app-counterparty-contacts')
export class AppCounterpartyContacts extends LitElement {
  @property({ attribute: false }) contacts: CounterpartyContact[] = [];
  @property({ type: Boolean }) editable: boolean = false;
  @property({ type: Boolean }) compact: boolean = false;
  @property({ type: Boolean, attribute: 'hide-header' }) hideHeader: boolean = false;
  @property({ type: Boolean, attribute: 'confirm-delete' }) confirmDelete: boolean = false;
  @property({ type: String }) heading: string = '';

  @state() private currentLang = store.customization.language;
  @state() private editorOpen = false;
  @state() private editingId: string | null = null;
  @state() private copiedId: string | null = null;
  @state() private deletingContact: CounterpartyContact | null = null;

  @state() private fFullName = '';
  @state() private fPosition = '';
  @state() private fDepartment = '';
  @state() private fPhone = '';
  @state() private fAdditionalPhone = '';
  @state() private fEmail = '';
  @state() private fMessenger = '';
  @state() private fBirthDate = '';
  @state() private fComment = '';
  @state() private fIsPrimary = false;
  @state() private formError = '';

  private unsubscribe?: () => void;
  private copyTimer?: ReturnType<typeof setTimeout>;

  static styles = styles;

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
    if (this.copyTimer) clearTimeout(this.copyTimer);
  }

  public openAddEditor() {
    this.editingId = null;
    this.fFullName = '';
    this.fPosition = '';
    this.fDepartment = '';
    this.fPhone = '';
    this.fAdditionalPhone = '';
    this.fEmail = '';
    this.fMessenger = '';
    this.fBirthDate = '';
    this.fComment = '';
    this.fIsPrimary = (this.contacts || []).length === 0;
    this.formError = '';
    this.editorOpen = true;
  }

  private openEditEditor(contact: CounterpartyContact) {
    this.editingId = contact.id;
    this.fFullName = contact.fullName;
    this.fPosition = contact.position || '';
    this.fDepartment = contact.department || '';
    this.fPhone = contact.phone || '';
    this.fAdditionalPhone = contact.additionalPhone || '';
    this.fEmail = contact.email || '';
    this.fMessenger = contact.messenger || '';
    this.fBirthDate = contact.birthDate || '';
    this.fComment = contact.comment || '';
    this.fIsPrimary = Boolean(contact.isPrimary);
    this.formError = '';
    this.editorOpen = true;
  }

  private closeEditor() {
    this.editorOpen = false;
    this.editingId = null;
    this.formError = '';
  }

  private emitContacts(nextContacts: CounterpartyContact[]) {
    this.dispatchEvent(
      new CustomEvent('contacts-change', {
        detail: { contacts: nextContacts },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleSaveContact() {
    const t = getTranslation(this.currentLang);
    const fullName = this.fFullName.trim();
    if (!fullName) {
      this.formError = t.contactPersons.requiredError;
      return;
    }

    const record: CounterpartyContact = {
      id: this.editingId || `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fullName,
      position: this.fPosition.trim() || undefined,
      department: this.fDepartment.trim() || undefined,
      phone: this.fPhone.trim() || undefined,
      additionalPhone: this.fAdditionalPhone.trim() || undefined,
      email: this.fEmail.trim() || undefined,
      messenger: this.fMessenger.trim() || undefined,
      birthDate: this.fBirthDate.trim() || undefined,
      comment: this.fComment.trim() || undefined,
      isPrimary: this.fIsPrimary,
    };

    const current = [...(this.contacts || [])];
    let updated: CounterpartyContact[];

    if (this.editingId) {
      updated = current.map((item) => {
        if (item.id === this.editingId) return record;
        return record.isPrimary ? { ...item, isPrimary: false } : item;
      });
    } else {
      const normalized = record.isPrimary
        ? current.map((item) => ({ ...item, isPrimary: false }))
        : current;
      updated = [...normalized, record];
    }

    if (updated.length > 0 && !updated.some((c) => c.isPrimary)) {
      updated[0] = { ...updated[0], isPrimary: true };
    }

    this.closeEditor();
    this.emitContacts(updated);
  }

  private handleSetPrimary(id: string) {
    const updated = (this.contacts || []).map((item) => ({
      ...item,
      isPrimary: item.id === id,
    }));
    this.emitContacts(updated);
  }

  private requestDelete(contact: CounterpartyContact) {
    if (this.confirmDelete) {
      this.deletingContact = contact;
      return;
    }
    this.performDelete(contact.id);
  }

  private performDelete(id: string) {
    const filtered = (this.contacts || []).filter((item) => item.id !== id);
    if (filtered.length > 0 && !filtered.some((c) => c.isPrimary)) {
      filtered[0] = { ...filtered[0], isPrimary: true };
    }
    if (this.editingId === id) {
      this.closeEditor();
    }
    this.emitContacts(filtered);
  }

  private async copyContact(contact: CounterpartyContact) {
    const t = getTranslation(this.currentLang);
    const lines = [
      `${t.contactPersons.fullNameLabel}: ${contact.fullName}`,
      contact.position ? `${t.contactPersons.positionLabel}: ${contact.position}` : '',
      contact.department ? `${t.contactPersons.departmentLabel}: ${contact.department}` : '',
      contact.phone ? `${t.contactPersons.phoneLabel}: ${contact.phone}` : '',
      contact.additionalPhone ? `${t.contactPersons.additionalPhoneLabel}: ${contact.additionalPhone}` : '',
      contact.email ? `${t.contactPersons.emailLabel}: ${contact.email}` : '',
      contact.messenger ? `${t.contactPersons.messengerLabel}: ${contact.messenger}` : '',
      contact.birthDate ? `${t.contactPersons.birthDateLabel}: ${contact.birthDate}` : '',
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch {
      // Clipboard API may be blocked in restricted iframes
    }

    this.copiedId = contact.id;
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => {
      this.copiedId = null;
    }, 1800);
  }

  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  private formatBirthDate(dateStr: string, locale: string): string {
    if (!dateStr) return '';
    const parsed = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString(locale);
  }

  private getSortedContacts(): CounterpartyContact[] {
    const list = [...(this.contacts || [])];
    list.sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)));
    return list;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const allContacts = this.contacts || [];
    const sorted = this.getSortedContacts();

    return html`
      <div class="contacts-root ${this.compact ? 'is-compact' : ''}">
        ${!this.hideHeader
          ? html`
              <div class="contacts-header">
                <div class="contacts-title-row">
                  <span class="contacts-title-icon">${iconUsers(16)}</span>
                  <span>${this.heading || t.contactPersons.title}</span>
                  <span class="contacts-count">(${allContacts.length})</span>
                </div>
                ${this.editable && !this.editorOpen
                  ? html`
                      <app-button size="sm" variant="secondary" @click="${() => this.openAddEditor()}">
                        <span slot="icon-start">${iconPlus(14)}</span>
                        <span>${t.contactPersons.addButton}</span>
                      </app-button>
                    `
                  : ''}
              </div>
            `
          : ''}

        ${this.editorOpen ? this.renderEditor(t) : ''}

        ${sorted.length === 0 && !this.editorOpen
          ? html`
              <app-empty-state
                compact
                title="${t.contactPersons.empty}"
                description="${this.compact ? '' : t.contactPersons.emptyHint}"
              >
                ${this.editable
                  ? html`
                      <app-button
                        slot="action"
                        size="sm"
                        variant="secondary"
                        @click="${() => this.openAddEditor()}"
                      >
                        <span slot="icon-start">${iconPlus(14)}</span>
                        <span>${t.contactPersons.addButton}</span>
                      </app-button>
                    `
                  : ''}
              </app-empty-state>
            `
          : sorted.length > 0
            ? html`
                <div class="contacts-grid">
                  ${sorted.map((contact) => this.renderContactCard(contact, t))}
                </div>
              `
            : ''}
      </div>

      ${this.confirmDelete
        ? html`
            <app-confirm-dialog
              .open="${Boolean(this.deletingContact)}"
              size="sm"
              title="${t.contactPersons.deleteConfirmTitle}"
              action="${t.contactPersons.deleteConfirmAction(this.deletingContact?.fullName || '')}"
              result="${t.contactPersons.deleteConfirmResult}"
              .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
              .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
              .cancelLabel="${t.common.cancel}"
              .confirmLabel="${t.common.delete}"
              @cancel="${() => (this.deletingContact = null)}"
              @confirm="${() => {
                if (this.deletingContact) {
                  const id = this.deletingContact.id;
                  this.deletingContact = null;
                  this.performDelete(id);
                }
              }}"
            ></app-confirm-dialog>
          `
        : ''}
    `;
  }

  private renderContactCard(contact: CounterpartyContact, t: ReturnType<typeof getTranslation>) {
    const isCopied = this.copiedId === contact.id;
    const roleParts = [contact.position, contact.department].filter(Boolean);

    return html`
      <article class="contact-card ${contact.isPrimary ? 'is-primary' : ''}">
        <div class="contact-head">
          <div class="contact-identity">
            <app-avatar
              size="md"
              initials="${this.getInitials(contact.fullName)}"
              title="${contact.fullName}"
            ></app-avatar>

            <div class="contact-heading">
              <div class="contact-name-row">
                <span class="contact-name">${contact.fullName}</span>
                ${contact.isPrimary
                  ? html`
                      <app-badge variant="success" appearance="soft" size="sm">
                        ${t.contactPersons.primaryBadge}
                      </app-badge>
                    `
                  : ''}
              </div>
              ${roleParts.length > 0
                ? html`<div class="contact-role">${roleParts.join(' · ')}</div>`
                : ''}
            </div>
          </div>

          <div class="contact-actions">
            <app-button
              size="sm"
              variant="icon"
              class="${isCopied ? 'copy-success' : ''}"
              title="${isCopied ? t.contactPersons.copied : t.contactPersons.copyContact}"
              @click="${() => this.copyContact(contact)}"
            >
              <span slot="start">${isCopied ? iconCheck(14) : iconCopy(14)}</span>
            </app-button>

            ${this.editable && !contact.isPrimary
              ? html`
                  <app-button
                    size="sm"
                    variant="icon"
                    title="${t.contactPersons.setPrimary}"
                    @click="${() => this.handleSetPrimary(contact.id)}"
                  >
                    <span slot="start">${iconCheck(14)}</span>
                  </app-button>
                `
              : ''}

            ${this.editable
              ? html`
                  <app-button
                    size="sm"
                    variant="icon"
                    title="${t.common.edit}"
                    @click="${() => this.openEditEditor(contact)}"
                  >
                    <span slot="start">${iconEdit(14)}</span>
                  </app-button>
                  <app-button
                    size="sm"
                    variant="icon"
                    class="danger-action"
                    title="${t.common.delete}"
                    @click="${() => this.requestDelete(contact)}"
                  >
                    <span slot="start">${iconTrash(14)}</span>
                  </app-button>
                `
              : ''}
          </div>
        </div>

        <div class="details-grid">
          ${contact.phone
            ? html`
                <div class="detail-field">
                  <span class="detail-label">${t.contactPersons.phoneLabel}</span>
                  <span class="detail-value mono">${contact.phone}</span>
                </div>
              `
            : ''}

          ${contact.additionalPhone
            ? html`
                <div class="detail-field">
                  <span class="detail-label">${t.contactPersons.additionalPhoneLabel}</span>
                  <span class="detail-value mono">${contact.additionalPhone}</span>
                </div>
              `
            : ''}

          ${contact.email
            ? html`
                <div class="detail-field">
                  <span class="detail-label">${t.contactPersons.emailLabel}</span>
                  <span class="detail-value">
                    <a class="contact-link" href="mailto:${contact.email}">${contact.email}</a>
                  </span>
                </div>
              `
            : ''}

          ${contact.messenger
            ? html`
                <div class="detail-field">
                  <span class="detail-label">${t.contactPersons.messengerLabel}</span>
                  <span class="detail-value">${contact.messenger}</span>
                </div>
              `
            : ''}

          ${contact.birthDate
            ? html`
                <div class="detail-field">
                  <span class="detail-label">${t.contactPersons.birthDateLabel}</span>
                  <span class="detail-value mono">${this.formatBirthDate(contact.birthDate, t.common.locale)}</span>
                </div>
              `
            : ''}
        </div>

        ${contact.comment ? html`<div class="contact-comment">${contact.comment}</div>` : ''}
      </article>
    `;
  }

  private renderEditor(t: ReturnType<typeof getTranslation>) {
    return html`
      <div class="editor-panel">
        <div class="editor-title">
          ${iconUser(15)}
          <span>${this.editingId ? t.contactPersons.editTitle : t.contactPersons.newTitle}</span>
        </div>

        <app-form-grid>
          <div class="col-span-2">
            <app-input
              label="${t.contactPersons.fullNameLabel}"
              placeholder="${t.contactPersons.fullNamePlaceholder}"
              .value="${this.fFullName}"
              required
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.fFullName = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.contactPersons.positionLabel}"
              placeholder="${t.contactPersons.positionPlaceholder}"
              .value="${this.fPosition}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fPosition = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.contactPersons.departmentLabel}"
              placeholder="${t.contactPersons.departmentPlaceholder}"
              .value="${this.fDepartment}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fDepartment = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.contactPersons.phoneLabel}"
              placeholder="${t.contactPersons.phonePlaceholder}"
              .value="${this.fPhone}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fPhone = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.contactPersons.additionalPhoneLabel}"
              placeholder="${t.contactPersons.additionalPhonePlaceholder}"
              .value="${this.fAdditionalPhone}"
              @input="${(e: CustomEvent<{ value: string }>) =>
                (this.fAdditionalPhone = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.contactPersons.emailLabel}"
              type="email"
              placeholder="${t.contactPersons.emailPlaceholder}"
              .value="${this.fEmail}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fEmail = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.contactPersons.messengerLabel}"
              placeholder="${t.contactPersons.messengerPlaceholder}"
              .value="${this.fMessenger}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fMessenger = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.contactPersons.birthDateLabel}"
              type="date"
              .value="${this.fBirthDate}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fBirthDate = eventValue(e))}"
            ></app-input>
          </div>

          <div class="col-span-2">
            <app-input
              label="${t.contactPersons.commentLabel}"
              placeholder="${t.contactPersons.commentPlaceholder}"
              .value="${this.fComment}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fComment = eventValue(e))}"
            ></app-input>
          </div>
        </app-form-grid>

        ${this.formError ? html`<div class="editor-error">${this.formError}</div>` : ''}

        <div class="editor-footer">
          <app-checkbox
            label="${t.contactPersons.isPrimaryLabel}"
            .checked="${this.fIsPrimary}"
            @change="${(e: CustomEvent<{ checked: boolean }>) =>
              (this.fIsPrimary = Boolean(e.detail?.checked))}"
          ></app-checkbox>

          <div class="editor-buttons">
            <app-button size="sm" variant="ghost" @click="${() => this.closeEditor()}">
              ${t.common.cancel}
            </app-button>
            <app-button size="sm" variant="primary" @click="${() => this.handleSaveContact()}">
              ${t.common.save}
            </app-button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-counterparty-contacts': AppCounterpartyContacts;
  }
}
