import { Project, Task, TaskPriority, TaskStatus, User } from '../types';

export const initialUsers: User[] = [
  {
    id: 'user-1',
    name: 'Александр Морозов',
    email: 'a.morozov@projectflow.dev',
    avatar: 'AM',
    role: 'Lead Architect',
  },
  {
    id: 'user-2',
    name: 'Елена Смирнова',
    email: 'e.smirnova@projectflow.dev',
    avatar: 'ES',
    role: 'Frontend Engineer',
  },
  {
    id: 'user-3',
    name: 'Дмитрий Волков',
    email: 'd.volkov@projectflow.dev',
    avatar: 'DV',
    role: 'Backend Engineer',
  },
  {
    id: 'user-4',
    name: 'Ольга Кузнецова',
    email: 'o.kuznetsova@projectflow.dev',
    avatar: 'OK',
    role: 'Product Designer',
  },
  {
    id: 'user-5',
    name: 'Максим Соколов',
    email: 'm.sokolov@projectflow.dev',
    avatar: 'MS',
    role: 'QA & Security Specialist',
  },
];

export const initialProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Core Platform 3.0',
    key: 'CORE',
    description: 'Масштабирование микросервисов, WebAssembly рантайм и оптимизация производительности',
    color: '#6366f1',
    dueDate: '2026-12-15',
    progress: 68,
  },
  {
    id: 'proj-2',
    name: 'Mobile Client NextGen',
    key: 'MOB',
    description: 'Нативная поддержка оффлайн-режима, биометрия и PWA-модули',
    color: '#10b981',
    dueDate: '2026-11-30',
    progress: 42,
  },
  {
    id: 'proj-3',
    name: 'Security & Compliance 2026',
    key: 'SEC',
    description: 'Аудит SOC2 Type II, сквозное шифрование и ролевая модель RBAC',
    color: '#f59e0b',
    dueDate: '2026-12-31',
    progress: 85,
  },
  {
    id: 'proj-4',
    name: 'Data & Analytics Engine',
    key: 'DATA',
    description: 'Потоковая аналитика в реальном времени, ClickHouse витрины и прогнозирование SLA',
    color: '#06b6d4',
    dueDate: '2027-03-31',
    progress: 54,
  },
];

