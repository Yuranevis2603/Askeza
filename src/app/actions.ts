'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { award, Ctx, getCtx, must, revoke } from '@/lib/game/server';
import { COMEBACK_MISSIONS, levelByN, XP } from '@/lib/game/levels';

const AREAS = ['focus', 'instagram', 'project', 'body'] as const;
const IMPRESSION_STATUS = ['idea', 'planned', 'prep', 'done'] as const;
const METRICS = ['reels_minutes', 'followers', 'reels_published'] as const;

function done() {
  revalidatePath('/', 'layout');
}

function text(v: FormDataEntryValue | null, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

// ---------- tasks ----------

export async function addTask(form: FormData) {
  const ctx = await getCtx();
  const title = text(form.get('title'), 200);
  if (!title) return;
  const area = AREAS.find((a) => a === form.get('area')) ?? 'focus';
  const xp = Math.min(100, Math.max(0, Number(form.get('xp')) || 10));
  const time = text(form.get('time'), 5) || null;
  must(await ctx.supabase.from('tasks').insert({ user_id: ctx.userId, day: ctx.today, title, area, xp, time }));
  done();
}

export async function toggleTask(id: string) {
  const ctx = await getCtx();
  const task = must(await ctx.supabase.from('tasks').select('id, done, xp').eq('id', id).single());
  must(await ctx.supabase.from('tasks').update({ done: !task.done }).eq('id', id));
  if (task.done) await revoke(ctx, 'task', id);
  else await award(ctx, 'task', id, task.xp);
  done();
}

export async function deleteTask(id: string) {
  const ctx = await getCtx();
  await revoke(ctx, 'task', id);
  must(await ctx.supabase.from('tasks').delete().eq('id', id));
  done();
}

// ---------- habits ----------

export async function toggleHabit(habitId: string) {
  const ctx = await getCtx();
  const ref = `${habitId}:${ctx.today}`;
  must(await ctx.supabase.from('habits').select('id').eq('id', habitId).single());
  const existing = must(await ctx.supabase.from('habit_logs').select('habit_id').eq('habit_id', habitId).eq('day', ctx.today));
  if (existing.length) {
    must(await ctx.supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('day', ctx.today));
    await revoke(ctx, 'habit', ref);
  } else {
    must(await ctx.supabase.from('habit_logs').insert({ habit_id: habitId, user_id: ctx.userId, day: ctx.today }));
    await award(ctx, 'habit', ref, XP.habit);
  }
  done();
}

// ---------- focus & metrics ----------

export async function logFocus(minutes: number, area: string) {
  const ctx = await getCtx();
  const m = Math.round(Math.min(180, Math.max(1, minutes)));
  const a = AREAS.find((x) => x === area) ?? 'project';
  const row = must(await ctx.supabase.from('focus_sessions').insert({ user_id: ctx.userId, day: ctx.today, minutes: m, area: a }).select('id').single());
  if (m >= 15) await award(ctx, 'focus', row.id, XP.focus);
  done();
}

export async function setMetric(form: FormData) {
  const ctx = await getCtx();
  const key = METRICS.find((k) => k === form.get('key'));
  const value = Number(String(form.get('value') ?? '').replace(',', '.'));
  if (!key || !Number.isFinite(value) || value < 0) return;
  must(await ctx.supabase.from('metrics').upsert({ user_id: ctx.userId, key, day: ctx.today, value }, { onConflict: 'user_id,key,day' }));
  done();
}

// ---------- missions ----------

async function allowedMission(ctx: Ctx, key: string) {
  if (ctx.row.comeback) return COMEBACK_MISSIONS.find((m) => m.key === key) ? { m: COMEBACK_MISSIONS.find((m) => m.key === key)!, source: 'comeback' } : null;
  const m = levelByN(ctx.row.level).missions.find((x) => x.key === key);
  return m ? { m, source: 'mission' } : null;
}

export async function bumpMission(key: string, delta: 1 | -1) {
  const ctx = await getCtx();
  const found = await allowedMission(ctx, key);
  if (!found) return;
  const { m, source } = found;
  const rows = must(await ctx.supabase.from('mission_progress').select('progress').eq('user_id', ctx.userId).eq('key', key));
  const before = rows[0]?.progress ?? 0;
  const after = Math.min(m.target, Math.max(0, before + delta));
  if (after === before) return;
  must(await ctx.supabase.from('mission_progress').upsert(
    { user_id: ctx.userId, key, progress: after, completed_on: after >= m.target ? ctx.today : null },
    { onConflict: 'user_id,key' },
  ));
  // Comeback missions can repeat after a later drop, so their XP ref includes the drop date.
  const ref = source === 'comeback' ? `${key}:${ctx.row.level_changed_on}` : key;
  if (after >= m.target) await award(ctx, source, ref, m.reward);
  else if (before >= m.target) await revoke(ctx, source, ref);
  done();
}

// ---------- goals ----------

export async function setGoalValue(form: FormData) {
  const ctx = await getCtx();
  const id = text(form.get('id'), 64);
  const value = Number(String(form.get('value') ?? '').replace(',', '.'));
  if (!id || !Number.isFinite(value) || value < 0) return;
  const g = must(await ctx.supabase.from('goals').update({ current_value: value }).eq('id', id).eq('kind', 'development').select('area').single());
  // Followers also feed the level results, so keep the metric in step with the goal.
  if (g.area === 'instagram') {
    must(await ctx.supabase.from('metrics').upsert({ user_id: ctx.userId, key: 'followers', day: ctx.today, value }, { onConflict: 'user_id,key,day' }));
  }
  done();
}

export async function toggleStep(id: string) {
  const ctx = await getCtx();
  const step = must(await ctx.supabase.from('goal_steps').select('done, unlock_level').eq('id', id).single());
  if (step.unlock_level && step.unlock_level > ctx.row.max_level) return;
  must(await ctx.supabase.from('goal_steps').update({ done: !step.done }).eq('id', id));
  done();
}

export async function planNextAction(goalId: string) {
  const ctx = await getCtx();
  const g = must(await ctx.supabase.from('goals').select('area, next_action, next_action_xp').eq('id', goalId).single());
  if (!g.next_action) return;
  must(await ctx.supabase.from('tasks').insert({
    user_id: ctx.userId, day: ctx.today, title: g.next_action, area: g.area ?? 'focus', xp: g.next_action_xp ?? 20,
  }));
  done();
}

export async function setNextAction(form: FormData) {
  const ctx = await getCtx();
  const id = text(form.get('id'), 64);
  const action = text(form.get('next_action'), 200);
  if (!id) return;
  must(await ctx.supabase.from('goals').update({ next_action: action || null }).eq('id', id));
  done();
}

// ---------- impressions ----------

export async function addImpression(form: FormData) {
  const ctx = await getCtx();
  const title = text(form.get('title'), 200);
  if (!title) return;
  const note = text(form.get('note'), 200) || null;
  must(await ctx.supabase.from('goals').insert({ user_id: ctx.userId, kind: 'impression', title, note, status: 'idea', sort: Date.now() % 1e9 }));
  done();
}

export async function setImpressionStatus(id: string, status: string) {
  const ctx = await getCtx();
  const s = IMPRESSION_STATUS.find((x) => x === status);
  if (!s) return;
  must(await ctx.supabase.from('goals').update({ status: s }).eq('id', id).eq('kind', 'impression'));
  if (s === 'done') await award(ctx, 'impression', id, XP.impression);
  else await revoke(ctx, 'impression', id);
  done();
}

export async function deleteImpression(id: string) {
  const ctx = await getCtx();
  await revoke(ctx, 'impression', id);
  must(await ctx.supabase.from('goals').delete().eq('id', id).eq('kind', 'impression'));
  done();
}

// ---------- account ----------

export async function setDailyGoal(form: FormData) {
  const ctx = await getCtx();
  const v = Math.round(Number(form.get('daily_goal')));
  if (!Number.isFinite(v) || v < 50 || v > 1000) return;
  must(await ctx.supabase.from('players').update({ daily_goal: v }).eq('user_id', ctx.userId));
  done();
}

export async function signOut() {
  const ctx = await getCtx();
  await ctx.supabase.auth.signOut();
  redirect('/login');
}

// ---------- journal ----------

export async function addJournal(form: FormData) {
  const ctx = await getCtx();
  const body = text(form.get('body'), 10000);
  if (!body) return;
  must(await ctx.supabase.from('journal_entries').insert({ user_id: ctx.userId, day: ctx.today, body }));
  done();
}

export async function deleteJournal(id: string) {
  const ctx = await getCtx();
  must(await ctx.supabase.from('journal_entries').delete().eq('id', id));
  done();
}

// ---------- trackers ----------

/** UTC instant of local midnight on `day` in `timeZone`. */
function zonedMidnight(day: string, timeZone: string): Date {
  const guess = new Date(`${day}T00:00:00Z`);
  const local = new Date(guess.toLocaleString('en-US', { timeZone }));
  const utc = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(guess.getTime() - (local.getTime() - utc.getTime()));
}

export async function addTracker(form: FormData) {
  const ctx = await getCtx();
  const name = text(form.get('name'), 80);
  if (!name) return;
  const since = text(form.get('since'), 10);
  let started = new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(since) && since <= ctx.today) started = zonedMidnight(since, ctx.row.time_zone);
  must(await ctx.supabase.from('trackers').insert({ user_id: ctx.userId, name, started_at: started.toISOString() }));
  done();
}

export async function resetTracker(id: string) {
  const ctx = await getCtx();
  const t = must(await ctx.supabase.from('trackers').select('started_at, best_seconds').eq('id', id).single());
  const now = new Date();
  const streak = Math.max(0, Math.floor((now.getTime() - new Date(t.started_at).getTime()) / 1000));
  must(await ctx.supabase.from('tracker_resets').insert({ tracker_id: id, user_id: ctx.userId, streak_seconds: streak, reset_at: now.toISOString() }));
  must(await ctx.supabase.from('trackers').update({ started_at: now.toISOString(), best_seconds: Math.max(t.best_seconds, streak) }).eq('id', id));
  done();
}

export async function deleteTracker(id: string) {
  const ctx = await getCtx();
  must(await ctx.supabase.from('trackers').delete().eq('id', id));
  done();
}
