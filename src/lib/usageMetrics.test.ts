import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  supabase: null as { rpc: ReturnType<typeof vi.fn> } | null,
}));

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mockState.supabase;
  },
}));

import { incrementUsageMetric } from './usageMetrics';

describe('usageMetrics', () => {
  beforeEach(() => {
    mockState.supabase = {
      rpc: vi.fn(),
    };

    vi.restoreAllMocks();
  });

  it('calls the usage metric RPC with the expected parameters', async () => {
    mockState.supabase!.rpc.mockResolvedValue({ error: null });

    const result = await incrementUsageMetric('games', 'computer', 'started');

    expect(result).toEqual({ ok: true });
    expect(mockState.supabase!.rpc).toHaveBeenCalledWith('increment_usage_metric', {
      p_activity_type: 'games',
      p_mode: 'computer',
      p_stage: 'started',
    });
  });

  it('returns no_supabase when the client is unavailable', async () => {
    mockState.supabase = null;
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const result = await incrementUsageMetric('puzzles', 'standard', 'finished');

    expect(result).toEqual({ ok: false, reason: 'no_supabase' });
    expect(infoSpy).toHaveBeenCalled();
  });

  it('returns an error result when the RPC fails', async () => {
    const rpcError = new Error('rpc failed');
    mockState.supabase!.rpc.mockResolvedValue({ error: rpcError });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await incrementUsageMetric('drills', 'moves', 'finished');

    expect(result).toEqual({ ok: false, reason: 'error', error: rpcError });
    expect(errorSpy).toHaveBeenCalledWith('Failed to increment usage metric:', rpcError);
  });
});
