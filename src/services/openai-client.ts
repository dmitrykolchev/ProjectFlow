import type {
  Company,
  DocumentItem,
  KnowledgeArticle,
  Project,
  SupportedLang,
  TaskAiAnalysis,
  TaskAiContextRef,
} from '../types';
import type { getTranslation } from '../i18n';

export const DEFAULT_AI_ENDPOINT = 'http://127.0.0.1:47831/v1';

export type AiErrorCode = 'NETWORK_ERROR' | 'HTTP_ERROR' | 'EMPTY_RESPONSE' | 'PARSE_ERROR' | 'ABORTED';

export class AiClientError extends Error {
  public readonly code: AiErrorCode;
  public readonly status?: number;
  public readonly details?: string;

  constructor(code: AiErrorCode, message: string, status?: number, details?: string) {
    super(message);
    this.name = 'AiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type TaskContextMatchReason = 'direct' | 'project' | 'company' | 'keyword' | 'manual';

export interface TaskAiContextItem {
  key: string; // `${kind}:${id}`
  kind: 'knowledge' | 'document';
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
  snippet: string;
  score: number;
  reason: TaskContextMatchReason;
  selected: boolean;
  updatedAt?: string;
}

export interface TaskContextInput {
  id?: string;
  title: string;
  description?: string;
  projectId?: string;
  priority?: string;
  status?: string;
  estimatedHours?: number;
  loggedHours?: number;
  startDate?: string;
  dueDate?: string;
  tags?: string[];
  subtasks?: { id: string; title: string; completed: boolean }[];
}

export interface DocumentSummaryResult {
  summary: string;
  tags: string[];
  model: string;
}

export function normalizeOpenAIBaseUrl(raw?: string): string {
  const trimmed = (raw || '').trim() || DEFAULT_AI_ENDPOINT;
  const noTrailing = trimmed.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(noTrailing)) {
    return `http://${noTrailing}`;
  }
  return noTrailing;
}

export function formatAiError(
  err: unknown,
  endpoint: string,
  t: ReturnType<typeof getTranslation>
): string {
  const baseUrl = normalizeOpenAIBaseUrl(endpoint);
  if (err instanceof AiClientError) {
    if (err.code === 'NETWORK_ERROR') return t.viewTexts.ai.errors.network(baseUrl);
    if (err.code === 'HTTP_ERROR') {
      return t.viewTexts.ai.errors.http(err.status || 500, err.details || err.message);
    }
    if (err.code === 'EMPTY_RESPONSE') return t.viewTexts.ai.errors.empty;
    if (err.code === 'PARSE_ERROR') return t.viewTexts.ai.errors.parse;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return t.viewTexts.ai.errors.network(baseUrl);
}

export async function fetchAvailableModels(
  baseUrl?: string,
  signal?: AbortSignal
): Promise<string[]> {
  const endpoint = normalizeOpenAIBaseUrl(baseUrl);
  let res: Response;
  try {
    res = await fetch(`${endpoint}/models`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw new AiClientError('ABORTED', 'Request aborted');
    }
    throw new AiClientError('NETWORK_ERROR', (err as Error)?.message || 'Network error');
  }

  if (!res.ok) {
    const errText = await safeReadErrorText(res);
    throw new AiClientError('HTTP_ERROR', `HTTP ${res.status}`, res.status, errText);
  }

  try {
    const payload = (await res.json()) as {
      data?: Array<{ id?: string; model?: string }>;
      models?: Array<string | { id?: string; name?: string }>;
    };
    const list: string[] = [];
    if (Array.isArray(payload.data)) {
      for (const item of payload.data) {
        const id = item?.id || item?.model;
        if (id && !list.includes(id)) list.push(id);
      }
    }
    if (Array.isArray(payload.models)) {
      for (const item of payload.models) {
        const id = typeof item === 'string' ? item : item?.id || item?.name;
        if (id && !list.includes(id)) list.push(id);
      }
    }
    return list;
  } catch {
    return [];
  }
}

async function resolveModelName(baseUrl: string, configuredModel?: string): Promise<string> {
  const explicit = (configuredModel || '').trim();
  if (explicit) return explicit;
  try {
    const models = await fetchAvailableModels(baseUrl);
    if (models.length > 0) return models[0];
  } catch {
    // Let /chat/completions surface the actual connection/model error if unreachable
  }
  return 'default';
}

async function safeReadErrorText(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return res.statusText;
    try {
      const json = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
      if (typeof json.error === 'string') return json.error;
      if (json.error?.message) return json.error.message;
      if (json.message) return json.message;
    } catch {
      // plain text fallback
    }
    return text.slice(0, 280);
  } catch {
    return res.statusText || String(res.status);
  }
}

export async function chatCompletion(params: {
  baseUrl?: string;
  model?: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<{ content: string; model: string }> {
  const endpoint = normalizeOpenAIBaseUrl(params.baseUrl);
  const model = await resolveModelName(endpoint, params.model);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000);
  if (params.signal) {
    params.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        temperature: params.temperature ?? 0.3,
        ...(params.maxTokens ? { max_tokens: params.maxTokens } : {}),
        stream: false,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error)?.name === 'AbortError') {
      throw new AiClientError('ABORTED', 'Request aborted');
    }
    throw new AiClientError('NETWORK_ERROR', (err as Error)?.message || 'Network error');
  }

  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await safeReadErrorText(res);
    throw new AiClientError('HTTP_ERROR', `HTTP ${res.status}`, res.status, errText);
  }

  const data = (await res.json()) as {
    model?: string;
    choices?: Array<{
      message?: { content?: string | Array<{ type?: string; text?: string }> };
      text?: string;
    }>;
  };

  const first = data.choices?.[0];
  let content = '';
  if (typeof first?.message?.content === 'string') {
    content = first.message.content;
  } else if (Array.isArray(first?.message?.content)) {
    content = first.message.content.map((p) => p.text || '').join('\n');
  } else if (typeof first?.text === 'string') {
    content = first.text;
  }

  const trimmed = content.trim();
  if (!trimmed) {
    throw new AiClientError('EMPTY_RESPONSE', 'Empty completion response');
  }

  return {
    content: trimmed,
    model: data.model || model,
  };
}

