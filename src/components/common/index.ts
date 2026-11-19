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

export { AppLink } from './app-link/app-link';
export { CardFooter } from './card-footer/card-footer';
export type { LinkVariant, LinkSize } from './app-link/app-link';

export { AppButtonGroup } from './app-button-group/app-button-group';
export { AppDropdownButton } from './app-dropdown-button/app-dropdown-button';
export { AppSplitButton } from './app-split-button/app-split-button';

export { AppMenu } from './app-menu/app-menu';
export type { MenuItem } from './app-menu/app-menu';
export { AppMenuItem } from './app-menu-item/app-menu-item';
export { AppMenuHeader } from './app-menu-header/app-menu-header';
export { AppMenuDivider } from './app-menu-divider/app-menu-divider';

export { AppSegmentedSwitch } from './app-segmented-switch/app-segmented-switch';
export type { SegmentedOption } from './app-segmented-switch/app-segmented-switch';

export { AppSwitch } from './app-switch/app-switch';
export { AppInput } from './app-input/app-input';
export { AppOtpInput } from './app-otp-input/app-otp-input';
export { AppTextarea } from './app-textarea/app-textarea';
export { AppNumberInput } from './app-number-input/app-number-input';
export { AppDateInput } from './app-date-input/app-date-input';

export { AppSelect } from './app-select/app-select';
export type { SelectOption } from './app-select/app-select';

export { AppOption } from './app-option/app-option';
export type { DeclarativeOption, OptionDataSource } from './app-option/app-option';
export { AppMetaItem } from './app-meta-item/app-meta-item';
export type { DeclarativeMetaItem } from './app-meta-item/app-meta-item';

