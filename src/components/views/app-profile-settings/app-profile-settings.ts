import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { ActiveView } from '../../../types';
import { iconClock, iconGlobe, iconLogOut, iconShieldCheck, iconUser, iconZap } from '../../common/icons';
import { eventValue } from '../../common/event-value';
import '../../common/app-avatar/app-avatar';
import '../../common/app-button/app-button';
import '../../common/app-page-header/app-page-header';
import '../../common/app-section-card/app-section-card';
import '../../common/app-select/app-select';
import '../../common/app-switch/app-switch';
import styles from './app-profile-settings.css';

const TIMEZONES = [
  'Europe/Moscow',
  'Europe/Kaliningrad',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Irkutsk',
  'Asia/Vladivostok',
  'Asia/Kamchatka',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Kyiv',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Almaty',
  'Asia/Tashkent',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'UTC',
];

@customElement('app-profile-settings')
export class AppProfileSettings extends LitElement {
  @state() private custom = { ...store.customization };
  @state() private currentLang = store.customization.language;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.unsubscribe = store.subscribe(() => {
      this.syncState();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private syncState() {
    this.custom = { ...store.customization };
    this.currentLang = store.customization.language;
  }

  render() {
    const t = getTranslation(this.currentLang);
    const currentUser = store.users.find((u) => u.id === store.currentUserId) || store.users[0];

    const viewsList: { id: ActiveView; label: string }[] = [
      { id: 'dashboard', label: t.navigation.dashboard },
      { id: 'projects', label: t.navigation.projects },
      { id: 'kanban', label: t.navigation.kanban },
      { id: 'gantt', label: t.navigation.gantt },
      { id: 'grid', label: t.navigation.grid },
      { id: 'calendar', label: t.navigation.calendar },
      { id: 'analytics', label: t.navigation.analytics },
      { id: 'companies', label: t.navigation.companies },
      { id: 'employees', label: t.navigation.employees },
      { id: 'counterparties', label: t.navigation.counterparties },
      { id: 'contracts', label: t.navigation.contracts },
      { id: 'calculations', label: t.navigation.calculations },
      { id: 'payments', label: t.navigation.payments },
      { id: 'time-tracking', label: t.navigation.timeTracking },
      { id: 'expenses', label: t.navigation.expenses },
    ];

    return html`
      <div class="settings-container">
        <app-page-header
          title="${t.navigation.profileSettings}"
          subtitle="${t.profileSettings.subtitle}"
        >
          <span slot="icon">${iconUser(28)}</span>
        </app-page-header>

        <!-- User card (read-only, from the employee directory) -->
        <app-section-card variant="panel" title="${t.profileSettings.profileCardTitle}">
          <span slot="icon">${iconUser(17)}</span>
          <p class="section-desc">${t.profileSettings.profileCardDesc}</p>
          ${currentUser
            ? html`
                <div class="profile-card-row">
                  <app-avatar
                    size="xl"
                    initials="${currentUser.avatar}"
                    title="${currentUser.name}"
                    color="var(--bg-hover, #223049)"
                  ></app-avatar>
                  <div class="profile-card-info">
                    <span class="profile-card-name">${currentUser.name}</span>
                    <span class="profile-card-role">${currentUser.role}</span>
                  </div>
                </div>
              `
            : ''}
        </app-section-card>

        <!-- Language (moved from interface settings) -->
        <app-section-card variant="panel" title="${t.settings.language}">
          <div class="options-grid">
            <div
              class="option-card ${this.custom.language === 'ru' ? 'is-active' : ''}"
              @click="${() => store.setLanguage('ru')}"
            >
              <div class="option-card-header">
                <span>${t.settings.langRu}</span>
                ${this.custom.language === 'ru' ? '✓' : ''}
              </div>
              <p class="option-card-desc">${t.viewTexts.settings.langRuDesc}</p>
            </div>

            <div
              class="option-card ${this.custom.language === 'en' ? 'is-active' : ''}"
              @click="${() => store.setLanguage('en')}"
            >
              <div class="option-card-header">
                <span>${t.settings.langEn}</span>
                ${this.custom.language === 'en' ? '✓' : ''}
              </div>
              <p class="option-card-desc">${t.viewTexts.settings.langEnDesc}</p>
            </div>
          </div>
        </app-section-card>

        <!-- Timezone -->
        <app-section-card variant="panel" title="${t.profileSettings.timezoneLabel}">
          <span slot="icon">${iconGlobe(17)}</span>
          <div class="section-blocks">
            <div class="profile-field-group">
              <app-select
                label="${t.profileSettings.timezoneLabel}"
                .value="${this.custom.timezone}"
                .options="${TIMEZONES.map((tz) => ({ value: tz, label: tz }))}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  store.updateCustomization({ timezone: eventValue(e) })}"
              ></app-select>
              <span class="field-hint">${t.profileSettings.timezoneHint}</span>
            </div>

            <div class="profile-clock-row">
              <span class="profile-clock-icon">${iconClock(14)}</span>
              <span class="profile-clock-text">${new Date().toLocaleString(t.common.locale, { timeZone: this.custom.timezone })}</span>
            </div>
          </div>
        </app-section-card>

        <!-- Default project -->
        <app-section-card variant="panel" title="${t.profileSettings.projectLabel}">
          <span slot="icon">${iconZap(17)}</span>
          <div class="profile-field-group">
            <app-select
              label="${t.profileSettings.projectLabel}"
              .value="${this.custom.defaultProjectId}"
              .options="${[
                { value: '', label: t.profileSettings.projectAuto },
                ...store.projects.map((p) => ({ value: p.id, label: p.name })),
              ]}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                store.updateCustomization({ defaultProjectId: eventValue(e) })}"
            ></app-select>
            <span class="field-hint">${t.profileSettings.projectHint}</span>
          </div>
        </app-section-card>

        <!-- Security & Session -->
        <app-section-card variant="panel" title="${t.profileSettings.securityTitle}">
          <span slot="icon">${iconShieldCheck(17)}</span>
          ${(() => {
            const session = store.authSession;
            const providerKey = session?.provider || 'local';
            const providerLabel = t.profileSettings.providerLabels[providerKey];
            const twoFactorActive = currentUser ? store.isTwoFactorEnabledForUser(currentUser.id) : false;

            return html`
              <div class="section-blocks">
                <p class="section-desc">${t.profileSettings.securityDesc}</p>

                <div class="security-meta-grid">
                  <div class="security-meta-box">
                    <span class="security-meta-label">${t.profileSettings.securityProviderLabel}</span>
                    <span class="security-meta-value">
                      ${session?.tenantId ? `${providerLabel} (${session.tenantId})` : providerLabel}
                    </span>
                  </div>
                  <div class="security-meta-box">
                    <span class="security-meta-label">${t.profileSettings.securitySessionAt}</span>
                    <span class="security-meta-value">
                      ${session?.authenticatedAt
                        ? new Date(session.authenticatedAt).toLocaleString(t.common.locale)
                        : '—'}
                    </span>
                  </div>
                </div>

                <div class="security-toggle-row">
                  <div class="security-toggle-copy">
                    <span class="security-toggle-title">${t.profileSettings.security2faLabel}</span>
                    <span class="field-hint">${t.profileSettings.security2faDesc}</span>
                  </div>
                  <app-switch
                    .checked="${twoFactorActive}"
                    label="${twoFactorActive
                      ? t.profileSettings.security2faEnabled
                      : t.profileSettings.security2faDisabled}"
                    @change="${(e: CustomEvent<{ checked: boolean }>) => {
                      store.toggleCurrentUserTwoFactor(e.detail.checked);
                      store.addNotification(
                        'success',
                        t.profileSettings.securityTitle,
                        e.detail.checked
                          ? t.profileSettings.security2faToastOn
                          : t.profileSettings.security2faToastOff
                      );
                    }}"
                  ></app-switch>
                </div>

