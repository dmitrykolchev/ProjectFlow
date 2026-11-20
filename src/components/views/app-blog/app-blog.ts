import { LitElement, TemplateResult, html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { store } from '../../../state/store';
import { getTranslation } from '../../../i18n';
import { BlogCategory, BlogComment, BlogPost, BlogPostStatus } from '../../../types';
import { effectivePresence } from '../../../domain/presence-tokens';
import { eventValue } from '../../common/event-value';
import {
  iconArchive,
  iconArrowLeft,
  iconArrowUpRight,
  iconBookmark,
  iconChevronRight,
  iconCode,
  iconColumns,
  iconEdit,
  iconEye,
  iconFeather,
  iconFilter,
  iconHeart,
  iconLink,
  iconList,
  iconMessageSquare,
  iconPin,
  iconPlus,
  iconSend,
  iconTrash,
} from '../../common/icons';
import '../../common/app-button/app-button';
import '../../common/app-cards-table/app-cards-table';
import '../../common/app-confirm-dialog/app-confirm-dialog';
import '../../common/app-data-table/app-data-table';
import '../../common/app-empty-state/app-empty-state';
import '../../common/app-filter-bar/app-filter-bar';
import '../../common/app-form-grid/app-form-grid';
import '../../common/app-input/app-input';
import '../../common/app-kpi-strip/app-kpi-strip';
import '../../common/app-link/app-link';
import '../../common/app-markdown/app-markdown';
import '../../common/app-modal/app-modal';
import '../../common/app-page-header/app-page-header';
import '../../common/app-persona/app-persona';
import '../../common/app-section-card/app-section-card';
import '../../common/app-segmented-switch/app-segmented-switch';
import '../../common/app-select/app-select';
import '../../common/app-status-chip/app-status-chip';
import '../../common/app-switch/app-switch';
import '../../common/app-table-column/app-table-column';
import '../../common/app-textarea/app-textarea';
import type { AppTextarea } from '../../common/app-textarea/app-textarea';
import '../../common/app-toggle-button/app-toggle-button';
import '../../common/card-footer/card-footer';
import '../../dashboard/app-metric-card/app-metric-card';
import styles from './app-blog.css';
import tableContentStyles from './app-blog.table.content.css';
import cardContentStyles from './app-blog.content.css';

type BlogScopeFilter = 'all' | 'mine' | 'bookmarked' | 'drafts';
type BlogEditorMode = 'write' | 'split' | 'preview';

@customElement('app-blog')
export class AppBlog extends LitElement {
  @state() private posts: BlogPost[] = store.blogPosts;
  @state() private currentLang = store.customization.language;
  @state() private detailPostId: string = store.detailBlogPostId;
  @state() private globalSearch = store.searchQuery;
  @state() private localSearch = '';
  @state() private scopeFilter: BlogScopeFilter = 'all';
  @state() private categoryFilter: 'all' | BlogCategory = 'all';
  @state() private authorFilter = 'all';
  @state() private statusFilter: 'all' | BlogPostStatus = 'all';
  @state() private projectFilter = 'all';
  @state() private displayMode: 'cards' | 'table' = 'cards';
  @state() private filterVisible = true;
  @state() private currentPage = 1;
  @state() private cardPageSize = store.customization.cardGridPageSize;
  @state() private tablePageSize = store.customization.tablePageSize;

  // Comment composer state
  @state() private commentText = '';
  @state() private commentAuthorId = store.currentUserId || store.users[0]?.id || 'user-1';
  @state() private deletingComment: { postId: string; comment: BlogComment } | null = null;

  // Editor modal state
  @state() private modalOpen = false;
  @state() private editingPostId: string | null = null;
  @state() private editorMode: BlogEditorMode = 'split';
  @state() private formTitle = '';
  @state() private formSubtitle = '';
  @state() private formContent = '';
  @state() private formAuthorId = store.currentUserId || store.users[0]?.id || 'user-1';
  @state() private formCategory: BlogCategory = 'engineering';
  @state() private formStatus: BlogPostStatus = 'published';
  @state() private formProjectId = '';
  @state() private formTags = '';
  @state() private formFeatured = false;
  @state() private formError = '';

  @state() private deletingPost: BlogPost | null = null;

  @query('#blog-md-textarea') private mdTextarea?: AppTextarea;

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
    this.posts = store.blogPosts;
    this.currentLang = store.customization.language;
    this.detailPostId = store.detailBlogPostId;
    this.globalSearch = store.searchQuery;
    this.currentPage = store.activeView === 'blog' ? store.activePage : 1;
    this.cardPageSize = store.customization.cardGridPageSize;
    this.tablePageSize = store.customization.tablePageSize;
    const mode = store.viewModeFor('blog');
    this.displayMode = mode === 'table' ? 'table' : 'cards';
    if (!store.users.some((u) => u.id === this.commentAuthorId)) {
      this.commentAuthorId = store.currentUserId || store.users[0]?.id || 'user-1';
    }
    // strict-mode fallback: filters pointing at records that no longer exist in the store would keep
    // their selects on the placeholder and leave the list silently empty, so stale values fall back to
    // "all". The check runs against the same lists the filter options are built from.
    if (this.authorFilter !== 'all' && !store.users.some((u) => u.id === this.authorFilter)) {
      this.authorFilter = 'all';
    }
    if (this.projectFilter !== 'all' && !store.projects.some((p) => p.id === this.projectFilter)) {
      this.projectFilter = 'all';
    }
  }

  private currentUserId(): string {
    return store.currentUserId || store.users[0]?.id || 'user-1';
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

  private formatDateTime(iso: string): string {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return iso;
    return new Date(ms).toLocaleString(getTranslation(this.currentLang).common.locale, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private countWords(markdown: string): number {
    return (markdown || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#>*`~\-\[\]()|]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  private getFilteredPosts(): BlogPost[] {
    const q = (this.localSearch || this.globalSearch).trim().toLowerCase();
    const uid = this.currentUserId();

    return this.posts
      .filter((post) => {
        if (this.scopeFilter === 'mine' && post.authorId !== uid) return false;
        if (this.scopeFilter === 'bookmarked' && !(post.bookmarkedByUserIds || []).includes(uid)) return false;
        if (this.scopeFilter === 'drafts' && post.status !== 'draft') return false;
        if (this.categoryFilter !== 'all' && post.category !== this.categoryFilter) return false;
        if (this.authorFilter !== 'all' && post.authorId !== this.authorFilter) return false;
        if (this.statusFilter !== 'all' && post.status !== this.statusFilter) return false;
        if (this.projectFilter !== 'all' && post.projectId !== this.projectFilter) return false;

        if (!q) return true;
        const author = store.users.find((u) => u.id === post.authorId);
        const proj = post.projectId ? store.projects.find((p) => p.id === post.projectId) : null;
        const haystack = [
          post.title || '',
          post.subtitle || '',
          post.content || '',
          (post.tags || []).join(' '),
          author?.name || '',
          author?.role || '',
          proj?.name || '',
          proj?.key || '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
        const aDate = a.publishedAt || a.updatedAt || '';
        const bDate = b.publishedAt || b.updatedAt || '';
        return bDate.localeCompare(aDate);
      });
  }

  private toggleChecklistLine(post: BlogPost, lineIdx: number) {
    const lines = post.content.split('\n');
    const target = lines[lineIdx];
    if (!target) return;
    if (/^- \[ \] /.test(target.trim())) {
      lines[lineIdx] = target.replace('- [ ] ', '- [x] ');
    } else if (/^- \[[xX]\] /.test(target.trim())) {
      lines[lineIdx] = target.replace(/- \[[xX]\] /, '- [ ] ');
    } else {
      return;
    }
    store.updateBlogPost({ ...post, content: lines.join('\n') });
  }

  private openCreateModal() {
    const t = getTranslation(this.currentLang).viewTexts.blog;
    this.editingPostId = null;
    this.editorMode = 'split';
    this.formTitle = '';
    this.formSubtitle = '';
    this.formContent = t.defaultTemplate;
    this.formAuthorId = this.currentUserId();
    this.formCategory = 'engineering';
    this.formStatus = 'published';
    this.formProjectId = '';
    this.formTags = '';
    this.formFeatured = false;
    this.formError = '';
    this.modalOpen = true;
  }

  private openEditModal(post: BlogPost) {
    this.editingPostId = post.id;
    this.editorMode = 'split';
    this.formTitle = post.title;
    this.formSubtitle = post.subtitle;
    this.formContent = post.content;
    this.formAuthorId = post.authorId;
    this.formCategory = post.category;
    this.formStatus = post.status;
    this.formProjectId = post.projectId || '';
    this.formTags = post.tags.join(', ');
    this.formFeatured = Boolean(post.featured);
    this.formError = '';
    this.modalOpen = true;
  }

  private applyToolbarSnippet(prefix: string, suffix = '', placeholder = '') {
    if (this.mdTextarea) {
      this.formContent = this.mdTextarea.wrapSelection(prefix, suffix, placeholder);
    } else {
      const sep = this.formContent && !this.formContent.endsWith('\n') ? '\n' : '';
      this.formContent = `${this.formContent}${sep}${prefix}${placeholder}${suffix}`;
    }
  }

  private savePost(forceStatus?: BlogPostStatus) {
    const t = getTranslation(this.currentLang);
    if (!this.formTitle.trim() || !this.formContent.trim()) {
      this.formError = t.common.required;
      return;
    }
    const tags = this.formTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const nextStatus = forceStatus || this.formStatus;

    if (this.editingPostId) {
      const prev = this.posts.find((p) => p.id === this.editingPostId);
      if (!prev) return;
      store.updateBlogPost({
        ...prev,
        title: this.formTitle.trim(),
        subtitle: this.formSubtitle.trim(),
        content: this.formContent,
        authorId: this.formAuthorId || prev.authorId,
        category: this.formCategory,
        status: nextStatus,
        tags,
        projectId: this.formProjectId || undefined,
        featured: this.formFeatured,
      });
    } else {
      store.addBlogPost({
        title: this.formTitle.trim(),
        subtitle: this.formSubtitle.trim(),
        content: this.formContent,
        authorId: this.formAuthorId || this.currentUserId(),
        category: this.formCategory,
        status: nextStatus,
        tags,
        projectId: this.formProjectId || undefined,
        featured: this.formFeatured,
      });
    }
    this.modalOpen = false;
  }

  private submitComment(postId: string) {
    if (!this.commentText.trim()) return;
    store.addBlogComment(postId, this.commentText, this.commentAuthorId);
    this.commentText = '';
  }

  render() {
    const t = getTranslation(this.currentLang);
    const activePost = this.detailPostId
      ? this.posts.find((p) => p.id === this.detailPostId) || null
      : null;

    return html`
      ${activePost ? this.renderReader(activePost, t) : this.renderBrowseFeed(t)}
      ${this.renderEditorModal(t)}
      ${this.renderDeleteDialogs(t)}
    `;
  }

  private renderBrowseFeed(t: ReturnType<typeof getTranslation>) {
    const b = t.viewTexts.blog;
    const catLabels = t.blog.categories;
    const statusLabels = t.blog.statuses;
    const filtered = this.getFilteredPosts();
    const uid = this.currentUserId();

    const totalCount = this.posts.length;
    const publishedCount = this.posts.filter((p) => p.status === 'published').length;
    const uniqueAuthors = new Set(this.posts.map((p) => p.authorId)).size;
    const draftCount = this.posts.filter((p) => p.status === 'draft').length;
    const totalReactions = this.posts.reduce(
      (acc, p) => acc + p.likedByUserIds.length + (p.comments?.length || 0),
      0
    );
    const totalViews = this.posts.reduce((acc, p) => acc + (p.viewsCount || 0), 0);

    const categoryOptions = [
      { value: 'all', label: b.filterAllCategories },
      ...(Object.keys(catLabels) as BlogCategory[]).map((cat) => ({
        value: cat,
        label: catLabels[cat],
      })),
    ];

    const authorOptions = [
      { value: 'all', label: b.filterAllAuthors },
      ...store.users.map((u) => ({ value: u.id, label: u.name })),
    ];

    const statusOptions = [
      { value: 'all', label: b.filterAllStatuses },
      ...(Object.keys(statusLabels) as BlogPostStatus[]).map((st) => ({
        value: st,
        label: statusLabels[st],
      })),
    ];

    const projectOptions = [
      { value: 'all', label: b.filterAllProjects },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}`, color: p.color })),
    ];

    return html`
      <app-page-header title="${t.navigation.blog}" subtitle="${t.viewTexts.pageSubtitles.blog}">
        <span slot="icon">${iconFeather(28)}</span>
        <app-button slot="actions" variant="primary" size="md" @click="${() => this.openCreateModal()}">
          <span slot="icon-start">${iconPlus(16)}</span>
          <span>${b.newArticleButton}</span>
        </app-button>
      </app-page-header>

      <app-kpi-strip columns="4">
        <app-metric-card
          size="compact"
          label="${b.kpiTotalPosts}"
          value="${String(totalCount)}"
          subtitle="${b.kpiPublishedHint(publishedCount)}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${b.kpiAuthors}"
          value="${String(uniqueAuthors)}"
          subtitle="${b.kpiAuthorsHint(store.users.length)}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${b.kpiDrafts}"
          value="${String(draftCount)}"
          subtitle="${b.kpiDraftsHint}"
          valueColor="${draftCount > 0 ? 'var(--color-warning, #f59e0b)' : 'var(--text-primary)'}"
        ></app-metric-card>
        <app-metric-card
          size="compact"
          label="${b.kpiEngagement}"
          value="${String(totalReactions)}"
          subtitle="${b.kpiEngagementHint(totalViews)}"
          valueColor="var(--color-success, #10b981)"
        ></app-metric-card>
      </app-kpi-strip>

      <div class="mode-row">
        <app-segmented-switch
          size="sm"
          .value="${this.scopeFilter}"
          .options="${[
            { value: 'all', label: b.scopeAll },
            { value: 'mine', label: b.scopeMine },
            { value: 'bookmarked', label: b.scopeBookmarked },
            { value: 'drafts', label: b.scopeDrafts },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            this.scopeFilter = eventValue(e) as BlogScopeFilter;
            this.currentPage = 1;
            store.setActivePage(1, false);
          }}"
        ></app-segmented-switch>

        <app-segmented-switch
          size="sm"
          .value="${this.displayMode}"
          .options="${[
            { value: 'cards', label: b.viewCards },
            { value: 'table', label: b.viewTable },
          ]}"
          @change="${(e: CustomEvent<{ value: string }>) => {
            const next = eventValue(e) === 'table' ? 'table' : 'cards';
            this.displayMode = next;
            this.currentPage = 1;
            store.setActivePage(1, false);
            store.setViewMode('blog', next);
          }}"
        ></app-segmented-switch>

        <app-toggle-button
          size="sm"
          ?pressed="${this.filterVisible}"
          @change="${(e: CustomEvent<{ pressed: boolean }>) => (this.filterVisible = e.detail.pressed)}"
        >
          <span slot="icon-start">${iconFilter(14)}</span>
          <span>${t.common.filterToggle}</span>
        </app-toggle-button>
      </div>

      ${this.filterVisible
        ? html`
            <app-filter-bar
              style="--filter-search-min: 280px; --filter-search-max: 280px;"
              placeholder="${b.searchPlaceholder}"
              .searchValue="${this.localSearch}"
              show-reset
              .filters="${[
                {
                  key: 'category',
                  options: categoryOptions,
                },
                {
                  key: 'author',
                  options: authorOptions,
                },
                {
                  key: 'status',
                  options: statusOptions,
                },
                {
                  key: 'project',
                  options: projectOptions,
                },
              ]}"
              .values="${{
                category: this.categoryFilter,
                author: this.authorFilter,
                status: this.statusFilter,
                project: this.projectFilter,
              }}"
              @search-change="${(e: CustomEvent<{ value: string }>) => {
                this.localSearch = eventValue(e);
                this.currentPage = 1;
                store.setActivePage(1, false);
              }}"
              @filter-change="${(e: CustomEvent<{ key: string; value: string }>) => {
                const { key } = e.detail;
                const value = eventValue(e);
                if (key === 'category') this.categoryFilter = value as 'all' | BlogCategory;
                if (key === 'author') this.authorFilter = value;
                if (key === 'status') this.statusFilter = value as 'all' | BlogPostStatus;
                if (key === 'project') this.projectFilter = value;
                this.currentPage = 1;
                store.setActivePage(1, false);
              }}"
              @reset="${() => {
                this.localSearch = '';
                this.categoryFilter = 'all';
                this.authorFilter = 'all';
                this.statusFilter = 'all';
                this.projectFilter = 'all';
                this.scopeFilter = 'all';
                this.currentPage = 1;
                store.setActivePage(1, false);
              }}"
            ></app-filter-bar>
          `
        : ''}
      ${filtered.length === 0
        ? html`
            <app-empty-state
              title="${b.emptyTitle}"
              message="${b.emptySubtitle}"
            >
              <span slot="icon">${iconFeather(40)}</span>
              <app-button slot="action" variant="primary" size="sm" @click="${() => this.openCreateModal()}">
                <span slot="icon-start">${iconPlus(14)}</span>
                <span>${b.newArticleButton}</span>
              </app-button>
            </app-empty-state>
          `
        : this.displayMode === 'cards'
        ? this.renderCards(filtered, uid, t)
        : this.renderTable(filtered, uid, t)}
    `;
  }

  private renderCards(posts: BlogPost[], uid: string, t: ReturnType<typeof getTranslation>) {
    const b = t.viewTexts.blog;
    const catLabels = t.blog.categories;

    const cardRender = (row: Record<string, unknown>): TemplateResult => {
      const post = row as unknown as BlogPost;
      const author = store.users.find((u) => u.id === post.authorId);
      const proj = post.projectId ? store.projects.find((p) => p.id === post.projectId) : null;
      const isLiked = (post.likedByUserIds || []).includes(uid);
      const isBookmarked = (post.bookmarkedByUserIds || []).includes(uid);
      const readMin = store.estimateReadingTimeMin(post.content);
      const displayDate = this.formatDate(post.publishedAt || post.updatedAt);

      return html`
        <div class="blog-card-top">
          <app-persona
            size="24"
            .primaryText="${author?.name || post.authorId}"
            .secondaryText="${author?.role || author?.department || ''}"
            .presence="${author ? effectivePresence(author) : 'none'}"
            @click="${() => author && store.openEmployeeDetail(author.id)}"
          ></app-persona>

          <div class="blog-status-cluster">
            ${post.featured
              ? html`<span class="blog-featured-mark">${iconPin(13)} ${b.featuredLabel}</span>`
              : ''}
            <app-status-chip domain="blog" status="${post.status}" size="sm"></app-status-chip>
          </div>
        </div>

        <button
          type="button"
          class="blog-title-btn"
          @click="${() => store.selectBlogPost(post.id)}"
        >
          ${post.title}
        </button>

        ${post.subtitle ? html`<p class="blog-excerpt">${post.subtitle}</p>` : ''}

        <div class="blog-meta-line">
          <span class="blog-meta-cat">${catLabels[post.category] || post.category}</span>
          ${proj
            ? html`
                <span>·</span>
                <button
                  type="button"
                  class="blog-meta-link"
                  @click="${() => store.openProjectDetail(proj.id)}"
                >
                  ${proj.key} · ${proj.name}
                </button>
              `
            : ''}
          <span>·</span>
          <span>${b.readTimeMinutes(readMin)}</span>
          <span>·</span>
          <span>${displayDate}</span>
        </div>

        ${(post.tags || []).length > 0
          ? html`<div class="blog-tags-line">${post.tags.map((tag) => `#${tag}`).join(' · ')}</div>`
          : ''}

        <card-footer>
          <div slot="start" class="blog-footer-stats">
            <button
              type="button"
              class="blog-stat-btn ${isLiked ? 'is-liked' : ''}"
              title="${b.likeBtn}"
              @click="${() => store.toggleLikeBlogPost(post.id)}"
            >
              ${iconHeart(13)}
              <span>${(post.likedByUserIds || []).length}</span>
            </button>
            <button
              type="button"
              class="blog-stat-btn"
              @click="${() => store.selectBlogPost(post.id)}"
            >
              ${iconMessageSquare(13)}
              <span>${post.comments?.length || 0}</span>
            </button>
            <button
              type="button"
              class="blog-stat-btn ${isBookmarked ? 'is-bookmarked' : ''}"
              title="${isBookmarked ? b.bookmarkedBtn : b.bookmarkBtn}"
              @click="${() => store.toggleBookmarkBlogPost(post.id)}"
            >
              ${iconBookmark(13, isBookmarked)}
            </button>
            <span class="blog-stat-muted">
              ${iconEye(13)}
              <span>${post.viewsCount || 0}</span>
            </span>
          </div>

          <div slot="end" class="blog-footer-stats">
            <app-button
              size="sm"
              variant="icon"
              title="${t.common.edit}"
              @click="${() => this.openEditModal(post)}"
            >
              <span slot="start">${iconEdit(14)}</span>
            </app-button>
            <app-button
              size="sm"
              variant="icon"
              action="delete"
              title="${t.common.delete}"
              @click="${() => (this.deletingPost = post)}"
            >
              <span slot="start">${iconTrash(14)}</span>
            </app-button>
            <app-button
              action="view"
              size="sm"
              variant="icon"
              title="${b.readArticleBtn}"
              @click="${() => store.selectBlogPost(post.id)}"
            >
              <span slot="start">${iconChevronRight(15)}</span>
            </app-button>
          </div>
        </card-footer>
      `;
    };

    return html`
      <app-cards-table
        .rows="${posts as unknown as Record<string, unknown>[]}"
        .cardRender="${cardRender}"
        .contentStyles="${cardContentStyles}"
        page-size="${this.cardPageSize}"
        page="${this.currentPage}"
        locale="${t.common.locale}"
        empty-title="${b.emptyTitle}"
        @page-change="${(e: CustomEvent<{ page: number }>) => {
          this.currentPage = e.detail.page;
          store.setActivePage(e.detail.page);
          this.scrollTop = 0;
        }}"
        @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
          this.currentPage = 1;
          store.setCardGridPageSize(e.detail.pageSize);
          store.setActivePage(1, false);
        }}"
      ></app-cards-table>
    `;
  }

  private renderTable(posts: BlogPost[], uid: string, t: ReturnType<typeof getTranslation>) {
    const b = t.viewTexts.blog;
    const catLabels = t.blog.categories;

    const articleCell = (row: Record<string, unknown>) => {
      const post = row as unknown as BlogPost;
      return html`
        <div>
          <button
            type="button"
            class="blog-tbl-title-btn"
            @click="${() => store.selectBlogPost(post.id)}"
          >
            ${post.featured ? html`${iconPin(12)} ` : ''}${post.title}
          </button>
          ${post.subtitle ? html`<div class="blog-tbl-sub">${post.subtitle}</div>` : ''}
          ${(post.tags || []).length > 0
            ? html`<div class="td-title-sub">${post.tags.map((tag) => `#${tag}`).join(' · ')}</div>`
            : ''}
        </div>
      `;
    };

    const authorCell = (row: Record<string, unknown>) => {
      const post = row as unknown as BlogPost;
      const author = store.users.find((u) => u.id === post.authorId);
      return html`
        <app-persona
          size="24"
          .primaryText="${author?.name || post.authorId}"
          .secondaryText="${author?.role || ''}"
          .presence="${author ? effectivePresence(author) : 'none'}"
          @click="${() => author && store.openEmployeeDetail(author.id)}"
        ></app-persona>
      `;
    };

    const categoryCell = (row: Record<string, unknown>) => {
      const post = row as unknown as BlogPost;
      const proj = post.projectId ? store.projects.find((p) => p.id === post.projectId) : null;
      return html`
        <div>
          <div class="td-title-main">${catLabels[post.category] || post.category}</div>
          ${proj ? html`<div class="td-title-sub">${proj.key} · ${proj.name}</div>` : ''}
        </div>
      `;
    };

    const metricsCell = (row: Record<string, unknown>) => {
      const post = row as unknown as BlogPost;
      const readMin = store.estimateReadingTimeMin(post.content);
      const isLiked = (post.likedByUserIds || []).includes(uid);
      return html`
        <div class="blog-tbl-metrics">
          <span>${b.readTimeMinutes(readMin)}</span>
          <span class="blog-tbl-metric ${isLiked ? 'is-liked' : ''}">
            ${iconHeart(13)} ${(post.likedByUserIds || []).length}
          </span>
          <span class="blog-tbl-metric">
            ${iconMessageSquare(13)} ${post.comments?.length || 0}
          </span>
          <span class="blog-tbl-metric">
            ${iconEye(13)} ${post.viewsCount || 0}
          </span>
        </div>
      `;
    };

    const updatedCell = (row: Record<string, unknown>) => {
      const post = row as unknown as BlogPost;
      return html`<span class="dates-cell">${this.formatDate(post.publishedAt || post.updatedAt)}</span>`;
    };

    const statusCell = (row: Record<string, unknown>) => {
      const post = row as unknown as BlogPost;
      return html`<app-status-chip domain="blog" status="${post.status}" size="sm"></app-status-chip>`;
    };

    const actionsCell = (row: Record<string, unknown>) => {
      const post = row as unknown as BlogPost;
      const isBookmarked = (post.bookmarkedByUserIds || []).includes(uid);
      return html`
        <div class="actions-row">
          <app-button
            size="sm"
            variant="icon"
            title="${b.readArticleBtn}"
            @click="${() => store.selectBlogPost(post.id)}"
          >
            <span slot="start">${iconEye(14)}</span>
          </app-button>
          <app-button
            size="sm"
            variant="icon"
            title="${isBookmarked ? b.bookmarkedBtn : b.bookmarkBtn}"
            @click="${() => store.toggleBookmarkBlogPost(post.id)}"
          >
            <span slot="start">${iconBookmark(14, isBookmarked)}</span>
          </app-button>
          <app-button
            size="sm"
            variant="icon"
            title="${t.common.edit}"
            @click="${() => this.openEditModal(post)}"
          >
            <span slot="start">${iconEdit(14)}</span>
          </app-button>
          <app-button
            size="sm"
            variant="icon"
            action="delete"
            title="${t.common.delete}"
            @click="${() => (this.deletingPost = post)}"
          >
            <span slot="start">${iconTrash(14)}</span>
          </app-button>
        </div>
      `;
    };

    return html`
      <div class="table-card">
        <app-data-table
          .contentStyles="${tableContentStyles}"
          .rows="${posts as unknown as Record<string, unknown>[]}"
          page-size="${this.tablePageSize}"
          page="${this.currentPage}"
          locale="${t.common.locale}"
          empty-title="${b.emptyTitle}"
          @page-change="${(e: CustomEvent<{ page: number }>) => {
            this.currentPage = e.detail.page;
            store.setActivePage(e.detail.page);
            this.scrollTop = 0;
          }}"
          @page-size-change="${(e: CustomEvent<{ pageSize: number }>) => {
            this.currentPage = 1;
            store.setTablePageSize(e.detail.pageSize);
            store.setActivePage(1, false);
          }}"
        >
          <app-table-column
            field="title"
            label="${b.thArticle}"
            .cellRender="${articleCell}"
          ></app-table-column>

          <app-table-column
            field="authorId"
            label="${b.thAuthor}"
            .cellRender="${authorCell}"
          ></app-table-column>

          <app-table-column
            field="category"
            label="${b.thCategory}"
            .cellRender="${categoryCell}"
          ></app-table-column>

          <app-table-column
            field="viewsCount"
            label="${b.thMetrics}"
            .cellRender="${metricsCell}"
          ></app-table-column>

          <app-table-column
            field="updatedAt"
            label="${b.thUpdated}"
            .cellRender="${updatedCell}"
          ></app-table-column>

          <app-table-column
            field="status"
            label="${b.thStatus}"
            .cellRender="${statusCell}"
          ></app-table-column>

          <app-table-column
            field=""
            label="${t.common.actions}"
            align="right"
            .cellRender="${actionsCell}"
          ></app-table-column>
        </app-data-table>
      </div>
    `;
  }

  private renderReader(post: BlogPost, t: ReturnType<typeof getTranslation>) {
    const b = t.viewTexts.blog;
    const catLabels = t.blog.categories;
    const uid = this.currentUserId();
    const author = store.users.find((u) => u.id === post.authorId);
    const proj = post.projectId ? store.projects.find((p) => p.id === post.projectId) : null;
    const isLiked = post.likedByUserIds.includes(uid);
    const isBookmarked = post.bookmarkedByUserIds.includes(uid);
    const readMin = store.estimateReadingTimeMin(post.content);
    const displayDate = this.formatDate(post.publishedAt || post.updatedAt);

    const authorOptions = store.users.map((u) => ({ value: u.id, label: u.name }));

    return html`
      <div class="reader-shell">
        <div class="reader-topbar">
          <app-button variant="ghost" size="sm" @click="${() => store.selectBlogPost('')}">
            <span slot="icon-start">${iconArrowLeft(15)}</span>
            <span>${b.backToFeedBtn}</span>
          </app-button>

          <div class="reader-actions">
            <app-button
              variant="ghost"
              size="sm"
              title="${post.featured ? b.unfeatureBtn : b.featureBtn}"
              @click="${() => store.toggleFeatureBlogPost(post.id)}"
            >
              <span slot="icon-start">${iconPin(14)}</span>
              <span>${post.featured ? b.unfeatureBtn : b.featureBtn}</span>
            </app-button>

            ${post.status !== 'published'
              ? html`
                  <app-button
                    variant="secondary"
                    size="sm"
                    @click="${() => store.updateBlogPost({ ...post, status: 'published' })}"
                  >
                    <span>${b.publishBtn}</span>
                  </app-button>
                `
              : html`
                  <app-button
                    variant="ghost"
                    size="sm"
                    @click="${() => store.updateBlogPost({ ...post, status: 'archived' })}"
                  >
                    <span slot="icon-start">${iconArchive(14)}</span>
                    <span>${b.archiveBtn}</span>
                  </app-button>
                `}

            <app-button variant="secondary" size="sm" @click="${() => this.openEditModal(post)}">
              <span slot="icon-start">${iconEdit(14)}</span>
              <span>${t.common.edit}</span>
            </app-button>

            <app-button
              variant="icon"
              size="sm"
              action="delete"
              title="${t.common.delete}"
              @click="${() => (this.deletingPost = post)}"
            >
              <span slot="start">${iconTrash(15)}</span>
            </app-button>
          </div>
        </div>

        <article class="reader-article-card">
          <div class="article-kicker-row">
            <div class="article-kicker-meta">
              <span class="article-category-label">${catLabels[post.category] || post.category}</span>
              ${post.featured
                ? html`
                    <span>·</span>
                    <span class="article-featured-label">${b.featuredLabel}</span>
                  `
                : ''}
              ${proj
                ? html`
                    <span>·</span>
                    <app-link
                      class="link-inline-btn"
                      @click="${() => store.openProjectDetail(proj.id)}"
                    >
                      <span>${proj.key} · ${proj.name}</span>
                      <span slot="end">${iconArrowUpRight(13)}</span>
                    </app-link>
                  `
                : ''}
            </div>

            <app-status-chip domain="blog" status="${post.status}" size="md"></app-status-chip>
          </div>

          <h1 class="article-headline">${post.title}</h1>
          ${post.subtitle ? html`<p class="article-lead">${post.subtitle}</p>` : ''}

          <div class="article-byline">
            <app-persona
              size="40"
              .primaryText="${author?.name || post.authorId}"
              .secondaryText="${[author?.role, author?.department].filter(Boolean).join(' · ')}"
              .presence="${author ? effectivePresence(author) : 'none'}"
              @click="${() => author && store.openEmployeeDetail(author.id)}"
            ></app-persona>

            <div class="byline-stats">
              <span>${displayDate}</span>
              <span>·</span>
              <span>${b.readTimeMinutes(readMin)}</span>
              <span>·</span>
              <span>${post.viewsCount || 0} ${b.viewsSuffix}</span>
            </div>
          </div>

          <app-markdown
            .content="${post.content}"
            ?editable="${true}"
            @checklist-toggle="${(e: CustomEvent<{ line: number }>) =>
              this.toggleChecklistLine(post, e.detail.line)}"
          ></app-markdown>

          <div class="article-footer-row">
            <div class="article-tags">
              ${post.tags.length > 0 ? post.tags.map((tag) => `#${tag}`).join(' · ') : ''}
            </div>

            <div class="reaction-row">
              <button
                type="button"
                class="reaction-pill-btn ${isLiked ? 'is-liked' : ''}"
                @click="${() => store.toggleLikeBlogPost(post.id)}"
              >
                ${iconHeart(15)}
                <span>${b.likeBtn}</span>
                <span>(${post.likedByUserIds.length})</span>
              </button>

              <button
                type="button"
                class="reaction-pill-btn ${isBookmarked ? 'is-bookmarked' : ''}"
                @click="${() => store.toggleBookmarkBlogPost(post.id)}"
              >
                ${iconBookmark(15, isBookmarked)}
                <span>${isBookmarked ? b.bookmarkedBtn : b.bookmarkBtn}</span>
              </button>
            </div>
          </div>
        </article>

        <app-section-card title="${b.commentsSectionTitle(post.comments?.length || 0)}">
          ${(post.comments || []).length === 0
            ? html`<div class="comments-empty">${b.commentsEmpty}</div>`
            : html`
                <div class="comments-thread">
                  ${post.comments.map((c) => {
                    const cAuthor = store.users.find((u) => u.id === c.authorId);
                    return html`
                      <div class="comment-item">
                        <div class="comment-head">
                          <app-persona
                            size="24"
                            .primaryText="${cAuthor?.name || c.authorId}"
                            .presence="${cAuthor ? effectivePresence(cAuthor) : 'none'}"
                            @click="${() => cAuthor && store.openEmployeeDetail(cAuthor.id)}"
                          ></app-persona>

                          <div class="comment-head-right">
                            <span class="comment-time">${this.formatDateTime(c.createdAt)}</span>
                            <app-button
                              size="sm"
                              variant="icon"
                              action="delete"
                              title="${t.common.delete}"
                              @click="${() => (this.deletingComment = { postId: post.id, comment: c })}"
                            >
                              <span slot="start">${iconTrash(13)}</span>
                            </app-button>
                          </div>
                        </div>
                        <p class="comment-text">${c.text}</p>
                      </div>
                    `;
                  })}
                </div>
              `}

          <div class="comment-composer">
            <app-textarea
              rows="3"
              placeholder="${b.commentPlaceholder}"
              .value="${this.commentText}"
              @input="${(e: CustomEvent) => (this.commentText = eventValue(e))}"
            ></app-textarea>

            <div class="comment-composer-controls">
              <div class="comment-author-select">
                <app-select
                  label="${b.commentAuthorLabel}"
                  .value="${this.commentAuthorId}"
                  .options="${authorOptions}"
                  @change="${(e: CustomEvent) => (this.commentAuthorId = eventValue(e))}"
                ></app-select>
              </div>

              <app-button
                variant="primary"
                size="md"
                ?disabled="${!this.commentText.trim()}"
                @click="${() => this.submitComment(post.id)}"
              >
                <span slot="icon-start">${iconSend(14)}</span>
                <span>${b.commentSubmitBtn}</span>
              </app-button>
            </div>
          </div>
        </app-section-card>
      </div>
    `;
  }

  private renderEditorModal(t: ReturnType<typeof getTranslation>) {
    const b = t.viewTexts.blog;
    const catLabels = t.blog.categories;
    const statusLabels = t.blog.statuses;

    const categoryOptions = (Object.keys(catLabels) as BlogCategory[]).map((cat) => ({
      value: cat,
      label: catLabels[cat],
    }));

    const statusOptions = (Object.keys(statusLabels) as BlogPostStatus[]).map((st) => ({
      value: st,
      label: statusLabels[st],
    }));

    const authorOptions = store.users.map((u) => ({
      value: u.id,
      label: u.role ? `${u.name} — ${u.role}` : u.name,
    }));

    const projectOptions = [
      { value: '', label: b.optionNoProject },
      ...store.projects.map((p) => ({ value: p.id, label: `[${p.key}] ${p.name}` })),
    ];

    const words = this.countWords(this.formContent);
    const readMin = store.estimateReadingTimeMin(this.formContent);

    return html`
      <app-modal
        ?open="${this.modalOpen}"
        size="xl"
        title="${this.editingPostId ? b.modalTitleEdit : b.modalTitleCreate}"
        @close="${() => (this.modalOpen = false)}"
      >
        <div class="modal-form">
          <app-form-grid columns="2">
            <app-input
              class="col-span-2"
              required
              label="${b.fieldTitle}"
              placeholder="${b.fieldTitlePlaceholder}"
              .value="${this.formTitle}"
              @input="${(e: CustomEvent) => (this.formTitle = eventValue(e))}"
            ></app-input>

            <app-input
              class="col-span-2"
              label="${b.fieldSubtitle}"
              placeholder="${b.fieldSubtitlePlaceholder}"
              .value="${this.formSubtitle}"
              @input="${(e: CustomEvent) => (this.formSubtitle = eventValue(e))}"
            ></app-input>

            <app-select
              label="${b.fieldAuthor}"
              .value="${this.formAuthorId}"
              .options="${authorOptions}"
              @change="${(e: CustomEvent) => (this.formAuthorId = eventValue(e))}"
            ></app-select>

            <app-select
              label="${b.fieldCategory}"
              .value="${this.formCategory}"
              .options="${categoryOptions}"
              @change="${(e: CustomEvent) => (this.formCategory = eventValue(e) as BlogCategory)}"
            ></app-select>

            <app-select
              label="${b.fieldStatus}"
              .value="${this.formStatus}"
              .options="${statusOptions}"
              @change="${(e: CustomEvent) => (this.formStatus = eventValue(e) as BlogPostStatus)}"
            ></app-select>

            <app-select
              label="${b.fieldProject}"
              .value="${this.formProjectId}"
              .options="${projectOptions}"
              @change="${(e: CustomEvent) => (this.formProjectId = eventValue(e))}"
            ></app-select>

            <app-input
              label="${b.fieldTags}"
              placeholder="${b.fieldTagsPlaceholder}"
              .value="${this.formTags}"
              @input="${(e: CustomEvent) => (this.formTags = eventValue(e))}"
            ></app-input>

            <app-switch
              class="switch-field"
              size="md"
              frame="normal"
              field-label-style="ghost"
              field-label="${b.fieldFeatured}"
              label="${b.fieldFeatured}"
              ?checked="${this.formFeatured}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                (this.formFeatured = e.detail.checked)}"
            ></app-switch>
          </app-form-grid>

          <div class="studio-bar">
            <app-segmented-switch
              size="sm"
              .value="${this.editorMode}"
              .options="${[
                { value: 'write', label: b.modeWrite },
                { value: 'split', label: b.modeSplit },
                { value: 'preview', label: b.modePreview },
              ]}"
              @change="${(e: CustomEvent<{ value: string }>) =>
                (this.editorMode = eventValue(e) as BlogEditorMode)}"
            ></app-segmented-switch>

            <span class="studio-stats">${b.wordsAndTimeStats(words, readMin)}</span>
          </div>

          ${this.editorMode !== 'preview' ? this.renderMarkdownToolbar(b) : ''}

          ${this.editorMode === 'split'
            ? html`
                <div class="md-split-grid">
                  <app-textarea
                    id="blog-md-textarea"
                    rows="16"
                    monospace
                    required
                    label="${b.fieldMarkdownContent}"
                    placeholder="${b.fieldMarkdownPlaceholder}"
                    .value="${this.formContent}"
                    @input="${(e: CustomEvent) => (this.formContent = eventValue(e))}"
                  ></app-textarea>

                  <div class="md-preview-pane">
                    ${this.formContent.trim()
                      ? html`<app-markdown .content="${this.formContent}"></app-markdown>`
                      : html`<div class="md-preview-empty">${b.previewEmpty}</div>`}
                  </div>
                </div>
              `
            : this.editorMode === 'write'
            ? html`
                <app-textarea
                  id="blog-md-textarea"
                  rows="16"
                  monospace
                  required
                  label="${b.fieldMarkdownContent}"
                  placeholder="${b.fieldMarkdownPlaceholder}"
                  .value="${this.formContent}"
                  @input="${(e: CustomEvent) => (this.formContent = eventValue(e))}"
                ></app-textarea>
              `
            : html`
                <div class="md-preview-pane" style="max-height: 500px;">
                  ${this.formContent.trim()
                    ? html`<app-markdown .content="${this.formContent}"></app-markdown>`
                    : html`<div class="md-preview-empty">${b.previewEmpty}</div>`}
                </div>
              `}
          ${this.formError ? html`<div class="form-error">${this.formError}</div>` : ''}
        </div>

        <div slot="footer" class="modal-footer-right">
          <app-button variant="ghost" @click="${() => (this.modalOpen = false)}">
            ${t.common.cancel}
          </app-button>
          <app-button variant="secondary" @click="${() => this.savePost('draft')}">
            ${b.saveDraftBtn}
          </app-button>
          <app-button variant="primary" @click="${() => this.savePost()}">
            ${this.editingPostId ? t.common.save : b.publishNowBtn}
          </app-button>
        </div>
      </app-modal>
    `;
  }

  private renderMarkdownToolbar(b: ReturnType<typeof getTranslation>['viewTexts']['blog']) {
    const tt = b.toolbarTitles;
    return html`
      <div class="md-toolbar">
        <button
          type="button"
          class="md-tool-btn"
          title="${tt.h2}"
          @click="${() => this.applyToolbarSnippet('\n## ', '\n', b.toolbarH2)}"
        >
          ${b.toolbarH2}
        </button>
        <button
          type="button"
          class="md-tool-btn"
          title="${tt.h3}"
          @click="${() => this.applyToolbarSnippet('\n### ', '\n', b.toolbarH3)}"
        >
          ${b.toolbarH3}
        </button>
        <span class="md-tool-sep"></span>
        <button
          type="button"
          class="md-tool-btn"
          title="${tt.bold}"
          @click="${() => this.applyToolbarSnippet('**', '**', b.toolbarBold)}"
        >
          ${b.toolbarBold}
        </button>
        <button
          type="button"
          class="md-tool-btn"
          title="${tt.italic}"
          @click="${() => this.applyToolbarSnippet('*', '*', b.toolbarItalic)}"
        >
          <em>${b.toolbarItalic}</em>
        </button>
        <button
          type="button"
          class="md-tool-btn"
          title="${tt.code}"
          @click="${() => this.applyToolbarSnippet('`', '`', 'code')}"
        >
          ${iconCode(13)}
          <span>${b.toolbarCode}</span>
        </button>
        <button
          type="button"
          class="md-tool-btn"
          title="${tt.codeBlock}"
          @click="${() => this.applyToolbarSnippet('\n```ts\n', '\n```\n', 'const value = 42;')}"
        >
          <span>${b.toolbarCodeBlock}</span>
        </button>
        <span class="md-tool-sep"></span>
        <button
          type="button"
          class="md-tool-btn"
          title="${tt.quote}"
          @click="${() => this.applyToolbarSnippet('\n> ', '\n', b.toolbarQuote)}"
        >
          <span>${b.toolbarQuote}</span>
        </button>
        <button
          type="button"
          class="md-tool-btn"
          title="${tt.list}"
          @click="${() => this.applyToolbarSnippet('\n- ', '\n', b.toolbarList)}"
        >
          ${iconList(13)}
          <span>${b.toolbarList}</span>
        </button>
        <button
          type="button"
          class="md-tool-btn"
          title="${tt.checklist}"
          @click="${() => this.applyToolbarSnippet('\n- [ ] ', '\n', b.toolbarChecklist)}"
        >
          <span>${b.toolbarChecklist}</span>
        </button>
        <span class="md-tool-sep"></span>
        <button
          type="button"
          class="md-tool-btn"
          title="${tt.link}"
          @click="${() => this.applyToolbarSnippet('[', '](https://example.com)', b.toolbarLink)}"
        >
          ${iconLink(13)}
          <span>${b.toolbarLink}</span>
        </button>
        <button
          type="button"
          class="md-tool-btn"
          title="${tt.table}"
          @click="${() =>
            this.applyToolbarSnippet(
              '\n| Col 1 | Col 2 |\n| :--- | ---: |\n| A | 100 |\n',
              '',
              ''
            )}"
        >
          ${iconColumns(13)}
          <span>${b.toolbarTable}</span>
        </button>
        <button
          type="button"
          class="md-tool-btn"
          title="${tt.hr}"
          @click="${() => this.applyToolbarSnippet('\n---\n', '', '')}"
        >
          <span>${b.toolbarHr}</span>
        </button>
      </div>
    `;
  }

  private renderDeleteDialogs(t: ReturnType<typeof getTranslation>) {
    const dlgPost = t.viewTexts.confirmDialogs.blogDelete;
    const dlgComment = t.viewTexts.confirmDialogs.blogCommentDelete;

    return html`
      <app-confirm-dialog
        .open="${Boolean(this.deletingPost)}"
        variant="danger"
        title="${dlgPost.title}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        action="${this.deletingPost ? dlgPost.action(this.deletingPost.title) : ''}"
        result="${dlgPost.result}"
        .confirmLabel="${t.common.delete}"
        .cancelLabel="${t.common.cancel}"
        @confirm="${() => {
          if (this.deletingPost) store.deleteBlogPost(this.deletingPost.id);
          this.deletingPost = null;
        }}"
        @cancel="${() => (this.deletingPost = null)}"
      ></app-confirm-dialog>

      <app-confirm-dialog
        .open="${Boolean(this.deletingComment)}"
        variant="danger"
        title="${dlgComment.title}"
        .actionLabel="${t.viewTexts.confirmSectionLabels.action}"
        .resultLabel="${t.viewTexts.confirmSectionLabels.result}"
        action="${dlgComment.action}"
        result="${dlgComment.result}"
        .confirmLabel="${t.common.delete}"
        .cancelLabel="${t.common.cancel}"
        @confirm="${() => {
          if (this.deletingComment) {
            store.deleteBlogComment(
              this.deletingComment.postId,
              this.deletingComment.comment.id
            );
          }
          this.deletingComment = null;
        }}"
        @cancel="${() => (this.deletingComment = null)}"
      ></app-confirm-dialog>
    `;
  }
}
