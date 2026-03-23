import { describe, expect, it } from 'vitest';
import { getMoveDrillConfigStatus, shouldPrefetchMoveDrillPositions } from './visionTrainerContent';

describe('visionTrainerContent helpers', () => {
  it('does not prefetch move drills for coordinates mode', () => {
    expect(shouldPrefetchMoveDrillPositions('coordinates')).toBe(false);
    expect(getMoveDrillConfigStatus({
      mode: 'coordinates',
      hasSupabaseConfig: false,
      isLoading: false,
      hasError: false,
      movePositionsCount: 0,
    })).toEqual({
      isStartDisabled: false,
      message: undefined,
      tone: 'default',
    });
  });

  it('prefetches move drills for moves mode and allows starting once loaded', () => {
    expect(shouldPrefetchMoveDrillPositions('moves')).toBe(true);
    expect(getMoveDrillConfigStatus({
      mode: 'moves',
      hasSupabaseConfig: true,
      isLoading: false,
      hasError: false,
      movePositionsCount: 50,
    })).toEqual({
      isStartDisabled: false,
      message: undefined,
      tone: 'default',
    });
  });

  it('blocks move rounds when the move-drill query fails', () => {
    expect(getMoveDrillConfigStatus({
      mode: 'moves',
      hasSupabaseConfig: true,
      isLoading: false,
      hasError: true,
      movePositionsCount: 0,
    })).toEqual({
      isStartDisabled: true,
      message: 'Move drills could not be loaded.',
      tone: 'error',
    });
  });
});
