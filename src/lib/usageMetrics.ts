import { supabase } from '@/lib/supabase';

export type UsageActivity = 'games' | 'puzzles' | 'drills';
export type UsageStage = 'started' | 'finished';

export type UsageModeByActivity = {
  games: 'computer' | 'pass-n-play';
  puzzles: 'standard';
  drills: 'coordinates' | 'moves';
};

export type UsageMode = UsageModeByActivity[UsageActivity];

type UsageMetricResult =
  | { ok: true }
  | { ok: false; reason: 'no_supabase' | 'error'; error?: unknown };

export const incrementUsageMetric = async <TActivity extends UsageActivity>(
  activityType: TActivity,
  mode: UsageModeByActivity[TActivity],
  stage: UsageStage,
): Promise<UsageMetricResult> => {
  if (!supabase) {
    console.info('Supabase not configured; skipping usage metric increment.');
    return { ok: false, reason: 'no_supabase' };
  }

  try {
    const { error } = await supabase.rpc('increment_usage_metric', {
      p_activity_type: activityType,
      p_mode: mode,
      p_stage: stage,
    });

    if (error) {
      throw error;
    }

    return { ok: true };
  } catch (error) {
    console.error('Failed to increment usage metric:', error);
    return { ok: false, reason: 'error', error };
  }
};
