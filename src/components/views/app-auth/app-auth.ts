import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { AuthProviderId } from '../../../types';
import {
  iconAlertTriangle,
  iconArrowLeft,
  iconBuilding,
  iconCheck,
  iconChevronDown,
  iconClock,
  iconContrast,
  iconEye,
  iconEyeOff,
  iconFacebookLogo,
  iconGlobe,
  iconGoogleLogo,
  iconHeart,
  iconKey,
  iconLock,
  iconMicrosoftLogo,
  iconMoon,
  iconShieldCheck,
  iconSun,
  iconTerminal,
  iconZap,
} from '../../common/icons';
import '../../common/app-checkbox/app-checkbox';
import '../../common/app-otp-input/app-otp-input';
import styles from './app-auth.css';

// detail of the `auth-success` event (named event-detail interface, AGENTS.md §6)
export interface AuthSuccessDetail {
  userId: string;
  email: string;
  provider: AuthProviderId;
  tenantId?: string;
  twoFactorVerified: boolean;
  trustedDevice: boolean;
}

export type AuthScreenStep = 'login' | 'register' | 'forgot' | '2fa';

interface PendingTwoFactorState {
  userId: string;
  email: string;
  maskedEmail: string;
  provider: AuthProviderId;
  tenantId?: string;
}

interface PendingOidcConsent {
  provider: Exclude<AuthProviderId, 'local'>;
  tenantOrEmail?: string;
  userId: string;
  email: string;
  maskedEmail: string;
  requires2FA: boolean;
}

@customElement('app-auth')
export class AppAuth extends LitElement {
  @property({ type: Boolean, reflect: true }) preview: boolean = false;
  @property({ type: String, attribute: 'initial-step' }) initialStep: AuthScreenStep = 'login';

  @state() private currentLang = store.customization.language;
  @state() private theme = store.customization.theme;

  @state() private step: AuthScreenStep = 'login';
  @state() private isLoading = false;
  @state() private loadingContext: 'local' | 'oidc' | 'sso' | 'register' | 'forgot' | '2fa' | null =
    null;
  @state() private errorMessage = '';
  @state() private successMessage = '';

  // Step 1: Login form
  @state() private email = '';
  @state() private password = '';
  @state() private showPassword = false;
  @state() private rememberMe = true;

  // Enterprise SSO
  @state() private ssoExpanded = false;
  @state() private ssoTenant = '';

  // Registration
  @state() private regName = '';
  @state() private regEmail = '';
  @state() private regPassword = '';
  @state() private regConfirmPassword = '';
  @state() private showRegPassword = false;
  @state() private regEnable2FA = true;

  // Forgot password
  @state() private forgotEmail = '';
  @state() private forgotSentTo = '';

  // Step 2: 2FA
  @state() private pending2fa: PendingTwoFactorState | null = null;
  @state() private otpCode = '';
  @state() private recoveryCode = '';
  @state() private useRecoveryCode = false;
  @state() private trustDevice = false;
  @state() private showTotpHelper = false;
  @state() private liveTotpCode = '------';
  @state() private totpSecondsLeft = 30;

  // OIDC Consent prompt (lets user authorize or test cancellation)
  @state() private pendingOidcConsent: PendingOidcConsent | null = null;

  // Demo helper & Storybook preview feedback
  @state() private demoOpen = false;
  @state() private previewSignedInInfo: { name: string; method: string } | null = null;

  private unsubscribe?: () => void;
  private totpIntervalId?: number;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.currentLang = store.customization.language;
    this.theme = store.customization.theme;

    if (this.initialStep === '2fa' && !this.pending2fa) {
      const demoUser = store.users[0];
      if (demoUser) {
        this.pending2fa = {
          userId: demoUser.id,
          email: demoUser.email,
          maskedEmail: store.maskEmailAddress(demoUser.email),
          provider: 'local',
        };
        this.step = '2fa';
        this.startTotpTicker();
      }
    } else if (this.initialStep !== 'login') {
      this.step = this.initialStep;
    }

