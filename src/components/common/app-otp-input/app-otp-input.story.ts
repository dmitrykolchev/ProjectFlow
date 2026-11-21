import { html } from 'lit';
import { ComponentStoryMeta } from '../../../types/storybook';
import './app-otp-input';

const meta: ComponentStoryMeta = {
  title: 'Common/OtpInput',
  component: 'app-otp-input',
  category: 'Common',
  description:
    '6-cell numeric OTP / TOTP input with mobile autofill (autocomplete="one-time-code"), multi-digit clipboard paste, keyboard navigation, and automatic completion dispatch.',
  propsDoc: {
    length: 'Number of verification code cells (default 6).',
    value: 'Current numeric code string.',
    disabled: 'Disables all cells while verifying.',
    error: 'Highlights cells in danger palette and plays shake feedback.',
    autofocus: 'Automatically focuses the first cell on mount.',
  },
  eventsDoc: {
    'otp-change': {
      detail: '{ value: string }',
      description: 'Fires when a digit is entered',
    },
    'otp-complete': {
      detail: '{ value: string }',
      description: 'Fires when all cells are filled',
    },
  },
  stories: [
    {
      name: 'Default 6-Digit Input',
      description: 'Supports typing, arrow keys, backspace navigation, and pasting e.g. 482910.',
      render: () => html`
        <div style="max-width: 340px;">
          <app-otp-input value="48"></app-otp-input>
        </div>
      `,
    },
    {
      name: 'Complete Code',
      render: () => html`
        <div style="max-width: 340px;">
          <app-otp-input value="482910"></app-otp-input>
        </div>
      `,
    },
    {
      name: 'Validation Error',
      render: () => html`
        <div style="max-width: 340px;">
          <app-otp-input value="000000" error></app-otp-input>
        </div>
      `,
    },
    {
      name: 'Disabled / Verifying',
      render: () => html`
        <div style="max-width: 340px;">
          <app-otp-input value="123456" disabled></app-otp-input>
        </div>
      `,
    },
  ],
};

export default meta;
