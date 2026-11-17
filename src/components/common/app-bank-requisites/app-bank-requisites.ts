import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BankCurrency, BankRequisite } from '../../../types';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { eventValue } from '../event-value';
import {
  iconCheck,
  iconCopy,
  iconEdit,
  iconLandmark,
  iconPlus,
  iconTrash,
} from '../icons';
import '../app-badge/app-badge';
import '../app-button/app-button';
import '../app-checkbox/app-checkbox';
import '../app-confirm-dialog/app-confirm-dialog';
import '../app-empty-state/app-empty-state';
import '../app-form-grid/app-form-grid';
import '../app-input/app-input';
import '../app-select/app-select';
import styles from './app-bank-requisites.css';

const BANK_CURRENCIES: BankCurrency[] = ['RUB', 'USD', 'EUR', 'CNY', 'GBP', 'KZT', 'AED'];

/**
 * Multi-bank, multi-currency bank requisites manager and viewer.
 * Supports read-only display, one-click clipboard copy, currency filtering,
 * and inline CRUD (emitting `accounts-change` with the updated BankRequisite[]).
 */
@customElement('app-bank-requisites')
export class AppBankRequisites extends LitElement {
  @property({ attribute: false }) accounts: BankRequisite[] = [];
  @property({ type: Boolean }) editable: boolean = false;
  @property({ type: Boolean }) compact: boolean = false;
  @property({ type: Boolean, attribute: 'hide-header' }) hideHeader: boolean = false;
  @property({ type: Boolean, attribute: 'confirm-delete' }) confirmDelete: boolean = false;
  @property({ type: String }) heading: string = '';

  @state() private currentLang = store.customization.language;
  @state() private currencyFilter: 'all' | BankCurrency = 'all';
  @state() private editorOpen = false;
  @state() private editingId: string | null = null;
  @state() private copiedId: string | null = null;
  @state() private deletingAccount: BankRequisite | null = null;

