import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { DrillsActivePanel } from '@/components/DrillsActivePanel';
import { DrillsConfigPanel } from '@/components/DrillsConfigPanel';
import { DrillsResultsPanel } from '@/components/DrillsResultsPanel';
import SeoHead from '@/components/SeoHead';
import { VisionBoard } from '@/components/VisionBoard';
import { useVisionTrainerState } from '@/hooks/useVisionTrainerState';
import {
  getPiecePlacementsFromFen,
  getVisionAccuracy,
  getVisionScore,
} from '@/lib/visionTrainer';
import { cn } from '@/lib/utils';

const SEO_TITLE = 'Chess Vision Drills - Coordinate & Move Training | Blindchess.org';
const SEO_DESCRIPTION = 'Sharpen your board vision with timed chess coordinate drills and legal move exercises. Build blindfold chess skills through repetition at blindchess.org.';
const SEO_CANONICAL_URL = 'https://blindchess.org/drills';
const SEO_OG_IMAGE = 'https://blindchess.org/circlepawnwb-512.png';

const formatAccuracyPercent = (accuracy: number) => {
  const percentage = accuracy * 100;
  return `${Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1)}%`;
};

const Drills = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const prevPhaseRef = useRef<string>('config');
  const {
    phase,
    config,
    currentPrompt,
    feedback,
    selectedMoveSourceSquare,
    stats,
    timeRemainingMs,
    updateConfig,
    startRound,
    restartRound,
    returnToConfig,
    handleSquareClick,
    configStatusMessage,
    configStatusTone,
    isStartDisabled,
  } = useVisionTrainerState();
  const isPlaying = phase === 'playing';
  const accuracy = getVisionAccuracy(stats);
  const accuracyText = formatAccuracyPercent(accuracy);
  const score = getVisionScore(stats);
  const timeRemainingSeconds = Math.max(0, Math.ceil(timeRemainingMs / 1000));
  const currentMovePieces = currentPrompt?.mode === 'moves'
    ? getPiecePlacementsFromFen(currentPrompt.fen, currentPrompt.turnColor)
    : [];
  const boardPieces = (
    isPlaying &&
    currentPrompt?.mode === 'moves' &&
    config.movesPieceDisplay === 'board'
  )
    ? currentMovePieces
    : [];
  const panelPiecePlacements = (
    isPlaying &&
    currentPrompt?.mode === 'moves' &&
    config.movesPieceDisplay === 'panel'
  )
    ? currentMovePieces
    : [];

  useEffect(() => {
    if (phase === 'playing' && prevPhaseRef.current === 'config') {
      navigate(`/drills/${crypto.randomUUID()}`, { replace: true });
    } else if (phase === 'config' && prevPhaseRef.current !== 'config') {
      navigate('/drills', { replace: true });
    }
    prevPhaseRef.current = phase;
  }, [phase, navigate]);

  useEffect(() => {
    if (sessionId && phase === 'config') {
      navigate('/drills', { replace: true });
    }
  }, [sessionId, phase, navigate]);

  const renderPanel = () => {
    if (phase === 'config') {
      return (
        <DrillsConfigPanel
          config={config}
          statusMessage={configStatusMessage}
          statusTone={configStatusTone}
          isStartDisabled={isStartDisabled}
          onConfigChange={updateConfig}
          onStart={startRound}
        />
      );
    }

    if (phase === 'playing') {
      return (
        <DrillsActivePanel
          moveLabel={currentPrompt?.label ?? ''}
          score={score}
          timeRemainingSeconds={timeRemainingSeconds}
          piecePlacements={panelPiecePlacements}
        />
      );
    }

    return (
      <DrillsResultsPanel
        score={score}
        correctCount={stats.correctCount}
        wrongCount={stats.wrongCount}
        totalAttempts={stats.totalAttempts}
        accuracyText={accuracyText}
        onPlayAgain={restartRound}
        onNewConfig={returnToConfig}
      />
    );
  };

  return (
    <div className="bg-background flex min-h-screen flex-col md:flex-row">
      <SeoHead
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonicalUrl={SEO_CANONICAL_URL}
        ogImage={SEO_OG_IMAGE}
      />
      <AppSidebar />

      <div className="min-h-0 px-4 py-4 pb-8 md:flex-1 lg:py-0 lg:pb-0">
        <div className="mx-auto w-full max-w-xl grid grid-cols-1 gap-4 md:max-w-2xl lg:max-w-[1600px] lg:h-[calc(100vh-2rem)] lg:my-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:items-center lg:gap-5 xl:gap-8">
          <div className="flex items-center justify-center">
            <div className="w-full md:max-w-lg lg:max-w-[min(90vh,900px)] xl:max-w-[min(94vh,980px)]">
              <VisionBoard
                perspective={config.perspective}
                showCoordinates={config.showCoordinates}
                pieces={boardPieces}
                selectedSquare={isPlaying ? selectedMoveSourceSquare : null}
                disabled={!isPlaying}
                onSquareClick={handleSquareClick}
                feedback={isPlaying ? feedback : null}
                className="w-full"
              />
            </div>
          </div>

          <div className="lg:self-center">
            {renderPanel()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Drills;
