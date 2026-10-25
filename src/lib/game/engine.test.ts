import { describe, expect, it } from 'vitest';
import { addDays, nextLevelCriteria, Player, regularWeeks, shouldDrop, Stats, sync, weekStart } from './engine';
import { COMEBACK_MISSIONS, LEVELS, unlockedFeatures } from './levels';

const today = '2026-10-25'; // Sunday

function days(from: string, n: number, step = 1): string[] {
  return Array.from({ length: n }, (_, i) => addDays(from, i * step));
}

const base: Player = { level: 6, maxLevel: 6, comeback: false, levelChangedOn: '2026-08-01', createdOn: '2026-06-01' };

function stats(over: Partial<Stats> = {}): Stats {
  return { totalXp: 0, activeDays: [], metrics: {}, missionProgress: {}, ...over };
}

function allMissions(level: number): Record<string, number> {
  return Object.fromEntries(LEVELS[level - 1].missions.map((m) => [m.key, m.target]));
}

describe('dates', () => {
  it('finds Monday', () => {
    expect(weekStart('2026-10-25')).toBe('2026-10-19');
    expect(weekStart('2026-10-19')).toBe('2026-10-19');
  });

  it('counts regular weeks and ignores an unfinished current week', () => {
    // 5 active days in each of the two previous weeks, only 2 so far this week
    const active = [...days('2026-10-05', 5), ...days('2026-10-12', 5), ...days('2026-10-19', 2)];
    expect(regularWeeks(active, '2026-10-21', 5)).toBe(2);
    expect(regularWeeks(active, '2026-10-21', 6)).toBe(0);
  });
});

describe('level up', () => {
  it('needs all four conditions, not just XP', () => {
    const s = stats({ totalXp: 5000, activeDays: days('2026-10-05', 21), metrics: { reels_avg_7d: 23 }, missionProgress: allMissions(6) });
    const n = nextLevelCriteria(base, s, today)!;
    expect(n.next.n).toBe(7);
    expect(n.criteria.map((c) => c.met)).toEqual([true, true, true, false]);
    expect(sync(base, s, today).event).toBeNull();
  });

  it('rises when everything is met', () => {
    const s = stats({ totalXp: 2400, activeDays: days('2026-10-05', 21), metrics: { reels_avg_7d: 18 }, missionProgress: allMissions(6) });
    const r = sync(base, s, today);
    expect(r.event).toBe('up');
    expect(r.player.level).toBe(7);
    expect(r.player.maxLevel).toBe(7);
  });

  it('reports missing data instead of failing silently', () => {
    const c = nextLevelCriteria(base, stats(), today)!.criteria.find((x) => x.type === 'metric')!;
    expect(c.met).toBe(false);
    expect(c.value).toBe('немає даних');
  });
});

describe('level drop and comeback', () => {
  it('does not drop after a single quiet week', () => {
    const active = days('2026-10-05', 5); // regular week, then a quiet one
    expect(shouldDrop(base, stats({ activeDays: active }), today)).toBe(false);
  });

  it('drops one level after two quiet weeks and keeps unlocks', () => {
    const active = ['2026-10-06', '2026-10-14'];
    const r = sync(base, stats({ activeDays: active }), today);
    expect(r.event).toBe('down');
    expect(r.player.level).toBe(5);
    expect(r.player.maxLevel).toBe(6);
    expect(r.player.comeback).toBe(true);
    expect(unlockedFeatures(r.player.maxLevel).has('goal_instagram')).toBe(true);
  });

  it('never drops right after a level change', () => {
    const p = { ...base, levelChangedOn: '2026-10-10' };
    expect(shouldDrop(p, stats(), today)).toBe(false);
  });

  it('restores the level once all comeback missions are done', () => {
    const p: Player = { ...base, level: 5, comeback: true };
    const half = sync(p, stats({ missionProgress: { cb_breath: 3 } }), today);
    expect(half.event).toBeNull();
    const done = Object.fromEntries(COMEBACK_MISSIONS.map((m) => [m.key, m.target]));
    const r = sync(p, stats({ missionProgress: done }), today);
    expect(r.event).toBe('restored');
    expect(r.player.level).toBe(6);
    expect(r.player.comeback).toBe(false);
  });
});
