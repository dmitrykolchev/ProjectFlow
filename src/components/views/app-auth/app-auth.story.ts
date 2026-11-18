import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-auth';

const meta: ComponentStoryMeta = {
  title: 'Views/Auth',
  component: 'app-auth',
  category: 'Views',
  description:
    'Hybrid Authentication Flow view: local credentials with visibility toggle & password manager autofill, Google/Microsoft/Facebook OIDC, collapsible Enterprise SSO, account registration, recovery, and Step 2 TOTP 2FA.',
  propsDoc: {
    preview:
      'Runs the flow in sandboxed Storybook preview mode without overwriting the active workspace session.',
    'initial-step':
      'Initial screen step to render: "login" | "register" | "forgot" | "2fa".',
  },
  stories: [
    {
      name: 'Hybrid Sign In (Step 1)',
      description:
        'Full sign-in screen with local form, OIDC buttons, Enterprise SSO accordion, theme & language switchers.',
      render: () => html`<app-auth preview initial-step="login"></app-auth>`,
    },
    {
      name: 'Two-Factor Authentication (Step 2)',
      description:
        'Step 2 TOTP 2FA view with masked email context, 6-cell OTP input, live simulated authenticator helper, trust device checkbox, and recovery code switch.',
      render: () => html`<app-auth preview initial-step="2fa"></app-auth>`,
    },
    {
      name: 'Registration View',
      description: 'Local account registration with live password strength meter and optional 2FA enrollment.',
      render: () => html`<app-auth preview initial-step="register"></app-auth>`,
    },
  ],
};

export default meta;