                <div class="security-actions-row">
                  <app-button
                    variant="secondary"
                    size="sm"
                    @click="${() => {
                      store.resetTrustedDevicesForCurrentUser();
                      store.addNotification(
                        'info',
                        t.profileSettings.securityTitle,
                        t.profileSettings.securityTrustedCleared
                      );
                    }}"
                  >
                    <span>${t.profileSettings.securityResetTrusted}</span>
                  </app-button>

                  <app-button
                    variant="danger"
                    size="sm"
                    @click="${() => {
                      store.logout();
                      store.addNotification(
                        'info',
                        t.profileSettings.logoutToastTitle,
                        t.profileSettings.logoutToastDesc
                      );
                    }}"
                  >
                    <span slot="icon-start">${iconLogOut(15)}</span>
                    <span>${t.profileSettings.logoutButton}</span>
                  </app-button>
                </div>
              </div>
            `;
          })()}
        </app-section-card>

        <!-- Default launch view (title reuses the interface settings label) -->
        <app-section-card variant="panel" title="${t.settings.defaultView}">
          <div class="options-grid">
            ${viewsList.map(
              (v) => html`
                <div
                  class="option-card ${this.custom.defaultView === v.id ? 'is-active' : ''}"
                  @click="${() => store.updateCustomization({ defaultView: v.id })}"
                >
                  <div class="option-card-header">
                    <span>${v.label}</span>
                    ${this.custom.defaultView === v.id ? '✓' : ''}
                  </div>
                </div>
              `
            )}
          </div>
        </app-section-card>
      </div>
    `;
  }
}