  @state() private fBankName = '';
  @state() private fCurrency: BankCurrency = 'RUB';
  @state() private fAccountNumber = '';
  @state() private fBik = '';
  @state() private fCorrAccount = '';
  @state() private fSwift = '';
  @state() private fIban = '';
  @state() private fBankAddress = '';
  @state() private fComment = '';
  @state() private fIsDefault = false;
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
    this.fBankName = '';
    this.fCurrency = 'RUB';
    this.fAccountNumber = '';
    this.fBik = '';
    this.fCorrAccount = '';
    this.fSwift = '';
    this.fIban = '';
    this.fBankAddress = '';
    this.fComment = '';
    this.fIsDefault = this.accounts.length === 0;
    this.formError = '';
    this.editorOpen = true;
  }

  private openEditEditor(acc: BankRequisite) {
    this.editingId = acc.id;
    this.fBankName = acc.bankName;
    this.fCurrency = acc.currency;
    this.fAccountNumber = acc.accountNumber;
    this.fBik = acc.bik || '';
    this.fCorrAccount = acc.corrAccount || '';
    this.fSwift = acc.swift || '';
    this.fIban = acc.iban || '';
    this.fBankAddress = acc.bankAddress || '';
    this.fComment = acc.comment || '';
    this.fIsDefault = Boolean(acc.isDefault);
    this.formError = '';
    this.editorOpen = true;
  }

  private closeEditor() {
    this.editorOpen = false;
    this.editingId = null;
    this.formError = '';
  }

  private emitAccounts(nextAccounts: BankRequisite[]) {
    this.dispatchEvent(
      new CustomEvent('accounts-change', {
        detail: { accounts: nextAccounts },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleSaveAccount() {
    const t = getTranslation(this.currentLang);
    const bankName = this.fBankName.trim();
    const accountNumber = this.fAccountNumber.trim();
    if (!bankName || !accountNumber) {
      this.formError = t.bankAccounts.requiredError;
      return;
    }

    const record: BankRequisite = {
      id: this.editingId || `ba-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      bankName,
      currency: this.fCurrency,
      accountNumber,
      bik: this.fBik.trim() || undefined,
      corrAccount: this.fCorrAccount.trim() || undefined,
      swift: this.fSwift.trim() || undefined,
      iban: this.fIban.trim() || undefined,
      bankAddress: this.fBankAddress.trim() || undefined,
      comment: this.fComment.trim() || undefined,
      isDefault: this.fIsDefault,
    };

    const current = [...(this.accounts || [])];
    let updated: BankRequisite[];

    if (this.editingId) {
      updated = current.map((item) => {
        if (item.id === this.editingId) return record;
        return record.isDefault ? { ...item, isDefault: false } : item;
      });
    } else {
      const normalized = record.isDefault
        ? current.map((item) => ({ ...item, isDefault: false }))
        : current;
      updated = [...normalized, record];
    }

    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0] = { ...updated[0], isDefault: true };
    }

    this.closeEditor();
    this.emitAccounts(updated);
  }

  private handleSetPrimary(id: string) {
    const updated = (this.accounts || []).map((item) => ({
      ...item,
      isDefault: item.id === id,
    }));
    this.emitAccounts(updated);
  }

  private requestDelete(acc: BankRequisite) {
    if (this.confirmDelete) {
      this.deletingAccount = acc;
      return;
    }
    this.performDelete(acc.id);
  }

  private performDelete(id: string) {
    const filtered = (this.accounts || []).filter((item) => item.id !== id);
    if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
      filtered[0] = { ...filtered[0], isDefault: true };
    }
    if (this.currencyFilter !== 'all' && !filtered.some((a) => a.currency === this.currencyFilter)) {
      this.currencyFilter = 'all';
    }
    if (this.editingId === id) {
      this.closeEditor();
    }
    this.emitAccounts(filtered);
  }

  private async copyAccount(acc: BankRequisite) {
    const t = getTranslation(this.currentLang);
    const lines = [
      `${t.bankAccounts.bankNameLabel}: ${acc.bankName}`,
      `${t.bankAccounts.currencyLabel}: ${acc.currency}`,
      `${t.bankAccounts.accountNumberLabel}: ${acc.accountNumber}`,
      acc.bik ? `${t.bankAccounts.bikLabel}: ${acc.bik}` : '',
      acc.corrAccount ? `${t.bankAccounts.corrAccountLabel}: ${acc.corrAccount}` : '',
      acc.swift ? `${t.bankAccounts.swiftLabel}: ${acc.swift}` : '',
      acc.iban ? `${t.bankAccounts.ibanLabel}: ${acc.iban}` : '',
      acc.bankAddress ? `${t.bankAccounts.bankAddressLabel}: ${acc.bankAddress}` : '',
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
    } catch {
      // Clipboard API may be blocked in restricted iframes
    }

    this.copiedId = acc.id;
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => {
      this.copiedId = null;
    }, 1800);
  }

  private getSortedAccounts(): BankRequisite[] {
    const list = [...(this.accounts || [])];
    list.sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)));
    if (this.currencyFilter === 'all') return list;
    return list.filter((a) => a.currency === this.currencyFilter);
  }

  render() {
    const t = getTranslation(this.currentLang);
    const allAccounts = this.accounts || [];
    const sorted = this.getSortedAccounts();
    const usedCurrencies = Array.from(new Set(allAccounts.map((a) => a.currency)));

    return html`
      <div class="bank-root ${this.compact ? 'is-compact' : ''}">
        ${!this.hideHeader
          ? html`
              <div class="bank-header">
                <div class="bank-title-row">
                  <span class="bank-title-icon">${iconLandmark(16)}</span>
                  <span>${this.heading || t.bankAccounts.title}</span>
                  <span class="bank-count">(${allAccounts.length})</span>
                </div>
                ${this.editable && !this.editorOpen
                  ? html`
                      <app-button size="sm" variant="secondary" @click="${() => this.openAddEditor()}">
                        <span slot="icon-start">${iconPlus(14)}</span>
                        <span>${t.bankAccounts.addButton}</span>
                      </app-button>
                    `
                  : ''}
              </div>
            `
          : ''}

        ${usedCurrencies.length > 1
          ? html`
              <div class="currency-filter-bar">
                <button
                  type="button"
                  class="currency-filter-btn ${this.currencyFilter === 'all' ? 'is-active' : ''}"
                  @click="${() => (this.currencyFilter = 'all')}"
                >
                  <span>${t.bankAccounts.allCurrencies}</span>
                  <span class="filter-count">${allAccounts.length}</span>
                </button>
                ${usedCurrencies.map((cur) => {
                  const count = allAccounts.filter((a) => a.currency === cur).length;
                  return html`
                    <button
                      type="button"
                      class="currency-filter-btn ${this.currencyFilter === cur ? 'is-active' : ''}"
                      @click="${() => (this.currencyFilter = cur)}"
                    >
                      <span>${cur}</span>
                      <span class="filter-count">${count}</span>
                    </button>
                  `;
                })}
              </div>
            `
          : ''}

        ${this.editorOpen ? this.renderEditor(t) : ''}

        ${sorted.length === 0 && !this.editorOpen
          ? html`
              <app-empty-state
                compact
                title="${t.bankAccounts.empty}"
                description="${this.compact ? '' : t.bankAccounts.emptyHint}"
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
                        <span>${t.bankAccounts.addButton}</span>
                      </app-button>
                    `
                  : ''}
              </app-empty-state>
            `
          : sorted.length > 0
            ? html`
                <div class="accounts-grid">
                  ${sorted.map((acc) => this.renderAccountCard(acc, t))}
                </div>
              `
            : ''}
      </div>

      ${this.confirmDelete
        ? html`
            <app-confirm-dialog
              .open="${Boolean(this.deletingAccount)}"
              size="sm"
              title="${t.bankAccounts.deleteConfirmTitle}"
              action="${t.bankAccounts.deleteConfirmAction(
                this.deletingAccount?.bankName || '',
                this.deletingAccount?.accountNumber || ''
              )}"
              result="${t.bankAccounts.deleteConfirmResult}"
              .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
              .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
              .cancelLabel="${t.common.cancel}"
              .confirmLabel="${t.common.delete}"
              @cancel="${() => (this.deletingAccount = null)}"
              @confirm="${() => {
                if (this.deletingAccount) {
                  const id = this.deletingAccount.id;
                  this.deletingAccount = null;
                  this.performDelete(id);
                }
              }}"
            ></app-confirm-dialog>
          `
        : ''}
    `;
  }

  private renderAccountCard(acc: BankRequisite, t: ReturnType<typeof getTranslation>) {
    const isCopied = this.copiedId === acc.id;

    return html`
      <article class="account-card ${acc.isDefault ? 'is-default' : ''}">
        <div class="account-head">
          <div class="account-head-left">
            <span class="currency-tag cur-${acc.currency}">${acc.currency}</span>
            <span class="bank-name">${acc.bankName}</span>
            ${acc.isDefault
              ? html`
                  <app-badge variant="success" appearance="soft" size="sm">
                    ${t.bankAccounts.primaryBadge}
                  </app-badge>
                `
              : ''}
          </div>

          <div class="account-actions">
            <app-button
              size="sm"
              variant="icon"
              class="${isCopied ? 'copy-success' : ''}"
              title="${isCopied ? t.bankAccounts.copied : t.bankAccounts.copyRequisites}"
              @click="${() => this.copyAccount(acc)}"
            >
              <span slot="start">${isCopied ? iconCheck(14) : iconCopy(14)}</span>
            </app-button>

            ${this.editable && !acc.isDefault
              ? html`
                  <app-button
                    size="sm"
                    variant="icon"
                    title="${t.bankAccounts.setPrimary}"
                    @click="${() => this.handleSetPrimary(acc.id)}"
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
                    @click="${() => this.openEditEditor(acc)}"
                  >
                    <span slot="start">${iconEdit(14)}</span>
                  </app-button>
                  <app-button
                    size="sm"
                    variant="icon"
                    action="delete"
                    title="${t.common.delete}"
                    @click="${() => this.requestDelete(acc)}"
                  >
                    <span slot="start">${iconTrash(14)}</span>
                  </app-button>
                `
              : ''}
          </div>
        </div>

        <div class="reqs-grid">
          <div class="req-field full-span">
            <span class="req-label">${t.bankAccounts.accountNumberLabel}</span>
            <span class="req-value mono primary-number">${acc.accountNumber}</span>
          </div>

          ${acc.bik
            ? html`
                <div class="req-field">
                  <span class="req-label">${t.bankAccounts.bikLabel}</span>
                  <span class="req-value mono">${acc.bik}</span>
                </div>
              `
            : ''}

          ${acc.corrAccount
            ? html`
                <div class="req-field">
                  <span class="req-label">${t.bankAccounts.corrAccountLabel}</span>
                  <span class="req-value mono">${acc.corrAccount}</span>
                </div>
              `
            : ''}

          ${acc.swift
            ? html`
                <div class="req-field">
                  <span class="req-label">${t.bankAccounts.swiftLabel}</span>
                  <span class="req-value mono">${acc.swift}</span>
                </div>
              `
            : ''}

          ${acc.iban
            ? html`
                <div class="req-field">
                  <span class="req-label">${t.bankAccounts.ibanLabel}</span>
                  <span class="req-value mono">${acc.iban}</span>
                </div>
              `
            : ''}

          ${acc.bankAddress
            ? html`
                <div class="req-field full-span">
                  <span class="req-label">${t.bankAccounts.bankAddressLabel}</span>
                  <span class="req-value">${acc.bankAddress}</span>
                </div>
              `
            : ''}
        </div>

        ${acc.comment ? html`<div class="account-comment">${acc.comment}</div>` : ''}
      </article>
    `;
  }

  private renderEditor(t: ReturnType<typeof getTranslation>) {
    const currencyOptions = BANK_CURRENCIES.map((cur) => ({
      value: cur,
      label: t.bankAccounts.currencies[cur],
    }));

    return html`
      <div class="editor-panel">
        <div class="editor-title">
          ${iconLandmark(15)}
          <span>${this.editingId ? t.bankAccounts.editTitle : t.bankAccounts.newTitle}</span>
        </div>

        <app-form-grid>
          <div>
            <app-input
              label="${t.bankAccounts.bankNameLabel}"
              placeholder="${t.bankAccounts.bankNamePlaceholder}"
              .value="${this.fBankName}"
              required
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.fBankName = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>

          <div>
            <app-select
              label="${t.bankAccounts.currencyLabel}"
              .value="${this.fCurrency}"
              .options="${currencyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.fCurrency = eventValue(e) as BankCurrency)}"
            ></app-select>
          </div>

          <div class="col-span-2">
            <app-input
              label="${t.bankAccounts.accountNumberLabel}"
              placeholder="${t.bankAccounts.accountNumberPlaceholder}"
              .value="${this.fAccountNumber}"
              required
              @input="${(e: CustomEvent<{ value: string }>) => {
                this.fAccountNumber = eventValue(e);
                this.formError = '';
              }}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.bankAccounts.bikLabel}"
              placeholder="${t.bankAccounts.bikPlaceholder}"
              .value="${this.fBik}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fBik = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.bankAccounts.corrAccountLabel}"
              placeholder="${t.bankAccounts.corrAccountPlaceholder}"
              .value="${this.fCorrAccount}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fCorrAccount = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.bankAccounts.swiftLabel}"
              placeholder="${t.bankAccounts.swiftPlaceholder}"
              .value="${this.fSwift}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fSwift = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.bankAccounts.ibanLabel}"
              placeholder="${t.bankAccounts.ibanPlaceholder}"
              .value="${this.fIban}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fIban = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.bankAccounts.bankAddressLabel}"
              placeholder="${t.bankAccounts.bankAddressPlaceholder}"
              .value="${this.fBankAddress}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fBankAddress = eventValue(e))}"
            ></app-input>
          </div>

          <div>
            <app-input
              label="${t.bankAccounts.commentLabel}"
              placeholder="${t.bankAccounts.commentPlaceholder}"
              .value="${this.fComment}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.fComment = eventValue(e))}"
            ></app-input>
          </div>
        </app-form-grid>

        ${this.formError ? html`<div class="editor-error">${this.formError}</div>` : ''}

        <div class="editor-footer">
          <app-checkbox
            label="${t.bankAccounts.isDefaultLabel}"
            .checked="${this.fIsDefault}"
            @change="${(e: CustomEvent<{ checked: boolean }>) =>
              (this.fIsDefault = Boolean(e.detail?.checked))}"
          ></app-checkbox>

          <div class="editor-buttons">
            <app-button size="sm" variant="ghost" @click="${() => this.closeEditor()}">
              ${t.common.cancel}
            </app-button>
            <app-button size="sm" variant="primary" @click="${() => this.handleSaveAccount()}">
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
    'app-bank-requisites': AppBankRequisites;
  }
}
