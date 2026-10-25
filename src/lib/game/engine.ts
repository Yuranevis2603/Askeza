import { COMEBACK_MISSIONS, Level, LEVELS, MAX_LEVEL, MetricKey, Requirement, levelByN } from './levels';

/** Calendar day as 'YYYY-MM-DD'. All game maths runs on days, never on timestamps. */
export type Day = string;

export type Player = {
  level: number;
  maxLevel: number;
  comeback: boolean;
  levelChangedOn: Day;
  createdOn: Day;
};

export type Stats = {
  totalXp: number;
  /** Distinct days that earned any XP (at least the last 8 weeks). */
  activeDays: Day[];
  metrics: Partial<Record<MetricKey, number | null>>;
  missionProgress: Record<string, number>;
};

export type Criterion = {
  type: Requirement['type'];
  label: string;
  value: string;
  target: string;
  pct: number;
  met: boolean;
};

export type SyncEvent = 'up' | 'down' | 'restored' | null;

const DROP_MIN_DAYS = 3;

export function localDay(date: Date, timeZone: string): Day {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function addDays(day: Day, n: number): Day {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `day`. */
export function weekStart(day: Day): Day {
  const dow = new Date(day + 'T00:00:00Z').getUTCDay();
  return addDays(day, -((dow + 6) % 7));
}

export function activeDaysInWeek(activeDays: Day[], monday: Day): number {
  const end = addDays(monday, 7);
  return new Set(activeDays.filter((d) => d >= monday && d < end)).size;
}

/**
 * Consecutive weeks, newest first, with at least `minDays` active days.
 * The current week counts only once it already qualifies, so an unfinished week never breaks a streak.
 */
export function regularWeeks(activeDays: Day[], today: Day, minDays: number): number {
  let monday = weekStart(today);
  let count = 0;
  if (activeDaysInWeek(activeDays, monday) >= minDays) count++;
  for (;;) {
    monday = addDays(monday, -7);
    if (activeDaysInWeek(activeDays, monday) >= minDays) count++;
    else return count;
  }
}

const fmt = (n: number) => Math.round(n).toLocaleString('uk-UA');
const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function criterion(req: Requirement, from: Level, stats: Stats, today: Day): Criterion {
  switch (req.type) {
    case 'xp':
      return {
        type: 'xp', label: 'XP',
        value: fmt(stats.totalXp), target: fmt(req.value),
        pct: clampPct((stats.totalXp / req.value) * 100),
        met: stats.totalXp >= req.value,
      };
    case 'missions': {
      const done = from.missions.filter((m) => (stats.missionProgress[m.key] ?? 0) >= m.target).length;
      const total = from.missions.length;
      return {
        type: 'missions', label: 'Місії рівня',
        value: `${done} з ${total}`, target: `${total}`,
        pct: total ? clampPct((done / total) * 100) : 100,
        met: done === total,
      };
    }
    case 'regularity': {
      const weeks = Math.min(regularWeeks(stats.activeDays, today, req.minDays), req.weeks);
      return {
        type: 'regularity', label: 'Регулярність',
        value: `${weeks} з ${req.weeks} тиж.`, target: `${req.minDays}+ активних днів на тиждень`,
        pct: clampPct((weeks / req.weeks) * 100),
        met: weeks >= req.weeks,
      };
    }
    case 'metric': {
      const v = stats.metrics[req.metric];
      const has = v !== null && v !== undefined;
      const met = has && (req.op === 'gte' ? v >= req.value : v <= req.value);
      const pct = !has ? 0 : req.op === 'gte' ? (v / req.value) * 100 : v === 0 ? 100 : (req.value / v) * 100;
      return {
        type: 'metric', label: 'Результат',
        value: has ? `${fmt(v)} ${req.unit}`.trim() : 'немає даних', target: req.label,
        pct: clampPct(pct), met,
      };
    }
  }
}

/** The conditions for moving from the player's level to the next one. Null at the top or during a comeback. */
export function nextLevelCriteria(player: Player, stats: Stats, today: Day): { next: Level; criteria: Criterion[] } | null {
  if (player.comeback || player.level >= MAX_LEVEL) return null;
  const from = levelByN(player.level);
  const next = levelByN(player.level + 1);
  return { next, criteria: next.requirements.map((r) => criterion(r, from, stats, today)) };
}

export function comebackDone(stats: Stats): number {
  return COMEBACK_MISSIONS.filter((m) => (stats.missionProgress[m.key] ?? 0) >= m.target).length;
}

/**
 * A level drops by one only after two full weeks in a row with fewer than 3 active days,
 * and never within two weeks of the last level change or of sign-up.
 */
export function shouldDrop(player: Player, stats: Stats, today: Day): boolean {
  if (player.level <= 1 || player.comeback) return false;
  const thisMonday = weekStart(today);
  const w1 = addDays(thisMonday, -7);
  const w2 = addDays(thisMonday, -14);
  if (player.levelChangedOn > w2 || player.createdOn > w2) return false;
  return activeDaysInWeek(stats.activeDays, w1) < DROP_MIN_DAYS && activeDaysInWeek(stats.activeDays, w2) < DROP_MIN_DAYS;
}

/** Applies level-up, drop and comeback rules. Pure: the caller persists the result. */
export function sync(player: Player, stats: Stats, today: Day): { player: Player; event: SyncEvent } {
  if (player.comeback) {
    if (comebackDone(stats) === COMEBACK_MISSIONS.length) {
      const level = Math.min(player.level + 1, player.maxLevel);
      return { player: { ...player, level, comeback: false, levelChangedOn: today }, event: 'restored' };
    }
    return { player, event: null };
  }

  let p = player;
  let rose = false;
  for (;;) {
    const n = nextLevelCriteria(p, stats, today);
    if (!n || !n.criteria.every((c) => c.met)) break;
    p = { ...p, level: n.next.n, maxLevel: Math.max(p.maxLevel, n.next.n), levelChangedOn: today };
    rose = true;
  }
  if (rose) return { player: p, event: 'up' };

  if (shouldDrop(p, stats, today)) {
    return { player: { ...p, level: p.level - 1, comeback: true, levelChangedOn: today }, event: 'down' };
  }
  return { player: p, event: null };
}

export function levelStatus(n: number, player: Player): 'done' | 'current' | 'next' | 'ahead' {
  if (n === player.level) return 'current';
  if (n <= player.maxLevel) return 'done';
  if (n === player.level + 1) return 'next';
  return 'ahead';
}

export { LEVELS };
