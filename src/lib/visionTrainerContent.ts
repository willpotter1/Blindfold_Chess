import type { VisionMode } from '@/lib/visionTrainer';

export type VisionTrainerConfigTone = 'default' | 'error';

export const shouldPrefetchMoveDrillPositions = (mode: VisionMode) => mode === 'moves';

export const getMoveDrillConfigStatus = ({
  mode,
  hasSupabaseConfig,
  isLoading,
  hasError,
  movePositionsCount,
}: {
  mode: VisionMode;
  hasSupabaseConfig: boolean;
  isLoading: boolean;
  hasError: boolean;
  movePositionsCount: number;
}) => {
  if (!shouldPrefetchMoveDrillPositions(mode)) {
    return {
      isStartDisabled: false,
      message: undefined,
      tone: 'default' as const,
    };
  }

  if (!hasSupabaseConfig) {
    return {
      isStartDisabled: true,
      message: 'Move drills require Supabase configuration.',
      tone: 'error' as const,
    };
  }

  if (isLoading) {
    return {
      isStartDisabled: true,
      message: 'Loading move drills...',
      tone: 'default' as const,
    };
  }

  if (hasError) {
    return {
      isStartDisabled: true,
      message: 'Move drills could not be loaded.',
      tone: 'error' as const,
    };
  }

  if (movePositionsCount <= 0) {
    return {
      isStartDisabled: true,
      message: 'No move drills are available for this perspective.',
      tone: 'error' as const,
    };
  }

  return {
    isStartDisabled: false,
    message: undefined,
    tone: 'default' as const,
  };
};