export { AppEntitySelector } from './app-entity-selector/app-entity-selector';
export type { EntitySelectorOption, EntitySelectorSize } from './app-entity-selector/app-entity-selector';

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
export { AppKpiStrip } from './app-kpi-strip/app-kpi-strip';
export { AppSectionCard } from './app-section-card/app-section-card';
export { AppMetaGrid, type MetaItem } from './app-meta-grid/app-meta-grid';
export { AppStatusChip } from './app-status-chip/app-status-chip';
export { AppFilterBar, type FilterDef } from './app-filter-bar/app-filter-bar';
export { AppFormGrid } from './app-form-grid/app-form-grid';
export { AppConfirmDialog } from './app-confirm-dialog/app-confirm-dialog';
export { AppProgressBar, type ProgressSegment } from './app-progress-bar/app-progress-bar';
export { AppAvatar } from './app-avatar/app-avatar';
export { AppPersona } from './app-persona/app-persona';
export { AppMoney, formatMoney, formatMoneyShort } from './app-money/app-money';
export { AppPagination } from './app-pagination/app-pagination';
export type { PaginationVariant } from './app-pagination/app-pagination';
export { AppFileDropzone } from './app-file-dropzone/app-file-dropzone';
export { AppDocumentPreviewer } from './app-document-previewer/app-document-previewer';
export { AppTaskAiPanel } from './app-task-ai-panel/app-task-ai-panel';
export { AppProjectRequirements } from './app-project-requirements/app-project-requirements';
export { AppDataGridColumn } from './app-data-grid-column/app-data-grid-column';
export type { DataGridCellType, DataGridCellTemplate } from './app-data-grid-column/app-data-grid-column';
export { AppBankRequisites } from './app-bank-requisites/app-bank-requisites';
export { AppCounterpartyContacts } from './app-counterparty-contacts/app-counterparty-contacts';
export {
  AppProjectAttachments,
  commitPendingAttachments,
  type PendingAttachmentFile,
  type AttachmentsChangeDetail,
} from './app-project-attachments/app-project-attachments';
export { AppDirectoryRecordModal } from './app-directory-record-modal/app-directory-record-modal';
export { AppReminderForm } from './app-reminder-form/app-reminder-form';
export { AppEntityReminders } from './app-entity-reminders/app-entity-reminders';
export { AppTableScroll, type SortDirection, type SortChangeDetail } from './app-table-scroll/app-table-scroll';
export {
  AppTableColumn,
  type TableCellType,
  type CellAlign,
  type CellRenderFn,
  type ColumnOption,
} from './app-table-column/app-table-column';
export {
  paginateItems,
  TABLE_PAGE_SIZE_OPTIONS,
  CARD_GRID_PAGE_SIZE_OPTIONS,
  type PaginationLayoutMode,
  type PaginatedSlice,
} from './paginate';

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
import { AppMenuItem } from './app-menu-item/app-menu-item';
import { AppMenuHeader } from './app-menu-header/app-menu-header';
import { AppMenuDivider } from './app-menu-divider/app-menu-divider';
import { AppSegmentedSwitch } from './app-segmented-switch/app-segmented-switch';
import { AppSwitch } from './app-switch/app-switch';
import { AppInput } from './app-input/app-input';
import { AppOtpInput } from './app-otp-input/app-otp-input';
import { AppTextarea } from './app-textarea/app-textarea';
import { AppNumberInput } from './app-number-input/app-number-input';
import { AppDateInput } from './app-date-input/app-date-input';
import { AppSelect } from './app-select/app-select';
import { AppEntitySelector } from './app-entity-selector/app-entity-selector';
import { AppCombobox } from './app-combobox/app-combobox';
import { AppModal } from './app-modal/app-modal';
import { AppModalPortal } from './app-modal-portal/app-modal-portal';
import { AppToast } from './app-toast/app-toast';
import { AppActivityPanel } from './app-activity-panel/app-activity-panel';
import { AppTaskModal } from './app-task-modal/app-task-modal';
import { AppEmptyState } from './app-empty-state/app-empty-state';
import { AppPageHeader } from './app-page-header/app-page-header';
import { AppKpiStrip } from './app-kpi-strip/app-kpi-strip';
import { AppSectionCard } from './app-section-card/app-section-card';
import { AppMetaGrid } from './app-meta-grid/app-meta-grid';
import { AppStatusChip } from './app-status-chip/app-status-chip';
import { AppFilterBar } from './app-filter-bar/app-filter-bar';
import { AppFormGrid } from './app-form-grid/app-form-grid';
import { AppConfirmDialog } from './app-confirm-dialog/app-confirm-dialog';
import { AppProgressBar } from './app-progress-bar/app-progress-bar';
import { AppAvatar } from './app-avatar/app-avatar';
import { AppPersona } from './app-persona/app-persona';
import { AppMoney } from './app-money/app-money';
import { AppPagination } from './app-pagination/app-pagination';
import { AppFileDropzone } from './app-file-dropzone/app-file-dropzone';
import { AppDocumentPreviewer } from './app-document-previewer/app-document-previewer';
import { AppTaskAiPanel } from './app-task-ai-panel/app-task-ai-panel';
import { AppProjectRequirements } from './app-project-requirements/app-project-requirements';
import { AppDataGridColumn } from './app-data-grid-column/app-data-grid-column';
import { AppBankRequisites } from './app-bank-requisites/app-bank-requisites';
import { AppCounterpartyContacts } from './app-counterparty-contacts/app-counterparty-contacts';
import { AppProjectAttachments } from './app-project-attachments/app-project-attachments';
import { AppDirectoryRecordModal } from './app-directory-record-modal/app-directory-record-modal';
import { AppReminderForm } from './app-reminder-form/app-reminder-form';
import { AppEntityReminders } from './app-entity-reminders/app-entity-reminders';
import { AppTableScroll } from './app-table-scroll/app-table-scroll';
import { AppTableColumn } from './app-table-column/app-table-column';

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
  'app-menu-item': AppMenuItem,
  'app-menu-header': AppMenuHeader,
  'app-menu-divider': AppMenuDivider,
  'app-segmented-switch': AppSegmentedSwitch,
  'app-switch': AppSwitch,
  'app-input': AppInput,
  'app-otp-input': AppOtpInput,
  'app-textarea': AppTextarea,
  'app-number-input': AppNumberInput,
  'app-date-input': AppDateInput,
  'app-select': AppSelect,
  'app-entity-selector': AppEntitySelector,
  'app-combobox': AppCombobox,
  'app-modal': AppModal,
  'app-modal-portal': AppModalPortal,
  'app-toast': AppToast,
  'app-activity-panel': AppActivityPanel,
  'app-task-modal': AppTaskModal,
  'app-empty-state': AppEmptyState,
  'app-page-header': AppPageHeader,
  'app-kpi-strip': AppKpiStrip,
  'app-section-card': AppSectionCard,
  'app-meta-grid': AppMetaGrid,
  'app-status-chip': AppStatusChip,
  'app-filter-bar': AppFilterBar,
  'app-form-grid': AppFormGrid,
  'app-confirm-dialog': AppConfirmDialog,
  'app-progress-bar': AppProgressBar,
  'app-avatar': AppAvatar,
  'app-persona': AppPersona,
  'app-money': AppMoney,
  'app-pagination': AppPagination,
  'app-file-dropzone': AppFileDropzone,
  'app-document-previewer': AppDocumentPreviewer,
  'app-task-ai-panel': AppTaskAiPanel,
  'app-project-requirements': AppProjectRequirements,
  'app-data-grid-column': AppDataGridColumn,
  'app-bank-requisites': AppBankRequisites,
  'app-counterparty-contacts': AppCounterpartyContacts,
  'app-project-attachments': AppProjectAttachments,
  'app-directory-record-modal': AppDirectoryRecordModal,
  'app-reminder-form': AppReminderForm,
  'app-entity-reminders': AppEntityReminders,
  'app-table-scroll': AppTableScroll,
  'app-table-column': AppTableColumn,
} as const;

export function getRegisteredUiElements(): string[] {
  return Object.keys(UI_LIBRARY_ELEMENTS).filter((tag) => Boolean(customElements.get(tag)));
}
