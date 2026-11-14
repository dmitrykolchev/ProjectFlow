// Centralized Lit Web Components Library
// All components encapsulate Shadow DOM styles via CSS modules and consume theme CSS variables from src/index.css.

export { AppBadge } from './app-badge/app-badge';
export type { BadgeVariant, BadgeAppearance, BadgeSize } from './app-badge/app-badge';

export { AppToggleButton } from './app-toggle-button/app-toggle-button';

export { AppCheckbox } from './app-checkbox/app-checkbox';

export { AppRadioGroup } from './app-radio-group/app-radio-group';
export type { RadioOption } from './app-radio-group/app-radio-group';

export { AppButton } from './app-button/app-button';
export type { ButtonVariant, ButtonSize } from './app-button/app-button';

export { AppButtonGroup } from './app-button-group/app-button-group';
export { AppDropdownButton } from './app-dropdown-button/app-dropdown-button';
export { AppSplitButton } from './app-split-button/app-split-button';

export { AppMenu } from './app-menu/app-menu';
export type { MenuItem } from './app-menu/app-menu';

export { AppSegmentedSwitch } from './app-segmented-switch/app-segmented-switch';
export type { SegmentedOption } from './app-segmented-switch/app-segmented-switch';

export { AppSwitch } from './app-switch/app-switch';
export { AppInput } from './app-input/app-input';
export { AppTextarea } from './app-textarea/app-textarea';
export { AppNumberInput } from './app-number-input/app-number-input';
export { AppDateInput } from './app-date-input/app-date-input';

export { AppSelect } from './app-select/app-select';
export type { SelectOption } from './app-select/app-select';

export { AppCombobox } from './app-combobox/app-combobox';

export { AppModal } from './app-modal/app-modal';
export type { ModalSize } from './app-modal/app-modal';

export { AppModalPortal, getModalPortal, portalManager } from './app-modal-portal/app-modal-portal';
export type {
  PortalLayerKind,
  PortalTemplateOptions,
  PortalElementOptions,
  PortalHandle,
} from './app-modal-portal/app-modal-portal';

export { AppToast } from './app-toast/app-toast';
export { AppActivityPanel } from './app-activity-panel/app-activity-panel';
export { AppTaskModal } from './app-task-modal/app-task-modal';
export { AppEmptyState } from './app-empty-state/app-empty-state';
export { AppPageHeader } from './app-page-header/app-page-header';

export * as icons from './icons';

import { AppBadge } from './app-badge/app-badge';
import { AppToggleButton } from './app-toggle-button/app-toggle-button';
import { AppCheckbox } from './app-checkbox/app-checkbox';
import { AppRadioGroup } from './app-radio-group/app-radio-group';
import { AppButton } from './app-button/app-button';
import { AppButtonGroup } from './app-button-group/app-button-group';
import { AppDropdownButton } from './app-dropdown-button/app-dropdown-button';
import { AppSplitButton } from './app-split-button/app-split-button';
import { AppMenu } from './app-menu/app-menu';
import { AppSegmentedSwitch } from './app-segmented-switch/app-segmented-switch';
import { AppSwitch } from './app-switch/app-switch';
import { AppInput } from './app-input/app-input';
import { AppTextarea } from './app-textarea/app-textarea';
import { AppNumberInput } from './app-number-input/app-number-input';
import { AppDateInput } from './app-date-input/app-date-input';
import { AppSelect } from './app-select/app-select';
import { AppCombobox } from './app-combobox/app-combobox';
import { AppModal } from './app-modal/app-modal';
import { AppModalPortal } from './app-modal-portal/app-modal-portal';
import { AppToast } from './app-toast/app-toast';
import { AppActivityPanel } from './app-activity-panel/app-activity-panel';
import { AppTaskModal } from './app-task-modal/app-task-modal';
import { AppEmptyState } from './app-empty-state/app-empty-state';
import { AppPageHeader } from './app-page-header/app-page-header';

export const UI_LIBRARY_ELEMENTS = {
  'app-badge': AppBadge,
  'app-toggle-button': AppToggleButton,
  'app-checkbox': AppCheckbox,
  'app-radio-group': AppRadioGroup,
  'app-button': AppButton,
  'app-button-group': AppButtonGroup,
  'app-dropdown-button': AppDropdownButton,
  'app-split-button': AppSplitButton,
  'app-menu': AppMenu,
  'app-segmented-switch': AppSegmentedSwitch,
  'app-switch': AppSwitch,
  'app-input': AppInput,
  'app-textarea': AppTextarea,
  'app-number-input': AppNumberInput,
  'app-date-input': AppDateInput,
  'app-select': AppSelect,
  'app-combobox': AppCombobox,
  'app-modal': AppModal,
  'app-modal-portal': AppModalPortal,
  'app-toast': AppToast,
  'app-activity-panel': AppActivityPanel,
  'app-task-modal': AppTaskModal,
  'app-empty-state': AppEmptyState,
  'app-page-header': AppPageHeader,
} as const;

export function getRegisteredUiElements(): string[] {
  return Object.keys(UI_LIBRARY_ELEMENTS).filter((tag) => Boolean(customElements.get(tag)));
}