    this.unsubscribe = store.subscribe(() => {
      this.currentLang = store.customization.language;
      this.theme = store.customization.theme;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
    this.stopTotpTicker();
  }

  private startTotpTicker() {
    this.stopTotpTicker();
    void this.refreshLiveTotp();
    this.totpIntervalId = window.setInterval(() => {
      void this.refreshLiveTotp();
    }, 1000);
  }

  private stopTotpTicker() {
    if (this.totpIntervalId !== undefined) {
      clearInterval(this.totpIntervalId);
      this.totpIntervalId = undefined;
    }
  }

  private async refreshLiveTotp() {
    const email = this.pending2fa?.email;
    if (!email) return;
    const nowSec = Math.floor(Date.now() / 1000);
    this.totpSecondsLeft = 30 - (nowSec % 30);
    this.liveTotpCode = await store.getTotpCodeForEmail(email);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private switchStep(next: AuthScreenStep) {
    this.step = next;
    this.errorMessage = '';
    this.successMessage = '';
    if (next === '2fa') {
      this.otpCode = '';
      this.recoveryCode = '';
      this.useRecoveryCode = false;
      this.startTotpTicker();
    } else {
      this.stopTotpTicker();
    }
  }

  private finishSession(payload: AuthSuccessDetail) {
    const t = getTranslation(this.currentLang);
    const providerLabel = t.viewTexts.auth.providers[payload.provider];
    const user = store.users.find((u) => u.id === payload.userId);

    this.stopTotpTicker();

    if (this.preview) {
      this.previewSignedInInfo = {
        name: user?.name || payload.email,
        method: providerLabel,
      };
      this.dispatchEvent(
        new CustomEvent<AuthSuccessDetail>('auth-success', {
          detail: payload,
          bubbles: true,
          composed: true,
        })
      );
      return;
    }

    store.completeAuthentication({
      ...payload,
      rememberMe: this.rememberMe,
    });
  }

  private async handleLocalSubmit(e: Event) {
    e.preventDefault();
    if (this.isLoading) return;

    const t = getTranslation(this.currentLang);
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;
    this.loadingContext = 'local';

    await this.delay(450);

    const result = await store.verifyPrimaryCredentials(this.email, this.password);
    this.isLoading = false;
    this.loadingContext = null;

    if (!result.ok) {
      this.errorMessage =
        result.errorCode === 'empty_fields'
          ? t.viewTexts.auth.errors.emptyFields
          : t.viewTexts.auth.errors.invalidCredentials;
      return;
    }

    if (result.requires2FA) {
      this.pending2fa = {
        userId: result.user.id,
        email: result.user.email,
        maskedEmail: result.maskedEmail,
        provider: 'local',
      };
      this.switchStep('2fa');
      return;
    }

    this.finishSession({
      userId: result.user.id,
      email: result.user.email,
      provider: 'local',
      twoFactorVerified: false,
      trustedDevice: true,
    });
  }

  private async handleOidcStart(provider: 'google' | 'microsoft' | 'facebook') {
    if (this.isLoading) return;
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;
    this.loadingContext = 'oidc';

    await this.delay(400);
    const res = store.resolveOidcLogin(provider);
    this.isLoading = false;
    this.loadingContext = null;

    if (res.ok) {
      this.pendingOidcConsent = {
        provider,
        userId: res.user.id,
        email: res.user.email,
        maskedEmail: res.maskedEmail,
        requires2FA: res.requires2FA,
      };
    }
  }

  private async handleEnterpriseSsoSubmit() {
    if (this.isLoading) return;
    const t = getTranslation(this.currentLang);
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;
    this.loadingContext = 'sso';

    await this.delay(520);
    const res = store.resolveOidcLogin('oidc_sso', this.ssoTenant);
    this.isLoading = false;
    this.loadingContext = null;

    if (!res.ok) {
      this.errorMessage =
        res.errorCode === 'missing_tenant'
          ? t.viewTexts.auth.errors.missingTenant
          : t.viewTexts.auth.errors.unknownTenant;
      return;
    }

    this.pendingOidcConsent = {
      provider: 'oidc_sso',
      tenantOrEmail: res.tenantId,
      userId: res.user.id,
      email: res.user.email,
      maskedEmail: res.maskedEmail,
      requires2FA: res.requires2FA,
    };
  }

  private async confirmOidcConsent() {
    if (!this.pendingOidcConsent || this.isLoading) return;
    const consent = this.pendingOidcConsent;
    this.isLoading = true;
    this.loadingContext = 'oidc';

    await this.delay(360);
    this.isLoading = false;
    this.loadingContext = null;
    this.pendingOidcConsent = null;

    if (consent.requires2FA) {
      this.pending2fa = {
        userId: consent.userId,
        email: consent.email,
        maskedEmail: consent.maskedEmail,
        provider: consent.provider,
        tenantId: consent.tenantOrEmail,
      };
      this.switchStep('2fa');
      return;
    }

    this.finishSession({
      userId: consent.userId,
      email: consent.email,
      provider: consent.provider,
      tenantId: consent.tenantOrEmail,
      twoFactorVerified: false,
      trustedDevice: true,
    });
  }

  private cancelOidcConsent() {
    const t = getTranslation(this.currentLang);
    this.pendingOidcConsent = null;
    this.errorMessage = t.viewTexts.auth.errors.oidcCancelled;
  }

  private async handleRegisterSubmit(e: Event) {
    e.preventDefault();
    if (this.isLoading) return;
    const t = getTranslation(this.currentLang);
    this.errorMessage = '';

    if (this.regPassword !== this.regConfirmPassword) {
      this.errorMessage = t.viewTexts.auth.errors.passwordMismatch;
      return;
    }

    this.isLoading = true;
    this.loadingContext = 'register';
    await this.delay(450);

    const res = store.registerLocalAccount({
      name: this.regName,
      email: this.regEmail,
      password: this.regPassword,
      enable2FA: this.regEnable2FA,
    });

    this.isLoading = false;
    this.loadingContext = null;

    if (!res.ok) {
      this.errorMessage =
        res.errorCode === 'duplicate_email'
          ? t.viewTexts.auth.errors.duplicateEmail
          : t.viewTexts.auth.errors.invalidRegistration;
      return;
    }

    if (res.requires2FA) {
      this.pending2fa = {
        userId: res.user.id,
        email: res.user.email,
        maskedEmail: res.maskedEmail,
        provider: 'local',
      };
      this.switchStep('2fa');
      return;
    }

    this.finishSession({
      userId: res.user.id,
      email: res.user.email,
      provider: 'local',
      twoFactorVerified: false,
      trustedDevice: true,
    });
  }

  private async handleForgotSubmit(e: Event) {
    e.preventDefault();
    if (this.isLoading) return;
    const t = getTranslation(this.currentLang);
    this.errorMessage = '';
    const clean = this.forgotEmail.trim();
    if (!clean || !clean.includes('@')) {
      this.errorMessage = t.viewTexts.auth.errors.invalidRegistration;
      return;
    }

    this.isLoading = true;
    this.loadingContext = 'forgot';
    await this.delay(420);
    this.isLoading = false;
    this.loadingContext = null;
    this.forgotSentTo = clean;
  }

  private async handleTwoFactorVerify(e?: Event) {
    e?.preventDefault();
    if (this.isLoading || !this.pending2fa) return;

    const t = getTranslation(this.currentLang);
    this.errorMessage = '';
    this.isLoading = true;
    this.loadingContext = '2fa';

    await this.delay(420);

    const code = this.useRecoveryCode ? this.recoveryCode : this.otpCode;
    const res = await store.verifyTwoFactorCode(
      this.pending2fa.email,
      code,
      this.useRecoveryCode,
      this.trustDevice
    );

    this.isLoading = false;
    this.loadingContext = null;

    if (!res.ok) {
      this.errorMessage =
        res.errorCode === 'invalid_recovery'
          ? t.viewTexts.auth.errors.invalidRecovery
          : t.viewTexts.auth.errors.invalidOtp;
      return;
    }

    this.finishSession({
      userId: this.pending2fa.userId,
      email: this.pending2fa.email,
      provider: this.pending2fa.provider,
      tenantId: this.pending2fa.tenantId,
      twoFactorVerified: true,
      trustedDevice: this.trustDevice,
    });
  }

  private fillDemoCredentials(email: string, password: string) {
    this.email = email;
    this.password = password;
    this.errorMessage = '';
    if (this.step !== 'login') {
      this.switchStep('login');
    }
  }

  private resetPreview() {
    this.previewSignedInInfo = null;
    this.pending2fa = null;
    this.pendingOidcConsent = null;
    this.switchStep(this.initialStep);
  }

  private getThemeIcon() {
    if (this.theme === 'high-contrast') return iconContrast(14);
    if (this.theme === 'barbie') return iconHeart(14);
    if (this.theme === 'matrix') return iconTerminal(14);
    if (this.theme === 'cyberpunk') return iconZap(14);
    if (this.theme === 'dark') return iconSun(14);
    return iconMoon(14);
  }

  private getThemeShortLabel(): string {
    switch (this.theme) {
      case 'high-contrast':
        return 'AAA';
      case 'barbie':
        return 'Barbie';
      case 'matrix':
        return 'Matrix';
      case 'cyberpunk':
        return 'Cyber';
      case 'dark':
        return 'Dark';
      default:
        return 'Light';
    }
  }

  render() {
    const t = getTranslation(this.currentLang);
    const a = t.viewTexts.auth;

    return html`
      <div class="auth-viewport">
        <div class="auth-backdrop" aria-hidden="true">
          <div class="auth-grid-pattern"></div>
          <div class="auth-glow-orb is-primary"></div>
          <div class="auth-glow-orb is-secondary"></div>
        </div>

        <header class="auth-topbar">
          <div class="topbar-brand">
            <span class="brand-mark">PF</span>
            <span>${t.common.appName}</span>
          </div>

          <div class="topbar-controls">
            <button
              type="button"
              class="utility-btn"
              @click="${() => store.toggleTheme()}"
              title="${t.viewTexts.sidebar.themeToggleTitle}"
            >
              ${this.getThemeIcon()}
              <span>${this.getThemeShortLabel()}</span>
            </button>
            <button
              type="button"
              class="utility-btn"
              @click="${() => store.setLanguage(t.common.otherLang as 'en' | 'ru')}"
              title="${t.viewTexts.sidebar.langToggleTitle}"
            >
              ${iconGlobe(14)}
              <span>${this.currentLang.toUpperCase()}</span>
            </button>
          </div>
        </header>

        <div class="auth-center">
          ${this.renderShowcasePanel(t)}

          <section class="auth-card" aria-busy="${this.isLoading ? 'true' : 'false'}">
            ${this.previewSignedInInfo
              ? html`
                  <div class="alert-banner is-success" role="status">
                    <span class="alert-icon">${iconCheck(16)}</span>
                    <div style="display:flex;flex-direction:column;gap:0.5rem;width:100%;">
                      <span>
                        ${a.previewSignedInBanner(
                          this.previewSignedInInfo.name,
                          this.previewSignedInInfo.method
                        )}
                      </span>
                      <button
                        type="button"
                        class="text-link-btn"
                        style="align-self:flex-start;"
                        @click="${() => this.resetPreview()}"
                      >
                        ${a.previewResetBtn}
                      </button>
                    </div>
                  </div>
                `
              : ''}

            ${this.errorMessage
              ? html`
                  <div class="alert-banner is-error" role="alert">
                    <span class="alert-icon">${iconAlertTriangle(16)}</span>
                    <span>${this.errorMessage}</span>
                  </div>
                `
              : ''}

            ${this.step === 'login'
              ? this.renderLoginStep(t)
              : this.step === 'register'
              ? this.renderRegisterStep(t)
              : this.step === 'forgot'
              ? this.renderForgotStep(t)
              : this.renderTwoFactorStep(t)}

            ${this.pendingOidcConsent ? this.renderOidcConsentOverlay(t) : ''}
          </section>
        </div>
      </div>
    `;
  }

  private renderShowcasePanel(t: ReturnType<typeof getTranslation>) {
    const a = t.viewTexts.auth;
    return html`
      <aside class="auth-showcase">
        <span class="showcase-badge">
          ${iconShieldCheck(14)}
          <span>${a.brandBadge}</span>
        </span>

        <h1 class="showcase-title">${a.brandHeadline}</h1>
        <p class="showcase-subtitle">${a.brandSubhead}</p>

        <div class="feature-list">
          <div class="feature-item">
            <span class="feature-icon">${iconGlobe(18)}</span>
            <div class="feature-copy">
              <span class="feature-title">${a.feature1Title}</span>
              <span class="feature-desc">${a.feature1Desc}</span>
            </div>
          </div>

          <div class="feature-item">
            <span class="feature-icon">${iconShieldCheck(18)}</span>
            <div class="feature-copy">
              <span class="feature-title">${a.feature2Title}</span>
              <span class="feature-desc">${a.feature2Desc}</span>
            </div>
          </div>

          <div class="feature-item">
            <span class="feature-icon">${iconLock(18)}</span>
            <div class="feature-copy">
              <span class="feature-title">${a.feature3Title}</span>
              <span class="feature-desc">${a.feature3Desc}</span>
            </div>
          </div>
        </div>

        <div class="demo-drawer">
          <button
            type="button"
            class="demo-toggle"
            @click="${() => (this.demoOpen = !this.demoOpen)}"
            aria-expanded="${this.demoOpen}"
          >
            <span class="demo-toggle-left">
              ${iconKey(14)}
              <span>${a.demoHintToggle}</span>
            </span>
            <span class="sso-chevron ${this.demoOpen ? 'is-open' : ''}">
              ${iconChevronDown(14)}
            </span>
          </button>

          ${this.demoOpen
            ? html`
                <div class="demo-body">
                  <button
                    type="button"
                    class="demo-cred-btn"
                    @click="${() =>
                      this.fillDemoCredentials('a.morozov@projectflow.dev', 'ProjectFlow!2026')}"
                  >
                    <span>${a.demoHintAccount1}</span>
                  </button>
                  <button
                    type="button"
                    class="demo-cred-btn"
                    @click="${() => this.fillDemoCredentials('e.smirnova@projectflow.dev', 'demo1234')}"
                  >
                    <span>${a.demoHintAccount2}</span>
                  </button>
                  <span class="demo-note">${a.demoHintOtp}</span>
                </div>
              `
            : ''}
        </div>
      </aside>
    `;
  }

  private renderLoginStep(t: ReturnType<typeof getTranslation>) {
    const a = t.viewTexts.auth;

    return html`
      <div class="card-header">
        <span class="step-indicator">${a.stepBadge1}</span>
        <h2 class="card-title">${a.loginTitle}</h2>
        <p class="card-subtitle">${a.loginSubtitle}</p>
      </div>

      <form class="auth-form" @submit="${this.handleLocalSubmit}" novalidate>
        <div class="field-group">
          <label class="field-label" for="auth-email">${a.emailLabel}</label>
          <div class="input-wrap">
            <input
              id="auth-email"
              class="native-input"
              type="text"
              name="username"
              autocomplete="username"
              placeholder="${a.emailPlaceholder}"
              .value="${this.email}"
              ?disabled="${this.isLoading}"
              @input="${(e: InputEvent) => {
                this.email = (e.target as HTMLInputElement).value;
                this.errorMessage = '';
              }}"
            />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label" for="auth-password">${a.passwordLabel}</label>
          <div class="input-wrap">
            <input
              id="auth-password"
              class="native-input has-toggle"
              type="${this.showPassword ? 'text' : 'password'}"
              name="password"
              autocomplete="current-password"
              placeholder="${a.passwordPlaceholder}"
              .value="${this.password}"
              ?disabled="${this.isLoading}"
              @input="${(e: InputEvent) => {
                this.password = (e.target as HTMLInputElement).value;
                this.errorMessage = '';
              }}"
            />
            <button
              type="button"
              class="pw-toggle-btn"
              ?disabled="${this.isLoading}"
              aria-label="${this.showPassword ? a.hidePasswordAria : a.showPasswordAria}"
              aria-pressed="${this.showPassword}"
              @click="${() => (this.showPassword = !this.showPassword)}"
            >
              ${this.showPassword ? iconEyeOff(16) : iconEye(16)}
            </button>
          </div>
        </div>

        <div class="form-options-row">
          <app-checkbox
            .checked="${this.rememberMe}"
            ?disabled="${this.isLoading}"
            label="${a.rememberMe}"
            @change="${(e: CustomEvent<{ checked: boolean }>) => {
              this.rememberMe = e.detail.checked;
            }}"
          ></app-checkbox>

          <button
            type="button"
            class="text-link-btn"
            ?disabled="${this.isLoading}"
            @click="${() => {
              this.forgotEmail = this.email;
              this.forgotSentTo = '';
              this.switchStep('forgot');
            }}"
          >
            ${a.forgotPassword}
          </button>
        </div>

        <button type="submit" class="primary-btn" ?disabled="${this.isLoading}">
          ${this.isLoading && this.loadingContext === 'local'
            ? html`<span class="btn-spinner"></span><span>${a.verifyingBtn}</span>`
            : html`<span>${a.submitBtn}</span>`}
        </button>
      </form>

      <div class="divider-row">
        <span class="divider-line"></span>
        <span>${a.dividerOr}</span>
        <span class="divider-line"></span>
      </div>

      <div class="oidc-stack">
        <button
          type="button"
          class="oidc-btn is-google"
          ?disabled="${this.isLoading}"
          @click="${() => this.handleOidcStart('google')}"
        >
          <span class="oidc-logo">${iconGoogleLogo(18)}</span>
          <span>${a.googleBtn}</span>
        </button>

        <button
          type="button"
          class="oidc-btn is-microsoft"
          ?disabled="${this.isLoading}"
          @click="${() => this.handleOidcStart('microsoft')}"
        >
          <span class="oidc-logo">${iconMicrosoftLogo(18)}</span>
          <span>${a.microsoftBtn}</span>
        </button>

        <button
          type="button"
          class="oidc-btn is-facebook"
          ?disabled="${this.isLoading}"
          @click="${() => this.handleOidcStart('facebook')}"
        >
          <span class="oidc-logo">${iconFacebookLogo(18)}</span>
          <span>${a.facebookBtn}</span>
        </button>
      </div>

      <div class="sso-accordion">
        <button
          type="button"
          class="sso-trigger"
          ?disabled="${this.isLoading}"
          aria-expanded="${this.ssoExpanded}"
          @click="${() => (this.ssoExpanded = !this.ssoExpanded)}"
        >
          <span class="sso-trigger-left">
            ${iconBuilding(16)}
            <span>${a.ssoToggleBtn}</span>
          </span>
          <span class="sso-chevron ${this.ssoExpanded ? 'is-open' : ''}">
            ${iconChevronDown(16)}
          </span>
        </button>

        ${this.ssoExpanded
          ? html`
              <div class="sso-panel">
                <div class="field-group">
                  <label class="field-label" for="auth-sso-tenant">${a.ssoTenantLabel}</label>
                  <input
                    id="auth-sso-tenant"
                    class="native-input"
                    type="text"
                    autocomplete="organization"
                    placeholder="${a.ssoTenantPlaceholder}"
                    .value="${this.ssoTenant}"
                    ?disabled="${this.isLoading}"
                    @input="${(e: InputEvent) => {
                      this.ssoTenant = (e.target as HTMLInputElement).value;
                      this.errorMessage = '';
                    }}"
                    @keydown="${(e: KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void this.handleEnterpriseSsoSubmit();
                      }
                    }}"
                  />
                  <span class="field-hint">${a.ssoTenantHint}</span>
                </div>

                <button
                  type="button"
                  class="secondary-btn"
                  ?disabled="${this.isLoading}"
                  @click="${() => this.handleEnterpriseSsoSubmit()}"
                >
                  ${this.isLoading && this.loadingContext === 'sso'
                    ? html`<span class="btn-spinner"></span><span>${a.ssoDiscoveringBtn}</span>`
                    : html`<span>${a.ssoSubmitBtn}</span>`}
                </button>
              </div>
            `
          : ''}
      </div>

      <div class="card-footer">
        <span>${a.noAccount}</span>
        <button
          type="button"
          class="text-link-btn"
          ?disabled="${this.isLoading}"
          @click="${() => this.switchStep('register')}"
        >
          ${a.createAccountLink}
        </button>
      </div>
    `;
  }

  private renderRegisterStep(t: ReturnType<typeof getTranslation>) {
    const a = t.viewTexts.auth;
    const len = this.regPassword.length;
    const hasMixed = /[A-Z]/.test(this.regPassword) && /[0-9!@#$%^&*]/.test(this.regPassword);
    const strengthClass = len >= 10 && hasMixed ? 'is-strong' : len >= 7 ? 'is-medium' : 'is-weak';
    const strengthLabel =
      strengthClass === 'is-strong'
        ? a.pwStrengthStrong
        : strengthClass === 'is-medium'
        ? a.pwStrengthMedium
        : a.pwStrengthWeak;

    return html`
      <div class="card-header">
        <span class="step-indicator">${a.stepBadge1}</span>
        <h2 class="card-title">${a.registerTitle}</h2>
        <p class="card-subtitle">${a.registerSubtitle}</p>
      </div>

      <form class="auth-form" @submit="${this.handleRegisterSubmit}" novalidate>
        <div class="field-group">
          <label class="field-label" for="reg-name">${a.fullNameLabel}</label>
          <input
            id="reg-name"
            class="native-input"
            type="text"
            autocomplete="name"
            placeholder="${a.fullNamePlaceholder}"
            .value="${this.regName}"
            ?disabled="${this.isLoading}"
            @input="${(e: InputEvent) => {
              this.regName = (e.target as HTMLInputElement).value;
              this.errorMessage = '';
            }}"
          />
        </div>

        <div class="field-group">
          <label class="field-label" for="reg-email">${a.emailLabel}</label>
          <input
            id="reg-email"
            class="native-input"
            type="email"
            autocomplete="email"
            placeholder="${a.emailPlaceholder}"
            .value="${this.regEmail}"
            ?disabled="${this.isLoading}"
            @input="${(e: InputEvent) => {
              this.regEmail = (e.target as HTMLInputElement).value;
              this.errorMessage = '';
            }}"
          />
        </div>

        <div class="field-group">
          <label class="field-label" for="reg-password">${a.passwordLabel}</label>
          <div class="input-wrap">
            <input
              id="reg-password"
              class="native-input has-toggle"
              type="${this.showRegPassword ? 'text' : 'password'}"
              autocomplete="new-password"
              placeholder="${a.passwordPlaceholder}"
              .value="${this.regPassword}"
              ?disabled="${this.isLoading}"
              @input="${(e: InputEvent) => {
                this.regPassword = (e.target as HTMLInputElement).value;
                this.errorMessage = '';
              }}"
            />
            <button
              type="button"
              class="pw-toggle-btn"
              ?disabled="${this.isLoading}"
              aria-label="${this.showRegPassword ? a.hidePasswordAria : a.showPasswordAria}"
              @click="${() => (this.showRegPassword = !this.showRegPassword)}"
            >
              ${this.showRegPassword ? iconEyeOff(16) : iconEye(16)}
            </button>
          </div>
          ${this.regPassword
            ? html`
                <div class="pw-strength-wrap">
                  <div class="pw-strength-bar">
                    <div class="pw-strength-fill ${strengthClass}"></div>
                  </div>
                  <span class="pw-strength-text">${strengthLabel}</span>
                </div>
              `
            : ''}
        </div>

        <div class="field-group">
          <label class="field-label" for="reg-confirm">${a.confirmPasswordLabel}</label>
          <input
            id="reg-confirm"
            class="native-input"
            type="${this.showRegPassword ? 'text' : 'password'}"
            autocomplete="new-password"
            placeholder="${a.passwordPlaceholder}"
            .value="${this.regConfirmPassword}"
            ?disabled="${this.isLoading}"
            @input="${(e: InputEvent) => {
              this.regConfirmPassword = (e.target as HTMLInputElement).value;
              this.errorMessage = '';
            }}"
          />
        </div>

        <app-checkbox
          .checked="${this.regEnable2FA}"
          ?disabled="${this.isLoading}"
          label="${a.enable2faOpt}"
          @change="${(e: CustomEvent<{ checked: boolean }>) => {
            this.regEnable2FA = e.detail.checked;
          }}"
        ></app-checkbox>

        <button type="submit" class="primary-btn" ?disabled="${this.isLoading}">
          ${this.isLoading && this.loadingContext === 'register'
            ? html`<span class="btn-spinner"></span><span>${a.registeringBtn}</span>`
            : html`<span>${a.registerSubmitBtn}</span>`}
        </button>
      </form>

      <div class="card-footer">
        <span>${a.hasAccount}</span>
        <button
          type="button"
          class="text-link-btn"
          ?disabled="${this.isLoading}"
          @click="${() => this.switchStep('login')}"
        >
          ${a.backToLoginLink}
        </button>
      </div>
    `;
  }

  private renderForgotStep(t: ReturnType<typeof getTranslation>) {
    const a = t.viewTexts.auth;

    return html`
      <div class="card-header">
        <span class="step-indicator">${a.stepBadge1}</span>
        <h2 class="card-title">${a.forgotTitle}</h2>
        <p class="card-subtitle">${a.forgotSubtitle}</p>
      </div>

      ${this.forgotSentTo
        ? html`
            <div class="alert-banner is-success" role="status">
              <span class="alert-icon">${iconCheck(16)}</span>
              <div style="display:flex;flex-direction:column;gap:0.25rem;">
                <strong>${a.forgotSentTitle}</strong>
                <span>${a.forgotSentDesc(this.forgotSentTo)}</span>
              </div>
            </div>
          `
        : html`
            <form class="auth-form" @submit="${this.handleForgotSubmit}" novalidate>
              <div class="field-group">
                <label class="field-label" for="forgot-email">${a.emailLabel}</label>
                <input
                  id="forgot-email"
                  class="native-input"
                  type="email"
                  autocomplete="email"
                  placeholder="${a.emailPlaceholder}"
                  .value="${this.forgotEmail}"
                  ?disabled="${this.isLoading}"
                  @input="${(e: InputEvent) => {
                    this.forgotEmail = (e.target as HTMLInputElement).value;
                    this.errorMessage = '';
                  }}"
                />
              </div>

              <button type="submit" class="primary-btn" ?disabled="${this.isLoading}">
                ${this.isLoading && this.loadingContext === 'forgot'
                  ? html`<span class="btn-spinner"></span><span>${a.forgotSendingBtn}</span>`
                  : html`<span>${a.forgotSubmitBtn}</span>`}
              </button>
            </form>
          `}

      <div class="card-footer" style="justify-content:flex-start;">
        <button
          type="button"
          class="back-btn"
          ?disabled="${this.isLoading}"
          @click="${() => this.switchStep('login')}"
        >
          ${iconArrowLeft(15)}
          <span>${a.backToLoginLink}</span>
        </button>
      </div>
    `;
  }

  private renderTwoFactorStep(t: ReturnType<typeof getTranslation>) {
    const a = t.viewTexts.auth;
    const ctx = this.pending2fa;
    if (!ctx) return '';

    const providerLabel = ctx.tenantId
      ? `${a.providers[ctx.provider]} (${ctx.tenantId})`
      : a.providers[ctx.provider];

    return html`
      <div class="card-header">
        <span class="step-indicator is-2fa">${a.stepBadge2}</span>
        <h2 class="card-title">${a.twoFactorTitle}</h2>
        <p class="card-subtitle">${a.twoFactorSubtitle(ctx.maskedEmail, providerLabel)}</p>
      </div>

      <div class="twofa-context-card">
        <span class="twofa-context-icon">${iconShieldCheck(18)}</span>
        <div class="twofa-context-info">
          <span class="twofa-masked-email">${ctx.maskedEmail}</span>
          <span class="twofa-provider-label">${providerLabel}</span>
        </div>
      </div>

      <form class="auth-form" @submit="${this.handleTwoFactorVerify}" novalidate>
        ${!this.useRecoveryCode
          ? html`
              <app-otp-input
                autofocus
                .value="${this.otpCode}"
                ?disabled="${this.isLoading}"
                ?error="${Boolean(this.errorMessage)}"
                @otp-change="${(e: CustomEvent<{ value: string }>) => {
                  this.otpCode = e.detail.value;
                  this.errorMessage = '';
                }}"
                @otp-complete="${(e: CustomEvent<{ value: string }>) => {
                  this.otpCode = e.detail.value;
                  void this.handleTwoFactorVerify();
                }}"
              ></app-otp-input>

              <div class="totp-helper">
                <div class="totp-helper-header">
                  <button
                    type="button"
                    class="text-link-btn"
                    @click="${() => (this.showTotpHelper = !this.showTotpHelper)}"
                  >
                    ${this.showTotpHelper ? a.totpHelperHide : a.totpHelperToggle}
                  </button>
                  <span class="totp-meta" style="display:inline-flex;align-items:center;gap:0.25rem;">
                    ${iconClock(12)}
                    <span>${a.totpSecondsLeft(this.totpSecondsLeft)}</span>
                  </span>
                </div>

                ${this.showTotpHelper
                  ? html`
                      <div class="totp-helper-row">
                        <div style="display:flex;align-items:center;gap:0.45rem;">
                          <span class="totp-meta">${a.totpLiveCodeLabel}</span>
                          <span class="totp-code-pill">${this.liveTotpCode}</span>
                        </div>
                        <button
                          type="button"
                          class="totp-fill-btn"
                          ?disabled="${this.isLoading}"
                          @click="${() => {
                            this.otpCode = this.liveTotpCode;
                            void this.handleTwoFactorVerify();
                          }}"
                        >
                          ${a.totpQuickFill}
                        </button>
                      </div>
                    `
                  : ''}
              </div>
            `
          : html`
              <div class="field-group">
                <label class="field-label" for="auth-recovery">${a.recoveryCodeLabel}</label>
                <input
                  id="auth-recovery"
                  class="native-input is-mono"
                  type="text"
                  autocomplete="off"
                  placeholder="${a.recoveryCodePlaceholder}"
                  .value="${this.recoveryCode}"
                  ?disabled="${this.isLoading}"
                  @input="${(e: InputEvent) => {
                    this.recoveryCode = (e.target as HTMLInputElement).value;
                    this.errorMessage = '';
                  }}"
                />
                <span class="field-hint">${a.recoveryHint}</span>
              </div>
            `}

        <app-checkbox
          .checked="${this.trustDevice}"
          ?disabled="${this.isLoading}"
          label="${a.trustDevice}"
          @change="${(e: CustomEvent<{ checked: boolean }>) => {
            this.trustDevice = e.detail.checked;
          }}"
        ></app-checkbox>

        <button type="submit" class="primary-btn" ?disabled="${this.isLoading}">
          ${this.isLoading && this.loadingContext === '2fa'
            ? html`<span class="btn-spinner"></span><span>${a.verifyingOtpBtn}</span>`
            : html`<span>${a.verifyOtpBtn}</span>`}
        </button>
      </form>

      <div class="twofa-links">
        <button
          type="button"
          class="text-link-btn"
          ?disabled="${this.isLoading}"
          @click="${() => {
            this.useRecoveryCode = !this.useRecoveryCode;
            this.errorMessage = '';
          }}"
        >
          ${this.useRecoveryCode ? a.useTotpBtn : a.useRecoveryBtn}
        </button>

        <button
          type="button"
          class="back-btn"
          ?disabled="${this.isLoading}"
          @click="${() => {
            this.pending2fa = null;
            this.switchStep('login');
          }}"
        >
          ${iconArrowLeft(15)}
          <span>${a.backToStep1Btn}</span>
        </button>
      </div>
    `;
  }

  private renderOidcConsentOverlay(t: ReturnType<typeof getTranslation>) {
    const prompt = this.pendingOidcConsent;
    if (!prompt) return '';
    const a = t.viewTexts.auth;
    const providerName = prompt.tenantOrEmail
      ? `${a.providers[prompt.provider]} • ${prompt.tenantOrEmail}`
      : a.providers[prompt.provider];

    const logo =
      prompt.provider === 'google'
        ? iconGoogleLogo(28)
        : prompt.provider === 'microsoft'
        ? iconMicrosoftLogo(28)
        : prompt.provider === 'facebook'
        ? iconFacebookLogo(28)
        : iconBuilding(26);

    return html`
      <div class="oidc-consent-overlay" role="dialog" aria-modal="true" aria-label="${a.oidcModalTitle}">
        <div class="oidc-consent-top">
          <span class="oidc-consent-icon">${logo}</span>
          <h3 class="card-title" style="font-size:1.15rem;">${a.oidcModalTitle}</h3>
          <p class="card-subtitle">${a.oidcModalDesc(providerName, prompt.email)}</p>
          <div class="oidc-scope-box">${a.oidcScopeLabel}</div>
        </div>

        <div class="oidc-consent-actions">
          <button
            type="button"
            class="primary-btn"
            ?disabled="${this.isLoading}"
            @click="${() => this.confirmOidcConsent()}"
          >
            ${this.isLoading
              ? html`<span class="btn-spinner"></span><span>${a.verifyingBtn}</span>`
              : html`<span>${a.oidcAuthorizeBtn}</span>`}
          </button>

          <button
            type="button"
            class="ghost-danger-btn"
            ?disabled="${this.isLoading}"
            @click="${() => this.cancelOidcConsent()}"
          >
            ${a.oidcCancelBtn}
          </button>
        </div>
      </div>
    `;
  }
}
