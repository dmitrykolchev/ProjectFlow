import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { ActiveView } from '../../../types';
import { iconClock, iconGlobe, iconUser, iconZap } from '../../common/icons';
import { eventValue } from '../../common/event-value';
import '../../common/app-avatar/app-avatar';
import '../../common/app-page-header/app-page-header';
import '../../common/app-section-card/app-section-card';
import '../../common/app-select/app-select';
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

const DEFAULT_VIEW_OPTIONS: ActiveView[] = [
  'dashboard',
  'kanban',
  'gantt',
  'grid',
  'calendar',
  'analytics',
  'projects',
  'requirements',
  'knowledge-base',
  'documents',
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

    return html`
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

      <!-- Regional settings -->
      <app-section-card variant="panel" title="${t.profileSettings.regionTitle}">
        <span slot="icon">${iconGlobe(17)}</span>
        <p class="section-desc">${t.profileSettings.regionDesc}</p>

        <div class="profile-grid">
          <div class="profile-field-group">
            <app-select
              label="${t.profileSettings.languageLabel}"
              .value="${this.custom.language}"
              .options="${[
                { value: 'ru', label: t.profileSettings.langRu },
                { value: 'en', label: t.profileSettings.langEn },
              ]}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                store.setLanguage(eventValue(e) as 'ru' | 'en')}"
            ></app-select>
          </div>

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
        </div>
      </app-section-card>

      <!-- Business settings -->
      <app-section-card variant="panel" title="${t.profileSettings.businessTitle}">
        <span slot="icon">${iconZap(17)}</span>
        <p class="section-desc">${t.profileSettings.businessDesc}</p>

        <div class="profile-grid">
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

          <div class="profile-field-group">
            <app-select
              label="${t.profileSettings.viewLabel}"
              .value="${this.custom.defaultView}"
              .options="${DEFAULT_VIEW_OPTIONS.map((v) => ({
                value: v,
                label: (t.navigation as Record<string, string>)[v] ?? v,
              }))}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                store.updateCustomization({ defaultView: eventValue(e) as ActiveView })}"
            ></app-select>
            <span class="field-hint">${t.profileSettings.viewHint}</span>
          </div>
        </div>

        <div class="profile-clock-row">
          <span class="profile-clock-icon">${iconClock(14)}</span>
          <span class="profile-clock-text">${new Date().toLocaleString(t.common.locale, { timeZone: this.custom.timezone })}</span>
        </div>
      </app-section-card>
    `;
  }
}
