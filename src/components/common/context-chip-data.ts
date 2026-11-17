import { store } from '../../state/store';
import { getTranslation } from '../../i18n';

export type ContextChipKind = 'requirement' | 'knowledge' | 'document';
export type ContextMatchReason = 'direct' | 'project' | 'company' | 'keyword' | 'manual';

export interface ContextChipData {
  key: string;
  kind: ContextChipKind;
  id: string;
  title: string;
  reason?: ContextMatchReason;
  selected?: boolean;
}

/** Navigate the app to the entity behind a context chip. */
export function openContextSource(item: { kind: ContextChipKind; id: string }): void {
  if (item.kind === 'requirement') {
    store.openRequirementDetail(item.id);
    return;
  }
  if (item.kind === 'knowledge') {
    const art = store.knowledgeArticles.find((a) => a.id === item.id);
    store.openKnowledgeBase({
      scope: art?.scope || 'all',
      projectId: art?.projectId || 'all',
      companyId: art?.companyId || 'all',
      articleId: item.id,
    });
  } else {
    const doc = store.documents.find((d) => d.id === item.id);
    store.openDocuments({
      scope: doc?.scope || 'all',
      projectId: doc?.projectId || 'all',
      companyId: doc?.companyId || 'all',
    });
  }
}

/** Human-readable match reason label for a context chip. */
export function contextReasonLabel(reason: ContextMatchReason, t: ReturnType<typeof getTranslation>): string {
  switch (reason) {
    case 'direct':
      return t.viewTexts.ai.contextDirectMatch;
    case 'project':
      return t.viewTexts.ai.contextProjectMatch;
    case 'company':
      return t.viewTexts.ai.contextCompanyMatch;
    case 'manual':
      return t.viewTexts.ai.contextManualMatch;
    default:
      return t.viewTexts.ai.contextKeywordMatch;
  }
}

/** Human-readable kind label for a context chip. */
export function contextKindLabel(kind: ContextChipKind, t: ReturnType<typeof getTranslation>): string {
  if (kind === 'requirement') return t.viewTexts.ai.contextRequirementBadge;
  if (kind === 'knowledge') return t.viewTexts.ai.contextKnowledgeBadge;
  return t.viewTexts.ai.contextDocumentBadge;
}
