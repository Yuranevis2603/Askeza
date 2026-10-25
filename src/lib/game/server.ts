import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { addDays, Day, localDay, Player, Stats, sync, SyncEvent } from './engine';
import { COMEBACK_MISSIONS, MetricKey } from './levels';

export type Supabase = Awaited<ReturnType<typeof createClient>>;

export type PlayerRow = {
  user_id: string;
  display_name: string | null;
  time_zone: string;
  daily_goal: number;
  level: number;
  max_level: number;
  comeback: boolean;
  level_changed_on: string;
  last_event: 'up' | 'down' | 'restored' | null;
  created_on: string;
};

export type Ctx = { supabase: Supabase; userId: string; row: PlayerRow; today: Day };

export async function getCtx(): Promise<Ctx> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: row, error } = await supabase.from('players').select('*').eq('user_id', user.id).single<PlayerRow>();
  if (error || !row) throw new Error('Не знайдено профіль гравця: ' + (error?.message ?? 'порожньо'));
  return { supabase, userId: user.id, row, today: localDay(new Date(), row.time_zone) };
}

export function toPlayer(row: PlayerRow): Player {
  return {
    level: row.level,
    maxLevel: row.max_level,
    comeback: row.comeback,
    levelChangedOn: row.level_changed_on,
    createdOn: row.created_on,
  };
}

/** Unwraps a Supabase result. Writes without `.select()` return null data, so those come back as an empty array. */
function must<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as NonNullable<T>;
}

export async function loadStats({ supabase, userId, today }: Ctx): Promise<Stats> {
  const since8w = addDays(today, -56);
  const since7d = addDays(today, -6);
  const since30d = addDays(today, -29);
  const [total, days, reels, followers, published, focus, workouts, missions] = await Promise.all([
    supabase.rpc('xp_total'),
    supabase.from('xp_events').select('day').eq('user_id', userId).gte('day', since8w),
    supabase.from('metrics').select('value').eq('user_id', userId).eq('key', 'reels_minutes').gte('day', since7d),
    supabase.from('metrics').select('value').eq('user_id', userId).eq('key', 'followers').order('day', { ascending: false }).limit(1),
    supabase.from('metrics').select('value').eq('user_id', userId).eq('key', 'reels_published').order('day', { ascending: false }).limit(1),
    supabase.from('focus_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('area', 'body').eq('done', true).gte('day', since30d),
    supabase.from('mission_progress').select('key, progress').eq('user_id', userId),
  ]);

  const reelsVals = must(reels).map((r) => Number(r.value));
  const metrics: Partial<Record<MetricKey, number | null>> = {
    reels_avg_7d: reelsVals.length ? reelsVals.reduce((a, b) => a + b, 0) / reelsVals.length : null,
    screen_days_7d: reelsVals.length,
    focus_total: focus.count ?? 0,
    workouts_30d: workouts.count ?? 0,
    followers: must(followers)[0] ? Number(must(followers)[0].value) : null,
    reels_published: must(published)[0] ? Number(must(published)[0].value) : null,
  };

  return {
    totalXp: Number(must(total) ?? 0),
    activeDays: [...new Set(must(days).map((d) => d.day as string))],
    metrics,
    missionProgress: Object.fromEntries(must(missions).map((m) => [m.key, m.progress])),
  };
}

/** Loads stats, applies the level rules and saves any change. Call once per page render. */
export async function loadGame(ctx: Ctx): Promise<{ player: Player; stats: Stats; event: SyncEvent }> {
  const stats = await loadStats(ctx);
  const before = toPlayer(ctx.row);
  const { player, event } = sync(before, stats, ctx.today);
  if (event) {
    must(await ctx.supabase.from('players').update({
      level: player.level,
      max_level: player.maxLevel,
      comeback: player.comeback,
      level_changed_on: player.levelChangedOn,
      last_event: event,
    }).eq('user_id', ctx.userId));
    if (event === 'down' || event === 'restored') {
      must(await ctx.supabase.from('mission_progress').delete().eq('user_id', ctx.userId).in('key', COMEBACK_MISSIONS.map((m) => m.key)));
      for (const m of COMEBACK_MISSIONS) delete stats.missionProgress[m.key];
    }
  }
  return { player, stats, event: event ?? recentEvent(ctx.row, ctx.today) };
}

/** Keeps the level-change banner visible on the day it happened. */
function recentEvent(row: PlayerRow, today: Day): SyncEvent {
  return row.last_event && row.level_changed_on === today ? row.last_event : null;
}

export async function award(ctx: Ctx, source: string, ref: string, amount: number) {
  must(await ctx.supabase.from('xp_events').upsert(
    { user_id: ctx.userId, day: ctx.today, source, ref, amount },
    { onConflict: 'user_id,source,ref', ignoreDuplicates: true },
  ));
}

export async function revoke(ctx: Ctx, source: string, ref: string) {
  must(await ctx.supabase.from('xp_events').delete().eq('user_id', ctx.userId).eq('source', source).eq('ref', ref));
}

export async function xpToday(ctx: Ctx): Promise<number> {
  const rows = must(await ctx.supabase.from('xp_events').select('amount').eq('user_id', ctx.userId).eq('day', ctx.today));
  return rows.reduce((a, r) => a + r.amount, 0);
}

export { must };
