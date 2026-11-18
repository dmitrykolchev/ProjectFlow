import { LitElement, TemplateResult, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import {
  KnowledgeArticle,
  KnowledgeArticleStatus,
  KnowledgeCategory,
  KnowledgeScope,
} from '../../../types';
import {
  iconArrowUpRight,
  iconBookOpen,
  iconBuilding,
  iconEdit,
  iconFolder,
  iconPin,
  iconPlus,
  iconSearch,
  iconShieldCheck,
  iconThumbsUp,
  iconTrash,
} from '../../common/icons';
import '../../common/app-button/app-button';
import '../../common/app-link/app-link';
import '../../common/app-markdown/app-markdown';
import '../../common/app-input/app-input';
import '../../common/app-modal/app-modal';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-select/app-select';
import '../../common/app-textarea/app-textarea';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-page-header/app-page-header';
import styles from './app-knowledge-base.css';
import { eventValue } from '../../common/event-value';

@customElement('app-knowledge-base')
export class AppKnowledgeBase extends LitElement {
  @state() private articles: KnowledgeArticle[] = store.knowledgeArticles;
  @state() private currentLang = store.customization.language;
  @state() private detailKnowledgeId = store.detailKnowledgeId;
  @state() private scopeFilter: 'all' | KnowledgeScope = store.knowledgeFilterScope;
  @state() private projectFilter: string = store.knowledgeFilterProjectId;
  @state() private companyFilter: string = store.knowledgeFilterCompanyId;
  @state() private categoryFilter: 'all' | KnowledgeCategory = 'all';
  @state() private statusFilter: 'all' | KnowledgeArticleStatus = 'all';
  @state() private localSearch = '';
  @state() private globalSearch = store.searchQuery;

  // Editor Modal state
  @state() private modalOpen = false;
  @state() private editingArticleId: string | null = null;
  @state() private editorTab: 'write' | 'preview' = 'write';
  @state() private formTitle = '';
  @state() private formSummary = '';
  @state() private formContent = '';
  @state() private formScope: KnowledgeScope = 'project';
  @state() private formProjectId = '';
  @state() private formCompanyId = '';
  @state() private formCategory: KnowledgeCategory = 'architecture';
  @state() private formStatus: KnowledgeArticleStatus = 'published';
  @state() private formTags = '';
  @state() private formLinkedTasks = '';
  @state() private formAuthorId = '';
  @state() private formReviewerId = '';
  @state() private formRevisionSummary = '';
  @state() private formError = '';

  @state() private deletingArticle: KnowledgeArticle | null = null;

  private unsubscribe?: () => void;

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    this.syncState();
    this.unsubscribe = store.subscribe(() => this.syncState());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.unsubscribe) this.unsubscribe();
  }

  private syncState() {
    this.articles = store.knowledgeArticles;
    this.currentLang = store.customization.language;
    this.scopeFilter = store.knowledgeFilterScope;
    this.projectFilter = store.knowledgeFilterProjectId;
    this.companyFilter = store.knowledgeFilterCompanyId;
    this.globalSearch = store.searchQuery;

    if (store.detailKnowledgeId && this.articles.some((a) => a.id === store.detailKnowledgeId)) {
      this.detailKnowledgeId = store.detailKnowledgeId;
    } else if (!this.detailKnowledgeId || !this.articles.some((a) => a.id === this.detailKnowledgeId)) {
      this.detailKnowledgeId = this.articles[0]?.id || '';
    }
  }

  private getFilteredArticles(): KnowledgeArticle[] {
    const q = (this.localSearch || this.globalSearch).trim().toLowerCase();

    return this.articles
      .filter((art) => {
        if (this.scopeFilter !== 'all' && art.scope !== this.scopeFilter) return false;
        if (this.projectFilter !== 'all' && art.projectId !== this.projectFilter) return false;
        if (this.companyFilter !== 'all' && art.companyId !== this.companyFilter) return false;
        if (this.categoryFilter !== 'all' && art.category !== this.categoryFilter) return false;
        if (this.statusFilter !== 'all' && art.status !== this.statusFilter) return false;

        if (!q) return true;
        const proj = art.projectId ? store.projects.find((p) => p.id === art.projectId) : null;
        const comp = art.companyId ? store.companies.find((c) => c.id === art.companyId) : null;
        const haystack = [
          art.title,
          art.summary,
          art.content,
          art.tags.join(' '),
          (art.linkedTaskIds || []).join(' '),
          proj?.name || '',
          proj?.key || '',
          comp?.name || '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }

  private formatDate(iso: string): string {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return iso;
    return new Date(ms).toLocaleDateString(getTranslation(this.currentLang).common.locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private toggleChecklistLine(article: KnowledgeArticle, lineIdx: number) {
    const lines = article.content.split('\n');
    const target = lines[lineIdx];
    if (!target) return;
    if (/^- \[ \] /.test(target.trim())) {
      lines[lineIdx] = target.replace('- [ ] ', '- [x] ');
    } else if (/^- \[[xX]\] /.test(target.trim())) {
      lines[lineIdx] = target.replace(/- \[[xX]\] /, '- [ ] ');
    } else {
      return;
    }
    store.updateKnowledgeArticle(
      { ...article, content: lines.join('\n') },
      getTranslation(this.currentLang).viewTexts.knowledgeBase.checklistUpdateNote
    );
  }

  render() {
    const t = getTranslation(this.currentLang);
    const kb = t.knowledgeBase;

    const filtered = this.getFilteredArticles();
    const selectedArticle =
      filtered.find((a) => a.id === this.detailKnowledgeId) || filtered[0] || null;

    const totalCount = this.articles.length;
    const verifiedCount = this.articles.filter((a) => a.status === 'verified').length;
    const lessonsCount = this.articles.filter(
      (a) => a.category === 'postmortem' || a.category === 'playbook' || a.category === 'decision'
    ).length;
    const coveredProjects = new Set(this.articles.map((a) => a.projectId).filter(Boolean)).size;
    const coveredCompanies = new Set(this.articles.map((a) => a.companyId).filter(Boolean)).size;

    const projectOptions = [
      { value: 'all', label: kb.allProjects },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}`, color: p.color })),
    ];

    const companyOptions = [
      { value: 'all', label: kb.allCompanies },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];

    const categoryOptions = [
      { value: 'all', label: kb.allCategories },
      ...(Object.keys(kb.categories) as KnowledgeCategory[]).map((cat) => ({
        value: cat,
        label: kb.categories[cat],
      })),
    ];

    const statusOptions = [
      { value: 'all', label: kb.allStatuses },
      ...(Object.keys(kb.statuses) as KnowledgeArticleStatus[]).map((st) => ({
        value: st,
        label: kb.statuses[st],
      })),
    ];

    const hasActiveFilters =
      this.scopeFilter !== 'all' ||
      this.projectFilter !== 'all' ||
      this.companyFilter !== 'all' ||
      this.categoryFilter !== 'all' ||
      this.statusFilter !== 'all' ||
      Boolean(this.localSearch.trim());

    return html`
      <div class="kb-shell">
        <app-page-header title="${kb.title}" subtitle="${kb.subtitle}">
          <span slot="icon">${iconBookOpen(28)}</span>
          <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
            <span slot="icon-start">${iconPlus(16)}</span>
            <span>${kb.newArticle}</span>
          </app-button>
        </app-page-header>

        <!-- 4-Cell Summary Strip -->
        <div class="kpi-strip">
          <div class="kpi-cell">
            <span class="kpi-label">${kb.totalArticles}</span>
            <span class="kpi-value">${totalCount}</span>
          </div>
          <div class="kpi-cell">
            <span class="kpi-label">${kb.verifiedArticles}</span>
            <span class="kpi-value" style="color: var(--color-success, #10b981);">${verifiedCount}</span>
          </div>
          <div class="kpi-cell">
            <span class="kpi-label">${kb.lessonsAndPostmortems}</span>
            <span class="kpi-value">${lessonsCount}</span>
          </div>
          <div class="kpi-cell">
            <span class="kpi-label">${kb.coverageLabel}</span>
            <span class="kpi-value">${coveredProjects} / ${coveredCompanies}</span>
          </div>
        </div>

        <!-- Filters -->
        <div class="kb-toolbar">
          <div class="toolbar-left">
            <div class="toolbar-search">
              <app-input
                size="sm"
                placeholder="${kb.searchPlaceholder}"
                .value="${this.localSearch}"
                clearable
                @input="${(e: CustomEvent<{ value: string }>) => (this.localSearch = eventValue(e))}"
              >
                <span slot="icon">${iconSearch(14)}</span>
              </app-input>
            </div>

            <app-segmented-switch
              size="sm"
              .value="${this.scopeFilter}"
              .options="${[
                { value: 'all', label: kb.scopeAll },
                { value: 'project', label: kb.scopeProject },
                { value: 'company', label: kb.scopeCompany },
                { value: 'general', label: kb.scopeGeneral },
              ]}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                const nextScope = eventValue(e) as 'all' | KnowledgeScope;
                store.setKnowledgeFilters({
                  scope: nextScope,
                  projectId: nextScope === 'company' || nextScope === 'general' ? 'all' : this.projectFilter,
                  companyId: nextScope === 'general' ? 'all' : this.companyFilter,
                });
              }}"
            ></app-segmented-switch>
          </div>

          <div class="toolbar-filters">
            <div class="filter-select">
              <app-select
                size="sm"
                .value="${this.projectFilter}"
                .options="${projectOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  store.setKnowledgeFilters({ projectId: eventValue(e) })}"
              ></app-select>
            </div>
            <div class="filter-select">
              <app-select
                size="sm"
                .value="${this.companyFilter}"
                .options="${companyOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  store.setKnowledgeFilters({ companyId: eventValue(e) })}"
              ></app-select>
            </div>
            <div class="filter-select">
              <app-select
                size="sm"
                .value="${this.categoryFilter}"
                .options="${categoryOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.categoryFilter = eventValue(e) as 'all' | KnowledgeCategory)}"
              ></app-select>
            </div>
            <div class="filter-select" style="width: 150px;">
              <app-select
                size="sm"
                .value="${this.statusFilter}"
                .options="${statusOptions}"
                @change="${(e: CustomEvent<{ value: string }>) =>
                  (this.statusFilter = eventValue(e) as 'all' | KnowledgeArticleStatus)}"
              ></app-select>
            </div>
            ${hasActiveFilters
              ? html`
                  <app-button size="sm" variant="ghost" @click="${() => this.clearAllFilters()}">
                    ${kb.clearFilters}
                  </app-button>
                `
              : ''}
          </div>
        </div>

        <!-- Two-Pane Workspace -->
        <div class="kb-workspace">
          <!-- Left Pane: Articles Catalog -->
          <aside class="kb-index">
            <div class="index-head">
              <span>${t.viewTexts.knowledgeBase.docsNotesButton}</span>
              <span class="index-count">${filtered.length}</span>
            </div>

            ${filtered.length === 0
              ? html`
                  <app-empty-state title="${kb.emptyCatalog}">
                    <span slot="icon">${iconBookOpen(48)}</span>
                    <app-button slot="action" size="sm" variant="outline" @click="${() => this.clearAllFilters()}">
                      ${kb.clearFilters}
                    </app-button>
                  </app-empty-state>
                `
              : html`
                  <div class="index-list">
                    ${filtered.map((art) => {
                      const proj = art.projectId
                        ? store.projects.find((p) => p.id === art.projectId)
                        : null;
                      const comp = art.companyId
                        ? store.companies.find((c) => c.id === art.companyId)
                        : null;
                      const author = store.users.find((u) => u.id === art.authorId);
                      const isActive = selectedArticle?.id === art.id;
                      const scopeLabel = proj
                        ? proj.key
                        : comp
                        ? comp.name
                        : kb.scopes[art.scope];

                      return html`
                        <button
                          type="button"
                          class="article-row ${isActive ? 'is-active' : ''}"
                          @click="${() => {
                            this.detailKnowledgeId = art.id;
                            store.selectKnowledgeArticle(art.id);
                          }}"
                        >
                          <div class="row-kicker">
                            <div class="row-kicker-left">
                              <span class="entity-key">${scopeLabel}</span>
                              <span aria-hidden="true">·</span>
                              <span>${kb.categories[art.category]}</span>
                            </div>
                            ${art.pinned
                              ? html`<span class="pin-mark" title="${kb.pinArticle}">${iconPin(12)}</span>`
                              : ''}
                          </div>

                          <div class="row-title">${art.title}</div>
                          <div class="row-summary">${art.summary}</div>

                          <div class="row-foot">
                            <span>
                              ${author?.name || art.authorId} · ${this.formatDate(art.updatedAt)}
                            </span>
                            <span class="status-text status-${art.status}">
                              ${kb.statuses[art.status]}
                            </span>
                          </div>
                        </button>
                      `;
                    })}
                  </div>
                `}
          </aside>

          <!-- Right Pane: Article Reader -->
          <section class="kb-reader">
            ${!selectedArticle
              ? html`
                  <app-empty-state title="${filtered.length === 0 ? kb.emptyPrompt : kb.noArticleSelected}">
                    <span slot="icon">${iconBookOpen(48)}</span>
                    <app-button slot="action" variant="primary" size="sm" @click="${() => this.openCreateModal()}">
                      <span slot="icon-start">${iconPlus(14)}</span>
                      <span>${kb.newArticle}</span>
                    </app-button>
                  </app-empty-state>
                `
              : this.renderArticleReader(selectedArticle)}
          </section>
        </div>
      </div>

      ${this.renderEditorModal()}
      ${this.renderDeleteModal()}
    `;
  }

  private renderArticleReader(article: KnowledgeArticle) {
    const t = getTranslation(this.currentLang);
    const kb = t.knowledgeBase;

    const proj = article.projectId
      ? store.projects.find((p) => p.id === article.projectId)
      : null;
    const comp = article.companyId
      ? store.companies.find((c) => c.id === article.companyId)
      : null;
    const author = store.users.find((u) => u.id === article.authorId);
    const reviewer = article.reviewerId
      ? store.users.find((u) => u.id === article.reviewerId)
      : null;
    const activeUserId = store.currentUserId || store.users[0]?.id || 'user-1';
    const isHelpful = article.helpfulUserIds.includes(activeUserId);

    const linkedTasks = (article.linkedTaskIds || [])
      .map((id) => ({ id, task: store.tasks.find((tk) => tk.id === id) }))
      .filter((x) => Boolean(x.task));

    return html`
      <div class="reader-toolbar">
        <div class="reader-breadcrumbs">
          <span>${kb.scopes[article.scope]}</span>
          ${proj
            ? html`
                <span aria-hidden="true">/</span>
                <app-link
                  class="link-btn"
                  size="md"
                  variant="primary"
                  @click="${() => store.openProjectDetail(proj.id)}"
                >
                  <span slot="start">${iconFolder(13)}</span>
                  <span>${proj.key} · ${proj.name}</span>
                </app-link>
              `
            : ''}
          ${comp
            ? html`
                <span aria-hidden="true">/</span>
                <app-link
                  class="link-btn"
                  size="md"
                  variant="primary"
                  @click="${() => store.openCompanyDetail(comp.id)}"
                >
                  <span slot="start">${iconBuilding(13)}</span>
                  <span>${comp.name}</span>
                </app-link>
              `
            : ''}
          <span aria-hidden="true">·</span>
          <span>${kb.categories[article.category]}</span>
        </div>

        <div class="reader-actions">
          <app-button
            class="pin-action ${article.pinned ? 'is-active' : ''}"
            size="xs"
            variant="icon"
            title="${article.pinned ? kb.unpinArticle : kb.pinArticle}"
            @click="${() => store.togglePinKnowledgeArticle(article.id)}"
          >
            <span slot="start">${iconPin(15)}</span>
          </app-button>

          <app-button
            size="sm"
            variant="${article.status === 'verified' ? 'secondary' : 'outline'}"
            @click="${() => store.toggleVerifyKnowledgeArticle(article.id)}"
          >
            <span slot="icon-start">${iconShieldCheck(14)}</span>
            <span>${article.status === 'verified' ? kb.unverifyArticle : kb.verifyArticle}</span>
          </app-button>

          <app-button
            size="sm"
            variant="secondary"
            @click="${() => this.openEditModal(article)}"
          >
            <span slot="icon-start">${iconEdit(14)}</span>
            <span>${t.common.edit}</span>
          </app-button>

          <app-button
            action="delete"
            size="xs"
            variant="icon"
            title="${t.common.delete}"
            @click="${() => (this.deletingArticle = article)}"
          >
            <span slot="start">${iconTrash(15)}</span>
          </app-button>
        </div>
      </div>

      <article class="article-canvas">
        <header class="article-head">
          <h1 class="article-title">${article.title}</h1>

          <div class="article-meta-line">
            <span class="status-text status-${article.status}">
              ${kb.statuses[article.status]}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              ${kb.authorLabel}:
              ${author
                ? html`
                    <app-link
                      class="link-btn"
                      size="md"
                      variant="primary"
                      @click="${() => store.openEmployeeDetail(author.id)}"
                    >
                      ${author.name}
                    </app-link>
                  `
                : article.authorId}
            </span>
            ${reviewer
              ? html`
                  <span aria-hidden="true">·</span>
                  <span>
                    ${kb.reviewerLabel}:
                    <app-link
                      class="link-btn"
                      size="md"
                      variant="primary"
                      @click="${() => store.openEmployeeDetail(reviewer.id)}"
                    >
                      ${reviewer.name}
                    </app-link>
                  </span>
                `
              : ''}
            <span aria-hidden="true">·</span>
            <span>${kb.updatedLabel}: ${this.formatDate(article.updatedAt)}</span>
            ${article.verifiedAt
              ? html`
                  <span aria-hidden="true">·</span>
                  <span>${kb.verifiedLabel}: ${this.formatDate(article.verifiedAt)}</span>
                `
              : ''}
            <span aria-hidden="true">·</span>
            <span>${kb.viewsLabel}: ${article.viewsCount}</span>
          </div>

          ${article.tags.length > 0
            ? html`<div class="article-tags-line">${article.tags.map((tag) => `#${tag}`).join('  ·  ')}</div>`
            : ''}
        </header>

        ${article.summary ? html`<div class="summary-box">${article.summary}</div>` : ''}

        <app-markdown
          .content="${article.content}"
          editable
          @checklist-toggle="${(e: CustomEvent<{ line: number; checked: boolean }>) =>
            this.toggleChecklistLine(article, e.detail.line)}"
        ></app-markdown>

        ${linkedTasks.length > 0
          ? html`
              <div class="section-divider">
                <h3 class="sub-heading">${kb.linkedTasksLabel}</h3>
                <div class="linked-tasks-list">
                  ${linkedTasks.map(
                    ({ id, task }) => html`
                      <button
                        type="button"
                        class="linked-task-btn"
                        @click="${() => store.openTaskDetail(id)}"
                      >
                        <span class="entity-key">${id}</span>
                        <span>${task?.title}</span>
                        ${iconArrowUpRight(13)}
                      </button>
                    `
                  )}
                </div>
              </div>
            `
          : ''}

        <div class="feedback-bar">
          <button
            type="button"
            class="helpful-btn ${isHelpful ? 'is-voted' : ''}"
            @click="${() => store.toggleHelpfulKnowledgeArticle(article.id, activeUserId)}"
          >
            ${iconThumbsUp(15)}
            <span>${kb.helpfulAction}</span>
            <span>· ${article.helpfulUserIds.length}</span>
          </button>

          <span style="font-size: 0.78rem; color: var(--text-muted);">
            ${t.viewTexts.knowledgeBase.docIdLabel}
            <span style="font-family: var(--font-mono, 'JetBrains Mono', monospace);">${article.id}</span>
          </span>
        </div>

        <div class="section-divider">
          <h3 class="sub-heading">${kb.revisionsTitle} (${(article.revisions || []).length})</h3>
          ${(article.revisions || []).length === 0
            ? html`<div style="font-size: 0.8rem; color: var(--text-muted);">${kb.noRevisions}</div>`
            : html`
                <div class="revisions-list">
                  ${(article.revisions || []).map((rev) => {
                    const editor = store.users.find((u) => u.id === rev.editedById);
                    return html`
                      <div class="revision-row">
                        <span class="revision-summary">${rev.summary}</span>
                        <span class="revision-meta">
                          ${editor?.name || rev.editedById} · ${this.formatDate(rev.editedAt)}
                        </span>
                      </div>
                    `;
                  })}
                </div>
              `}
        </div>
      </article>
    `;
  }

  private renderEditorModal() {
    const t = getTranslation(this.currentLang);
    const kb = t.knowledgeBase;

    const scopeOptions = (Object.keys(kb.scopes) as KnowledgeScope[]).map((sc) => ({
      value: sc,
      label: kb.scopes[sc],
    }));

    const projectOptions = [
      { value: '', label: t.viewTexts.knowledgeBase.optionNoProjectLink },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}`, color: p.color })),
    ];

    const companyOptions = [
      { value: '', label: t.viewTexts.knowledgeBase.optionNoCompanyLink },
      ...store.companies.map((c) => ({ value: c.id, label: c.name })),
    ];

    const categoryOptions = (Object.keys(kb.categories) as KnowledgeCategory[]).map((cat) => ({
      value: cat,
      label: kb.categories[cat],
    }));

    const statusOptions = (Object.keys(kb.statuses) as KnowledgeArticleStatus[]).map((st) => ({
      value: st,
      label: kb.statuses[st],
    }));

    const userOptions = store.users.map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }));

    return html`
      <app-modal
        ?open="${this.modalOpen}"
        size="xl"
        title="${this.editingArticleId ? kb.editArticle : kb.newArticle}"
        @close="${() => (this.modalOpen = false)}"
      >
        <div class="modal-form">
          <app-input
            label="${kb.fieldTitle}"
            .value="${this.formTitle}"
            required
            error="${this.formError}"
            @input="${(e: CustomEvent<{ value: string }>) => {
              this.formTitle = eventValue(e);
              this.formError = '';
            }}"
          ></app-input>

          <app-textarea
            label="${kb.fieldSummary}"
            rows="2"
            .value="${this.formSummary}"
            @input="${(e: CustomEvent<{ value: string }>) => (this.formSummary = eventValue(e))}"
          ></app-textarea>

          <div class="form-grid-3">
            <app-select
              label="${kb.fieldScope}"
              .value="${this.formScope}"
              .options="${scopeOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formScope = eventValue(e) as KnowledgeScope)}"
            ></app-select>

            <app-select
              label="${kb.fieldCategory}"
              .value="${this.formCategory}"
              .options="${categoryOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formCategory = eventValue(e) as KnowledgeCategory)}"
            ></app-select>

            <app-select
              label="${kb.fieldStatus}"
              .value="${this.formStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.formStatus = eventValue(e) as KnowledgeArticleStatus)}"
            ></app-select>
          </div>

          <div class="form-grid-2">
            <app-select
              label="${kb.fieldProject}"
              .value="${this.formProjectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => {
                this.formProjectId = eventValue(e);
                if (this.formProjectId && !this.formCompanyId) {
                  const p = store.projects.find((pr) => pr.id === this.formProjectId);
                  if (p?.companyId) this.formCompanyId = p.companyId;
                }
              }}"
            ></app-select>

            <app-select
              label="${kb.fieldCompany}"
              .value="${this.formCompanyId}"
              .options="${companyOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formCompanyId = eventValue(e))}"
            ></app-select>
          </div>

          <div class="form-grid-2">
            <app-select
              label="${kb.fieldAuthor}"
              .value="${this.formAuthorId}"
              .options="${userOptions}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formAuthorId = eventValue(e))}"
            ></app-select>

            <app-select
              label="${kb.fieldReviewer}"
              .value="${this.formReviewerId}"
              .options="${[{ value: '', label: '—' }, ...userOptions]}"
              @change="${(e: CustomEvent<{ value: string }>) => (this.formReviewerId = eventValue(e))}"
            ></app-select>
          </div>

          <div class="form-grid-2">
            <app-input
              label="${kb.fieldTags}"
              placeholder="Redis, Runbook, SLA..."
              .value="${this.formTags}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formTags = eventValue(e))}"
            ></app-input>

            <app-input
              label="${kb.fieldLinkedTasks}"
              placeholder="CORE-101, MOB-202..."
              .value="${this.formLinkedTasks}"
              @input="${(e: CustomEvent<{ value: string }>) => (this.formLinkedTasks = eventValue(e))}"
            ></app-input>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
            <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-secondary);">
              ${kb.fieldContent}
            </span>
            <app-segmented-switch
              size="sm"
              .value="${this.editorTab}"
              .options="${[
                { value: 'write', label: kb.writeTab },
                { value: 'preview', label: kb.previewTab },
              ]}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.editorTab = eventValue(e) as 'write' | 'preview')}"
            ></app-segmented-switch>
          </div>

          ${this.editorTab === 'write'
            ? html`
                <app-textarea
                  rows="10"
                  .value="${this.formContent}"
                  @input="${(e: CustomEvent<{ value: string }>) => (this.formContent = eventValue(e))}"
                ></app-textarea>
              `
            : html`<div class="preview-surface"><app-markdown .content="${this.formContent}"></app-markdown></div>`}

          <app-input
            label="${kb.fieldRevisionSummary}"
            placeholder="${t.viewTexts.knowledgeBase.revisionPlaceholder}"
            .value="${this.formRevisionSummary}"
            @input="${(e: CustomEvent<{ value: string }>) => (this.formRevisionSummary = eventValue(e))}"
          ></app-input>
        </div>

        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.modalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="primary" @click="${() => this.saveArticle()}">
            ${this.editingArticleId ? t.common.save : t.common.create}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderDeleteModal() {
    const t = getTranslation(this.currentLang);
    const kb = t.knowledgeBase;

    return html`
      <app-modal
        ?open="${Boolean(this.deletingArticle)}"
        size="sm"
        title="${t.common.delete}"
        @close="${() => (this.deletingArticle = null)}"
      >
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">
          ${kb.deleteConfirm}
          ${this.deletingArticle ? html`<br /><strong style="color: var(--text-primary);">${this.deletingArticle.title}</strong>` : ''}
        </p>
        <div slot="footer">
          <app-button variant="ghost" @click="${() => (this.deletingArticle = null)}">
            ${t.common.cancel}
          </app-button>
          <app-button
            variant="danger"
            @click="${() => {
              if (this.deletingArticle) {
                store.deleteKnowledgeArticle(this.deletingArticle.id);
              }
              this.deletingArticle = null;
            }}"
          >
            ${t.common.delete}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private clearAllFilters() {
    this.localSearch = '';
    this.categoryFilter = 'all';
    this.statusFilter = 'all';
    store.setKnowledgeFilters({ scope: 'all', projectId: 'all', companyId: 'all' });
  }

  private openCreateModal() {
    const defaultProjId = this.projectFilter !== 'all' ? this.projectFilter : '';
    const proj = defaultProjId ? store.projects.find((p) => p.id === defaultProjId) : null;
    const defaultCompId =
      this.companyFilter !== 'all' ? this.companyFilter : proj?.companyId || '';

    this.editingArticleId = null;
    this.editorTab = 'write';
    this.formTitle = '';
    this.formSummary = '';
    this.formContent = getTranslation(this.currentLang).viewTexts.knowledgeBase.defaultDocContent;
    this.formScope =
      this.scopeFilter !== 'all'
        ? this.scopeFilter
        : defaultProjId
        ? 'project'
        : defaultCompId
        ? 'company'
        : 'project';
    this.formProjectId = defaultProjId;
    this.formCompanyId = defaultCompId;
    this.formCategory = 'playbook';
    this.formStatus = 'published';
    this.formTags = '';
    this.formLinkedTasks = '';
    this.formAuthorId = store.currentUserId || store.users[0]?.id || 'user-1';
    this.formReviewerId = '';
    this.formRevisionSummary = '';
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(article: KnowledgeArticle) {
    this.editingArticleId = article.id;
    this.editorTab = 'write';
    this.formTitle = article.title;
    this.formSummary = article.summary;
    this.formContent = article.content;
    this.formScope = article.scope;
    this.formProjectId = article.projectId || '';
    this.formCompanyId = article.companyId || '';
    this.formCategory = article.category;
    this.formStatus = article.status;
    this.formTags = article.tags.join(', ');
    this.formLinkedTasks = (article.linkedTaskIds || []).join(', ');
    this.formAuthorId = article.authorId;
    this.formReviewerId = article.reviewerId || '';
    this.formRevisionSummary = '';
    this.formError = '';
    this.modalOpen = true;
  }

  private saveArticle() {
    const title = this.formTitle.trim();
    if (!title) {
      this.formError = getTranslation(this.currentLang).common.required;
      return;
    }

    const tags = this.formTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const linkedTaskIds = this.formLinkedTasks
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    if (this.editingArticleId) {
      const existing = this.articles.find((a) => a.id === this.editingArticleId);
      if (!existing) return;
      store.updateKnowledgeArticle(
        {
          ...existing,
          title,
          summary: this.formSummary.trim(),
          content: this.formContent,
          scope: this.formScope,
          projectId: this.formProjectId || undefined,
          companyId: this.formCompanyId || undefined,
          category: this.formCategory,
          status: this.formStatus,
          tags,
          linkedTaskIds,
          authorId: this.formAuthorId || existing.authorId,
          reviewerId: this.formReviewerId || undefined,
        },
        this.formRevisionSummary
      );
    } else {
      const created = store.addKnowledgeArticle({
        title,
        summary: this.formSummary.trim(),
        content: this.formContent,
        scope: this.formScope,
        projectId: this.formProjectId || undefined,
        companyId: this.formCompanyId || undefined,
        category: this.formCategory,
        status: this.formStatus,
        tags,
        linkedTaskIds,
        authorId: this.formAuthorId || store.currentUserId || 'user-1',
        reviewerId: this.formReviewerId || undefined,
        pinned: false,
        revisionSummary: this.formRevisionSummary,
      });
      this.detailKnowledgeId = created.id;
    }

    this.modalOpen = false;
  }
}