function decodeDataUrlText(dataUrl?: string, mimeType?: string): string {
  if (!dataUrl || !dataUrl.startsWith('data:')) return '';
  const mime = (mimeType || dataUrl.slice(5, dataUrl.indexOf(';')) || '').toLowerCase();
  const isTextLike =
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('xml') ||
    mime.includes('svg') ||
    mime.includes('csv') ||
    mime.includes('javascript') ||
    mime.includes('yaml');
  if (!isTextLike) return '';

  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return '';
  const header = dataUrl.slice(0, commaIdx);
  const body = dataUrl.slice(commaIdx + 1);

  try {
    if (header.includes(';base64')) {
      const bin = atob(body);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }
    return decodeURIComponent(body);
  } catch {
    return '';
  }
}

export function extractDocumentTextContext(
  doc: Partial<DocumentItem>,
  linkedContext?: string
): string {
  const parts: string[] = [];
  if (doc.title) parts.push(`Title: ${doc.title}`);
  if (doc.fileName) parts.push(`File name: ${doc.fileName}`);
  if (doc.category) parts.push(`Category: ${doc.category}`);
  if (doc.scope) parts.push(`Scope: ${doc.scope}`);
  if (linkedContext) parts.push(`Linked context: ${linkedContext}`);
  if (doc.description?.trim()) parts.push(`Current description: ${doc.description.trim()}`);
  if (doc.tags && doc.tags.length > 0) parts.push(`Existing tags: ${doc.tags.join(', ')}`);

  const rawText =
    doc.textContent?.trim() || decodeDataUrlText(doc.dataUrl, doc.mimeType).trim();

  if (rawText) {
    parts.push(`Document content excerpt:\n${rawText.slice(0, 6500)}`);
  }
  return parts.join('\n');
}