const featuredTasks: Task[] = [
  {
    id: 'CORE-101',
    projectId: 'proj-1',
    title: 'Архитектура распределенного кэширования L2',
    description: 'Спроектировать двухуровневый кэш на базе Redis Cluster и локального LRU для снижения нагрузки на БД до 70%.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: 'user-1',
    startDate: '2026-11-05',
    dueDate: '2026-11-16',
    estimatedHours: 32,
    loggedHours: 20,
    tags: ['Architecture', 'Performance', 'Redis'],
    subtasks: [
      { id: 'sub-1', title: 'Спецификация схемы инвалидации', completed: true },
      { id: 'sub-2', title: 'Бенчмарк задержек p99', completed: true },
      { id: 'sub-3', title: 'Реализация клиента на Go', completed: false },
      { id: 'sub-4', title: 'Стресс-тестирование в staging', completed: false },
    ],
    order: 0,
    createdAt: '2026-11-04T10:00:00Z',
    updatedAt: '2026-11-10T14:30:00Z',
  },
  {
    id: 'CORE-102',
    projectId: 'proj-1',
    title: 'Оптимизация бандла Web-компонентов Lit',
    description: 'Исключить дублирующие полифилы, настроить tree-shaking и уменьшить initial JS payload до < 80KB.',
    status: 'review',
    priority: 'high',
    assigneeId: 'user-2',
    startDate: '2026-11-08',
    dueDate: '2026-11-14',
    estimatedHours: 24,
    loggedHours: 22,
    tags: ['Frontend', 'Lit', 'Rollup'],
    subtasks: [
      { id: 'sub-5', title: 'Анализ rollup visualizer', completed: true },
      { id: 'sub-6', title: 'Минификация CSS внутри Lit templates', completed: true },
      { id: 'sub-7', title: 'Тестирование в Safari и Chrome', completed: false },
    ],
    order: 1,
    createdAt: '2026-11-06T11:15:00Z',
    updatedAt: '2026-11-11T09:20:00Z',
  },
  {
    id: 'CORE-103',
    projectId: 'proj-1',
    title: 'Реализация виртуализации списков Data Grid',
    description: 'Обеспечить плавный скроллинг 10 000+ строк со скоростью 60 FPS с помощью CSS containment и dynamic slice rendering.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 'user-2',
    startDate: '2026-11-10',
    dueDate: '2026-11-20',
    estimatedHours: 40,
    loggedHours: 14,
    tags: ['DataGrid', 'Performance'],
    subtasks: [
      { id: 'sub-8', title: 'Прототип со scroll-listener', completed: true },
      { id: 'sub-9', title: 'Бинарный поиск позиций строк', completed: true },
      { id: 'sub-10', title: 'Интеграция клавиатурной навигации', completed: false },
    ],
    order: 2,
    createdAt: '2026-11-09T08:00:00Z',
    updatedAt: '2026-11-11T12:00:00Z',
  },
  {
    id: 'CORE-104',
    projectId: 'proj-1',
    title: 'Рефакторинг API Gateway и gRPC роутинга',
    description: 'Перевести внутренние коммуникации на gRPC-Web со стримингом событий для снижения overhead HTTP/1.1.',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'user-3',
    startDate: '2026-11-15',
    dueDate: '2026-11-25',
    estimatedHours: 36,
    loggedHours: 0,
    tags: ['Backend', 'gRPC', 'API'],
    subtasks: [
      { id: 'sub-11', title: 'Генерация protobuf схем', completed: false },
      { id: 'sub-12', title: 'Миграция эндпоинтов задач', completed: false },
    ],
    order: 3,
    createdAt: '2026-11-10T16:00:00Z',
    updatedAt: '2026-11-10T16:00:00Z',
  },
  {
    id: 'MOB-201',
    projectId: 'proj-2',
    title: 'Синхронизация локальной базы данных SQLite / IndexedDB',
    description: 'Двунаправленная синхронизация состояния задач в оффлайне с разрешением конфликтов Last-Write-Wins.',
    status: 'todo',
    priority: 'high',
    assigneeId: 'user-3',
    startDate: '2026-11-12',
    dueDate: '2026-11-22',
    estimatedHours: 30,
    loggedHours: 0,
    tags: ['Offline', 'Mobile', 'Sync'],
    subtasks: [
      { id: 'sub-13', title: 'Индексация локального хранилища', completed: false },
      { id: 'sub-14', title: 'Очередь отложенных мутаций', completed: false },
    ],
    order: 0,
    createdAt: '2026-11-08T09:30:00Z',
    updatedAt: '2026-11-08T09:30:00Z',
  },
  {
    id: 'MOB-202',
    projectId: 'proj-2',
    title: 'Редизайн карточек задач и адаптивная верстка',
    description: 'Разработать мобильную сетку карточек с поддержкой свайпов, жестов и темной темы.',
    status: 'done',
    priority: 'medium',
    assigneeId: 'user-4',
    startDate: '2026-11-01',
    dueDate: '2026-11-09',
    estimatedHours: 28,
    loggedHours: 28,
    tags: ['Design', 'UI/UX', 'Mobile'],
    subtasks: [
      { id: 'sub-15', title: 'Figma-макеты мобильных карточек', completed: true },
      { id: 'sub-16', title: 'Прототип свайпов в веб-компонентах', completed: true },
      { id: 'sub-17', title: 'Тестирование контрастности в Dark Mode', completed: true },
    ],
    order: 1,
    createdAt: '2026-10-31T14:00:00Z',
    updatedAt: '2026-11-09T18:00:00Z',
  },
  {
    id: 'SEC-301',
    projectId: 'proj-3',
    title: 'Аудит безопасности зависимостей и SAST анализ',
    description: 'Автоматический анализ уязвимостей в CI/CD пайплайне, проверка на OWASP Top 10 и CSP-политики.',
    status: 'done',
    priority: 'urgent',
    assigneeId: 'user-5',
    startDate: '2026-11-02',
    dueDate: '2026-11-08',
    estimatedHours: 20,
    loggedHours: 19,
    tags: ['Security', 'Audit', 'DevSecOps'],
    subtasks: [
      { id: 'sub-18', title: 'Настройка сканера Semgrep', completed: true },
      { id: 'sub-19', title: 'Устранение устаревших transitive deps', completed: true },
      { id: 'sub-20', title: 'Формирование отчета аудита', completed: true },
    ],
    order: 0,
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-08T17:45:00Z',
  },
  {
    id: 'SEC-302',
    projectId: 'proj-3',
    title: 'Внедрение гранулярных прав доступа RBAC',
    description: 'Настройка матрицы разрешений для ролей: Admin, Project Manager, Developer, Viewer.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 'user-5',
    startDate: '2026-11-09',
    dueDate: '2026-11-18',
    estimatedHours: 32,
    loggedHours: 16,
    tags: ['Security', 'RBAC', 'Auth'],
    subtasks: [
      { id: 'sub-21', title: 'Модель разрешений в базе данных', completed: true },
      { id: 'sub-22', title: 'Middleware проверки прав', completed: true },
      { id: 'sub-23', title: 'UI селектор ролей в настройках команды', completed: false },
    ],
    order: 1,
    createdAt: '2026-11-08T15:20:00Z',
    updatedAt: '2026-11-11T11:00:00Z',
  },
  {
    id: 'CORE-105',
    projectId: 'proj-1',
    title: 'Интеграция экспорта диаграммы Ганта в PDF и PNG',
    description: 'Создание легковесного экспортера графиков без потери четкости векторных элементов.',
    status: 'backlog',
    priority: 'low',
    assigneeId: 'user-2',
    startDate: '2026-11-22',
    dueDate: '2026-12-05',
    estimatedHours: 18,
    loggedHours: 0,
    tags: ['Gantt', 'Export'],
    subtasks: [
      { id: 'sub-24', title: 'Генерация SVG canvas', completed: false },
    ],
    order: 4,
    createdAt: '2026-11-10T12:00:00Z',
    updatedAt: '2026-11-10T12:00:00Z',
  },
  {
    id: 'CORE-106',
    projectId: 'proj-1',
    title: 'Внедрение системы автоматических уведомлений в UI',
    description: 'Всплывающие toast-оповещения с плавным стеком, авто-скрытием и звуковыми профилями.',
    status: 'review',
    priority: 'medium',
    assigneeId: 'user-4',
    startDate: '2026-11-07',
    dueDate: '2026-11-13',
    estimatedHours: 16,
    loggedHours: 15,
    tags: ['UI/UX', 'Notifications'],
    subtasks: [
      { id: 'sub-25', title: 'Компонент Toast контейнера', completed: true },
      { id: 'sub-26', title: 'Интеграция с шиной событий store', completed: true },
    ],
    order: 5,
    createdAt: '2026-11-06T16:00:00Z',
    updatedAt: '2026-11-11T13:10:00Z',
  },
];

