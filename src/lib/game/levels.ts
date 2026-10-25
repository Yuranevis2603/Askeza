export type Feature =
  | 'breathing'
  | 'screen_limit'
  | 'focus'
  | 'goal_body'
  | 'workouts'
  | 'goal_project'
  | 'goal_instagram'
  | 'reels'
  | 'posts'
  | 'analytics'
  | 'custom';

export type UnlockKind = 'goal' | 'training' | 'mission' | 'skill';

export type Unlock = { kind: UnlockKind; title: string };

export type Mission = { key: string; title: string; target: number; reward: number };

export type MetricKey =
  | 'reels_avg_7d'
  | 'screen_days_7d'
  | 'focus_total'
  | 'workouts_30d'
  | 'followers'
  | 'reels_published';

/** A condition that must hold to *reach* a level. */
export type Requirement =
  | { type: 'xp'; value: number }
  | { type: 'missions' }
  | { type: 'regularity'; minDays: number; weeks: number }
  | { type: 'metric'; metric: MetricKey; op: 'lte' | 'gte'; value: number; label: string; unit: string };

export type Phase = { name: string; levels: string };

export type Level = {
  n: number;
  name: string;
  theme: string;
  phase: number;
  features: Feature[];
  unlocks: Unlock[];
  /** Missions done on this level; all of them are needed for the next one. */
  missions: Mission[];
  requirements: Requirement[];
};

export const PHASES: Phase[] = [
  { name: 'Фокус', levels: '1–3' },
  { name: 'Тіло і справа', levels: '4–5' },
  { name: 'Голос', levels: '6–8' },
  { name: 'Майстерність', levels: '9–10' },
];

const reg = (minDays: number, weeks: number): Requirement => ({ type: 'regularity', minDays, weeks });
const xp = (value: number): Requirement => ({ type: 'xp', value });
const missions: Requirement = { type: 'missions' };