function extractJsonObject<T>(raw: string): T | null {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(stripped) as T;
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function sanitizeTags(rawTags: unknown): string[] {
  if (!Array.isArray(rawTags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of rawTags) {
    const clean = String(item || '')
      .replace(/^#/, '')
      .trim()
      .toLowerCase();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
    if (out.length >= 8) break;
  }
  return out;
}

function sanitizeStringArray(raw: unknown, maxItems = 6): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

export async function generateDocumentSummaryAndTags(params: {
  doc: Partial<DocumentItem>;
  linkedContext?: string;
  lang: SupportedLang;
  baseUrl?: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<DocumentSummaryResult> {
  const contextText = extractDocumentTextContext(params.doc, params.linkedContext);
  const langName = params.lang === 'en' ? 'English' : 'Russian';

  const systemPrompt = [
    'You are an enterprise technical & business document analyst.',
    `Write all output text in ${langName}.`,
    'Return ONLY a valid JSON object with exact schema:',
    '{"summary": "<2-4 concise sentences capturing document purpose, key entities, constraints, or decisions>", "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]}',
    'Tags must be 4 to 7 short lowercase keywords without # symbols.',
  ].join('\n');

  const userPrompt = `Analyze the following document and generate its concise summary and tags:\n\n${contextText}`;

  const { content, model } = await chatCompletion({
    baseUrl: params.baseUrl,
    model: params.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.25,
    signal: params.signal,
  });

  const parsed = extractJsonObject<{ summary?: unknown; tags?: unknown }>(content);
  if (parsed && typeof parsed.summary === 'string' && parsed.summary.trim()) {
    return {
      summary: parsed.summary.trim(),
      tags: sanitizeTags(parsed.tags),
      model,
    };
  }

  // Fallback parser if local model returned plain text instead of strict JSON
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const tagsLine = lines.find((l) => /^tags?:/i.test(l) || /^т[еэ]ги:/i.test(l));
  const summaryLines = lines.filter((l) => l !== tagsLine);
  const fallbackTags = tagsLine
    ? tagsLine
        .replace(/^[^:]+:/, '')
        .split(/[,;#]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 7)
    : [];

  return {
    summary: summaryLines.join(' ').replace(/```/g, '').trim().slice(0, 800),
    tags: fallbackTags,
    model,
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zA-Zа-яА-ЯёЁ0-9_-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
}

export function retrieveTaskContext(params: {
  task: TaskContextInput;
  projects: Project[];
  companies: Company[];
  knowledgeArticles: KnowledgeArticle[];
  documents: DocumentItem[];
  maxAutoSelected?: number;
}): {
  selectedItems: TaskAiContextItem[];
  allCandidates: TaskAiContextItem[];
} {
  const { task, projects, companies, knowledgeArticles, documents } = params;
  const maxAuto = params.maxAutoSelected ?? 6;
  const project = projects.find((p) => p.id === task.projectId);
  const companyId = project?.companyId;

  const taskTokens = new Set(
    tokenize(
      [
        task.title || '',
        task.description || '',
        ...(task.tags || []),
        project?.name || '',
        project?.key || '',
      ].join(' ')
    )
  );
  const taskTagSet = new Set((task.tags || []).map((t) => t.toLowerCase()));

  const candidates: TaskAiContextItem[] = [];

  for (const art of knowledgeArticles) {
    let score = 0;
    let reason: TaskContextMatchReason = 'keyword';

    if (task.id && (art.linkedTaskIds || []).includes(task.id)) {
      score += 120;
      reason = 'direct';
    } else if (task.projectId && art.projectId === task.projectId) {
      score += 50;
      reason = 'project';
    } else if (companyId && art.companyId === companyId) {
      score += 30;
      reason = 'company';
    }

    const artTags = (art.tags || []).map((t) => t.toLowerCase());
    for (const tag of artTags) {
      if (taskTagSet.has(tag)) score += 16;
    }

    const artTokens = new Set(
      tokenize(`${art.title} ${art.summary} ${art.tags.join(' ')} ${art.content.slice(0, 900)}`)
    );
    let tokenHits = 0;
    for (const tok of taskTokens) {
      if (artTokens.has(tok)) tokenHits++;
    }
    score += Math.min(tokenHits * 8, 40);
    if (art.pinned || art.status === 'verified') score += 4;

    const proj = art.projectId ? projects.find((p) => p.id === art.projectId) : undefined;
    const comp = art.companyId ? companies.find((c) => c.id === art.companyId) : undefined;
    const subtitle = proj
      ? `[${proj.key}] ${proj.name}`
      : comp
      ? comp.name
      : art.category;

    const bodyExcerpt = `${art.summary}\n${art.content}`.trim().slice(0, 1400);

    candidates.push({
      key: `knowledge:${art.id}`,
      kind: 'knowledge',
      id: art.id,
      title: art.title,
      subtitle,
      tags: art.tags || [],
      snippet: bodyExcerpt,
      score,
      reason,
      selected: false,
      updatedAt: art.updatedAt,
    });
  }

  for (const doc of documents) {
    let score = 0;
    let reason: TaskContextMatchReason = 'keyword';

    if (task.id && doc.taskId === task.id) {
      score += 125;
      reason = 'direct';
    } else if (task.projectId && doc.projectId === task.projectId) {
      score += 50;
      reason = 'project';
    } else if (companyId && doc.companyId === companyId) {
      score += 30;
      reason = 'company';
    }

    const docTags = (doc.tags || []).map((t) => t.toLowerCase());
    for (const tag of docTags) {
      if (taskTagSet.has(tag)) score += 16;
    }

    const docText =
      doc.textContent?.trim() || decodeDataUrlText(doc.dataUrl, doc.mimeType).trim();
    const docTokens = new Set(
      tokenize(`${doc.title} ${doc.fileName} ${doc.description} ${doc.tags.join(' ')} ${docText.slice(0, 900)}`)
    );
    let tokenHits = 0;
    for (const tok of taskTokens) {
      if (docTokens.has(tok)) tokenHits++;
    }
    score += Math.min(tokenHits * 8, 40);
    if (doc.status === 'approved') score += 3;

    const proj = doc.projectId ? projects.find((p) => p.id === doc.projectId) : undefined;
    const comp = doc.companyId ? companies.find((c) => c.id === doc.companyId) : undefined;
    const subtitle = proj
      ? `[${proj.key}] ${doc.fileName}`
      : comp
      ? `${comp.name} · ${doc.fileName}`
      : doc.fileName;

    const snippetParts = [
      `File: ${doc.fileName} (${doc.category})`,
      doc.description ? `Summary: ${doc.description}` : '',
      docText ? `Content:\n${docText.slice(0, 1200)}` : '',
    ].filter(Boolean);

    candidates.push({
      key: `document:${doc.id}`,
      kind: 'document',
      id: doc.id,
      title: doc.title,
      subtitle,
      tags: doc.tags || [],
      snippet: snippetParts.join('\n'),
      score,
      reason,
      selected: false,
      updatedAt: doc.updatedAt,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  let autoCount = 0;
  for (const item of candidates) {
    if (item.score >= 16 && autoCount < maxAuto) {
      item.selected = true;
      autoCount++;
    }
  }

  return {
    selectedItems: candidates.filter((c) => c.selected),
    allCandidates: candidates,
  };
}

function formatContextForPrompt(items: TaskAiContextItem[]): string {
  if (items.length === 0) return 'No linked knowledge base articles or documents were attached.';
  return items
    .map(
      (item, idx) =>
        `[Source ${idx + 1} | ${item.kind.toUpperCase()} | ${item.id}] ${item.title}\n${item.snippet.slice(0, 1300)}`
    )
    .join('\n\n---\n\n');
}

export async function generateTaskDescription(params: {
  task: TaskContextInput;
  contextItems: TaskAiContextItem[];
  projectName?: string;
  lang: SupportedLang;
  baseUrl?: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<{ description: string; model: string }> {
  const { task, contextItems, projectName, lang } = params;
  const langName = lang === 'en' ? 'English' : 'Russian';

  const systemPrompt = [
    'You are a senior software/project architect writing clear, structured task specifications.',
    `Write the entire description in ${langName}.`,
    'Ground technical constraints, naming, and architecture choices in the provided Knowledge Base articles and Documents when relevant.',
    'Produce clean, practical prose with concise sections (Goal, Scope / Requirements, Acceptance Criteria) without surrounding markdown fences or JSON.',
  ].join('\n');

  const taskMeta = [
    task.id ? `Task ID: ${task.id}` : '',
    `Title: ${task.title}`,
    projectName ? `Project: ${projectName}` : '',
    task.priority ? `Priority: ${task.priority}` : '',
    task.estimatedHours ? `Estimated effort: ${task.estimatedHours}h` : '',
    task.tags?.length ? `Tags: ${task.tags.join(', ')}` : '',
    task.description?.trim() ? `Existing notes/draft:\n${task.description.trim()}` : '',
    task.subtasks?.length
      ? `Current subtasks:\n${task.subtasks.map((s) => `- ${s.title}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const userPrompt = [
    'Draft or enrich the task description using the task metadata and workspace context below.',
    '',
    '### TASK METADATA',
    taskMeta,
    '',
    '### KNOWLEDGE BASE & DOCUMENTS CONTEXT',
    formatContextForPrompt(contextItems),
  ].join('\n');

  const { content, model } = await chatCompletion({
    baseUrl: params.baseUrl,
    model: params.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.35,
    signal: params.signal,
  });

  return {
    description: content.replace(/^```(?:markdown|md|txt)?\s*/i, '').replace(/```\s*$/i, '').trim(),
    model,
  };
}

export async function analyzeTaskWithContext(params: {
  task: TaskContextInput;
  contextItems: TaskAiContextItem[];
  projectName?: string;
  timeSummary?: string;
  expenseSummary?: string;
  discussionsSummary?: string;
  lang: SupportedLang;
  baseUrl?: string;
  model?: string;
  signal?: AbortSignal;
}): Promise<TaskAiAnalysis> {
  const { task, contextItems, projectName, lang } = params;
  const langName = lang === 'en' ? 'English' : 'Russian';

  const systemPrompt = [
    'You are a principal engineering & delivery lead analyzing a project task against corporate Knowledge Base standards and Document Library specifications.',
    `Write all output text in ${langName}.`,
    'Return ONLY a valid JSON object with exact schema:',
    '{',
    '  "overview": "<3-4 sentence executive & technical assessment referencing relevant context docs>",',
    '  "effortAssessment": "<1-2 sentences evaluating estimate vs logged hours, timeline, and scope>",',
    '  "risks": ["<risk or blocker 1>", "<risk 2>", "<risk 3>"],',
    '  "recommendations": ["<concrete action/architecture step 1>", "<step 2>", "<step 3>"],',
    '  "suggestedSubtasks": ["<concise actionable subtask 1>", "<subtask 2>", "<subtask 3>"]',
    '}',
  ].join('\n');

  const taskBlock = [
    task.id ? `Task ID: ${task.id}` : '',
    `Title: ${task.title}`,
    projectName ? `Project: ${projectName}` : '',
    task.status ? `Status: ${task.status}` : '',
    task.priority ? `Priority: ${task.priority}` : '',
    task.startDate || task.dueDate ? `Schedule: ${task.startDate || '?'} -> ${task.dueDate || '?'}` : '',
    `Hours: estimated ${task.estimatedHours ?? 0}h, logged ${task.loggedHours ?? 0}h`,
    task.tags?.length ? `Tags: ${task.tags.join(', ')}` : '',
    task.description?.trim() ? `Description:\n${task.description.trim()}` : 'Description: (none)',
    task.subtasks?.length
      ? `Subtasks (${task.subtasks.filter((s) => s.completed).length}/${task.subtasks.length} done):\n${task.subtasks
          .map((s) => `- [${s.completed ? 'x' : ' '}] ${s.title}`)
          .join('\n')}`
      : 'Subtasks: (none)',
    params.timeSummary ? `Time Tracking:\n${params.timeSummary}` : '',
    params.expenseSummary ? `Expenses:\n${params.expenseSummary}` : '',
    params.discussionsSummary ? `Recent Discussions:\n${params.discussionsSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const userPrompt = [
    'Analyze this task using the corporate Knowledge Base and Documents context below:',
    '',
    '### TASK DETAILS',
    taskBlock,
    '',
    '### KNOWLEDGE BASE & DOCUMENTS CONTEXT',
    formatContextForPrompt(contextItems),
  ].join('\n');

  const { content, model } = await chatCompletion({
    baseUrl: params.baseUrl,
    model: params.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.25,
    signal: params.signal,
  });

  const parsed = extractJsonObject<{
    overview?: unknown;
    effortAssessment?: unknown;
    risks?: unknown;
    recommendations?: unknown;
    suggestedSubtasks?: unknown;
  }>(content);

  const contextSources: TaskAiContextRef[] = contextItems.map((item) => ({
    kind: item.kind,
    id: item.id,
    title: item.title,
    reason: item.reason,
  }));

  if (parsed && typeof parsed.overview === 'string' && parsed.overview.trim()) {
    return {
      overview: parsed.overview.trim(),
      effortAssessment:
        typeof parsed.effortAssessment === 'string' ? parsed.effortAssessment.trim() : '',
      risks: sanitizeStringArray(parsed.risks, 6),
      recommendations: sanitizeStringArray(parsed.recommendations, 6),
      suggestedSubtasks: sanitizeStringArray(parsed.suggestedSubtasks, 5),
      contextSources,
      model,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    overview: content.replace(/```/g, '').trim().slice(0, 1200),
    effortAssessment: '',
    risks: [],
    recommendations: [],
    suggestedSubtasks: [],
    contextSources,
    model,
    updatedAt: new Date().toISOString(),
  };
}