const DAY_MS = 1000 * 60 * 60 * 24;

function formatUtcDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateMockTasks(count: number): Task[] {
  const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
  const assignees = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
  const projects = [
    { id: 'proj-1', key: 'CORE', name: 'Core Platform 3.0', baseNum: 107 },
    { id: 'proj-2', key: 'MOB', name: 'Mobile Client NextGen', baseNum: 203 },
    { id: 'proj-3', key: 'SEC', name: 'Security & Compliance 2026', baseNum: 303 },
    { id: 'proj-4', key: 'DATA', name: 'Data & Analytics Engine', baseNum: 401 },
  ];

  const actions = [
    'Оптимизация',
    'Рефакторинг',
    'Внедрение',
    'Миграция',
    'Проектирование',
    'Автоматизация',
    'Настройка',
    'Тестирование',
    'Масштабирование',
    'Аудит',
    'Интеграция',
    'Стабилизация',
  ];

  const subjectsByProject: Record<string, string[]> = {
    'proj-1': [
      'пула воркеров WebAssembly',
      'маршрутизатора HTTP/3',
      'движка виртуального скроллинга',
      'балансировщика gRPC потоков',
      'локального LRU-кэша',
      'библиотеки Lit-компонентов',
      'системы трассировки OpenTelemetry',
      'очереди фоновых джобов',
      'реестра дизайн-токенов',
      'сборщика Rollup & esbuild',
    ],
    'proj-2': [
      'оффлайн-режима в IndexedDB',
      'биометрической авторизации WebAuthn',
      'жестов навигации для карточек',
      'push-уведомлений Service Worker',
      'адаптивного календаря спринтов',
      'сжатия медиа-вложений',
      'фоновой синхронизации дельт',
      'темной темы для OLED экранов',
      'компонентов быстрого ввода',
      'профилирования расхода батареи',
    ],
    'proj-3': [
      'политик CSP и CORS',
      'ротации JWT и refresh токенов',
      'матрицы прав доступа RBAC',
      'шифрования персональных данных PII',
      'журнала аудита безопасности',
      'SAST сканирования в CI/CD',
      'изоляции тенантов в PostgreSQL',
      'контроля утечек секретов',
      'соответствия требованиям SOC2',
      'защиты от CSRF и rate-limiting',
    ],
    'proj-4': [
      'витрин аналитики в ClickHouse',
      'пайплайна ETL событий',
      'дашборда прогнозирования сроков',
      'агрегатора метрик SLA команды',
      'экспорта отчетов в CSV и PDF',
      'потоковой обработки Kafka-топиков',
      'детектора аномалий загрузки',
      'индексации полнотекстового поиска',
      'кластеризации тегов задач',
      'архивации исторических логов',
    ],
  };

  const tagPools: Record<string, string[][]> = {
    'proj-1': [
      ['Architecture', 'Performance'],
      ['Frontend', 'Lit'],
      ['Backend', 'gRPC'],
      ['Rollup', 'Build'],
      ['DataGrid', 'UI/UX'],
    ],
    'proj-2': [
      ['Mobile', 'Offline'],
      ['PWA', 'Sync'],
      ['UI/UX', 'Design'],
      ['Auth', 'Mobile'],
      ['Performance', 'Storage'],
    ],
    'proj-3': [
      ['Security', 'RBAC'],
      ['Audit', 'Compliance'],
      ['DevSecOps', 'CI/CD'],
      ['Auth', 'Crypto'],
      ['Security', 'API'],
    ],
    'proj-4': [
      ['Analytics', 'ETL'],
      ['Data', 'ClickHouse'],
      ['Export', 'Reporting'],
      ['Search', 'Indexing'],
      ['Metrics', 'SLA'],
    ],
  };

  // Deliberately include shared dates & hour buckets so multi-column sorting / grouping creates rich ties
  const anchorStartMs = Date.UTC(2026, 0, 5); // 2026-01-05
  const horizonDays = 520; // spans Jan 2026 -> Jun 2027 (including dense coverage around Nov 2026)
  const counters: Record<string, number> = {};
  const tasks: Task[] = [];

  for (let i = 0; i < count; i++) {
    const proj = projects[(i * 7 + (i >> 2)) % projects.length];
    const seq = counters[proj.id] ?? 0;
    counters[proj.id] = seq + 1;
    const id = `${proj.key}-${proj.baseNum + seq}`;

    // Deterministic pseudo-random distribution with deliberate ties
    const status = statuses[(i * 3 + Math.floor(i / 7)) % statuses.length];
    const priority = priorities[(i * 5 + Math.floor(i / 11)) % priorities.length];
    const assigneeId = assignees[(i * 2 + Math.floor(i / 5)) % assignees.length];

    const action = actions[(i * 3 + seq) % actions.length];
    const subjects = subjectsByProject[proj.id];
    const subject = subjects[(i + seq * 3) % subjects.length];
    const title = `${action} ${subject} (#${seq + 1})`;

    // Cluster ~25% of tasks around Oct-Dec 2026 for rich default Calendar/Gantt view, rest across 2026-2027
    let startOffsetDays: number;
    if (i % 4 === 0) {
      // Oct 20 - Dec 10, 2026 (days ~288 to ~340 from 2026-01-05)
      startOffsetDays = 288 + ((i * 3) % 50);
    } else {
      startOffsetDays = ((i * 29) % horizonDays);
      // Align some start dates onto 7-day buckets to create intentional date ties for multi-sort
      if (i % 3 === 0) {
        startOffsetDays = Math.floor(startOffsetDays / 7) * 7;
      }
    }

    const durationDays = 3 + ((i * 11) % 36);
    const startMs = anchorStartMs + startOffsetDays * DAY_MS;
    const dueMs = startMs + durationDays * DAY_MS;
    const startDate = formatUtcDate(startMs);
    const dueDate = formatUtcDate(dueMs);

    const subtaskCount = 2 + (i % 4);
    const completedCount =
      status === 'done'
        ? subtaskCount
        : status === 'review'
        ? Math.max(1, subtaskCount - 1)
        : status === 'in_progress'
        ? Math.max(1, Math.floor(subtaskCount / 2))
        : status === 'todo' && i % 3 === 0
        ? 1
        : 0;

    const subtasks: Task['subtasks'] = Array.from({ length: subtaskCount }, (_, sIdx) => ({
      id: `sub-gen-${i}-${sIdx}`,
      title: `Этап ${sIdx + 1}: ${sIdx === 0 ? 'Анализ требований' : sIdx === 1 ? 'Реализация' : sIdx === 2 ? 'Ревью и тесты' : 'Релиз'}`,
      completed: sIdx < completedCount,
    }));

    const estimatedHours = [8, 12, 16, 24, 32, 40, 48][(i + seq) % 7];
    const progressRatio = subtaskCount > 0 ? completedCount / subtaskCount : 0;
    const loggedHours = Math.round(estimatedHours * progressRatio);

    const tags = tagPools[proj.id][(i + seq) % tagPools[proj.id].length];
    const createdIso = new Date(startMs - 2 * DAY_MS).toISOString();
    const updatedIso = new Date(Math.min(Date.UTC(2026, 10, 13), startMs + 3 * DAY_MS)).toISOString();

    tasks.push({
      id,
      projectId: proj.id,
      title,
      description: `Рабочий пакет ${id} в рамках проекта ${proj.name}. Включает проектирование, реализацию и верификацию интеграционных сценариев.`,
      status,
      priority,
      assigneeId,
      startDate,
      dueDate,
      estimatedHours,
      loggedHours,
      tags,
      subtasks,
      order: i + 10,
      createdAt: createdIso,
      updatedAt: updatedIso,
    });
  }

  return tasks;
}

export const initialTasks: Task[] = [...featuredTasks, ...generateMockTasks(270)];