export const LEVELS: Level[] = [
  {
    n: 1, name: 'Пробудження', theme: 'Фокус і дихання', phase: 0,
    features: ['breathing'],
    unlocks: [
      { kind: 'training', title: 'Дихання «Квадрат», 3 хв' },
      { kind: 'skill', title: 'Помічати імпульс скролити' },
    ],
    missions: [{ key: 'l1_breath3', title: '3 дні поспіль дихання 3 хв', target: 3, reward: 60 }],
    requirements: [],
  },
  {
    n: 2, name: 'Тиша', theme: 'Менше безцільного скролингу', phase: 0,
    features: ['screen_limit'],
    unlocks: [
      { kind: 'training', title: '«Стоп-скрол»: 1 хв дихання замість Reels' },
      { kind: 'skill', title: 'Ліміт екранного часу' },
    ],
    missions: [
      { key: 'l2_reels45', title: '5 днів Reels ≤ 45 хв', target: 5, reward: 80 },
      { key: 'l2_phone_bed', title: 'Телефон поза спальнею 3 ночі', target: 3, reward: 60 },
    ],
    requirements: [xp(150), missions, reg(3, 1),
      { type: 'metric', metric: 'screen_days_7d', op: 'gte', value: 5, label: 'Записати час у Reels 5 днів за тиждень', unit: 'дн.' }],
  },
  {
    n: 3, name: 'Ясність', theme: 'Глибокий фокус', phase: 0,
    features: ['focus'],
    unlocks: [
      { kind: 'training', title: 'Фокус-сесії по 25 хв' },
      { kind: 'skill', title: 'Огляд дня' },
      { kind: 'skill', title: 'Глибокий фокус I' },
    ],
    missions: [
      { key: 'l3_focus5', title: '5 фокус-сесій по 25 хв', target: 5, reward: 100 },
      { key: 'l3_reels30', title: 'Reels ≤ 30 хв 5 днів', target: 5, reward: 80 },
    ],
    requirements: [xp(400), missions, reg(4, 1),
      { type: 'metric', metric: 'reels_avg_7d', op: 'lte', value: 40, label: 'Reels у середньому ≤ 40 хв на день', unit: 'хв' }],
  },
  {
    n: 4, name: 'Рух', theme: 'Регулярні тренування', phase: 1,
    features: ['goal_body', 'workouts'],
    unlocks: [
      { kind: 'goal', title: 'Спортивне тіло' },
      { kind: 'training', title: 'Програма «Все тіло А/Б», 2 рази на тиждень' },
      { kind: 'skill', title: 'Техніка базових вправ' },
    ],
    missions: [{ key: 'l4_workouts8', title: '8 тренувань (4 тижні по 2)', target: 8, reward: 150 }],
    requirements: [xp(750), missions, reg(4, 2),
      { type: 'metric', metric: 'focus_total', op: 'gte', value: 10, label: '10 фокус-сесій загалом', unit: 'сес.' }],
  },
  {
    n: 5, name: 'Будівник', theme: 'Робота над проєктом', phase: 1,
    features: ['goal_project'],
    unlocks: [
      { kind: 'goal', title: 'Власний проєкт' },
      { kind: 'skill', title: 'Планування етапів' },
    ],
    missions: [
      { key: 'l5_proj_focus', title: '4 фокус-сесії над проєктом', target: 4, reward: 100 },
      { key: 'l5_interviews', title: '10 інтерв’ю з людьми', target: 10, reward: 150 },
    ],
    requirements: [xp(1200), missions, reg(5, 1),
      { type: 'metric', metric: 'workouts_30d', op: 'gte', value: 8, label: '8 тренувань за 30 днів', unit: 'трен.' }],
  },
  {
    n: 6, name: 'Голос', theme: 'Instagram: оформлення профілю', phase: 2,
    features: ['goal_instagram'],
    unlocks: [
      { kind: 'goal', title: '10 000 підписників в Instagram' },
      { kind: 'mission', title: 'Чекліст профілю' },
      { kind: 'skill', title: 'Позиціонування профілю' },
    ],
    missions: [
      { key: 'l6_profile', title: 'Профіль: аватар, bio, хайлайти, закріплені пости', target: 5, reward: 150 },
      { key: 'l6_stopscroll', title: '5 разів «стоп-скрол» замість Reels', target: 5, reward: 80 },
      { key: 'l6_focus8', title: '8 фокус-сесій над проєктом', target: 8, reward: 200 },
      { key: 'l6_workouts2', title: '2 тренування за тиждень', target: 2, reward: 100 },
    ],
    requirements: [xp(1750), missions, reg(5, 2),
      { type: 'metric', metric: 'focus_total', op: 'gte', value: 25, label: '25 фокус-сесій загалом', unit: 'сес.' }],
  },
  {
    n: 7, name: 'Автор', theme: 'Instagram: створення Reels', phase: 2,
    features: ['reels'],
    unlocks: [
      { kind: 'goal', title: 'Етап «Перші 10 Reels»' },
      { kind: 'mission', title: 'Контент-план' },
      { kind: 'skill', title: 'Сценарій і монтаж Reels' },
    ],
    missions: [
      { key: 'l7_reels2', title: '2 Reels на тиждень', target: 2, reward: 120 },
      { key: 'l7_plan', title: 'Контент-план на місяць', target: 1, reward: 100 },
    ],
    requirements: [xp(2400), missions, reg(5, 2),
      { type: 'metric', metric: 'reels_avg_7d', op: 'lte', value: 20, label: 'Reels у середньому ≤ 20 хв на день', unit: 'хв' }],
  },
  {
    n: 8, name: 'Ритм', theme: 'Instagram: пости + 3 тренування', phase: 2,
    features: ['posts'],
    unlocks: [
      { kind: 'goal', title: 'Етап «Пости 3 рази на тиждень»' },
      { kind: 'training', title: 'Спліт «Верх/Низ», 3 рази на тиждень' },
      { kind: 'skill', title: 'Планер публікацій' },
    ],
    missions: [
      { key: 'l8_posts12', title: '12 постів за місяць', target: 12, reward: 200 },
      { key: 'l8_workouts12', title: '12 тренувань за місяць', target: 12, reward: 200 },
    ],
    requirements: [xp(3200), missions, reg(5, 3),
      { type: 'metric', metric: 'reels_published', op: 'gte', value: 10, label: '10 опублікованих Reels', unit: 'шт.' }],
  },
  {
    n: 9, name: 'Стратег', theme: 'Аналітика і бета проєкту', phase: 3,
    features: ['analytics'],
    unlocks: [
      { kind: 'goal', title: 'Етап «Бета для 20 людей»' },
      { kind: 'training', title: 'Силовий цикл на 8 тижнів' },
      { kind: 'skill', title: 'Аналітика й гіпотези' },
    ],
    missions: [
      { key: 'l9_analytics4', title: 'Огляд статистики Instagram 4 тижні', target: 4, reward: 150 },
      { key: 'l9_beta20', title: '20 бета-користувачів', target: 20, reward: 300 },
    ],
    requirements: [xp(4200), missions, reg(5, 4),
      { type: 'metric', metric: 'followers', op: 'gte', value: 2500, label: '2 500 підписників', unit: '' }],
  },
  {
    n: 10, name: 'Аскеза', theme: 'Майстерність і власні правила', phase: 3,
    features: ['custom'],
    unlocks: [
      { kind: 'goal', title: 'Власні цілі без обмежень' },
      { kind: 'mission', title: 'Власні місії' },
      { kind: 'skill', title: 'Режим наставника' },
    ],
    missions: [],
    requirements: [xp(5500), missions, reg(5, 6),
      { type: 'metric', metric: 'followers', op: 'gte', value: 5000, label: '5 000 підписників', unit: '' }],
  },
];

export const MAX_LEVEL = LEVELS.length;

export const COMEBACK_MISSIONS: Mission[] = [
  { key: 'cb_breath', title: 'Перезапуск: 3 дні поспіль дихання 3 хв', target: 3, reward: 60 },
  { key: 'cb_focus', title: 'Одна фокус-сесія над тим, що відкладав', target: 1, reward: 40 },
  { key: 'cb_review', title: '2 хвилини чесного огляду: що завадило?', target: 1, reward: 20 },
];

export const XP = { habit: 5, focus: 20, impression: 300 } as const;

export function levelByN(n: number): Level {
  return LEVELS[Math.min(Math.max(n, 1), MAX_LEVEL) - 1];
}

/** Everything unlocked so far. Uses the highest level ever reached, so a drop never takes features away. */
export function unlockedFeatures(maxLevel: number): Set<Feature> {
  return new Set(LEVELS.filter((l) => l.n <= maxLevel).flatMap((l) => l.features));
}

export function missionByKey(key: string): Mission | undefined {
  return LEVELS.flatMap((l) => l.missions).concat(COMEBACK_MISSIONS).find((m) => m.key === key);
}
