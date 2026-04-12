import { AppSidebar } from '@/components/AppSidebar';
import { DrillsActivePanel } from '@/components/DrillsActivePanel';
import { DrillsConfigPanel } from '@/components/DrillsConfigPanel';
import { DrillsResultsPanel } from '@/components/DrillsResultsPanel';
import SeoHead from '@/components/SeoHead';
import { VisionBoard } from '@/components/VisionBoard';
import { useDesktopGameLayout } from '@/hooks/useDesktopGameLayout';
import { useVisionTrainerLayout } from '@/hooks/useVisionTrainerLayout';
import { useVisionTrainerState } from '@/hooks/useVisionTrainerState';
import {
  getPiecePlacementsFromFen,
  getVisionAccuracy,
  getVisionScore,
} from '@/lib/visionTrainer';
import { cn } from '@/lib/utils';

const SEO_TITLE = 'Blindfold Chess Trainer - Drills';
const SEO_DESCRIPTION = 'Train board vision with timed coordinate drills and legal six-piece move drills.';
const SEO_CANONICAL_URL = 'https://blindchess.org/drills';
const SEO_OG_IMAGE = 'https://blindchess.org/BBpawn.png';

const DESKTOP_BOARD_SIZE = 860;
const DESKTOP_PANEL_WIDTH = 320;
const DESKTOP_LAYOUT_GAP = 32;
const MOBILE_STATIC_BOARD_MAX_WIDTH = 640;

const formatAccuracyPercent = (accuracy: number) => {
  const percentage = accuracy * 100;

  return `${Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1)}%`;
};

const Drills = () => {
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
  const showDesktopGameLayout = useDesktopGameLayout();
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

  const {
    desktopContainerRef,
    mobileActiveShellRef,
    mobileActivePanelRef,
    layout,
  } = useVisionTrainerLayout({
    desktopEnabled: showDesktopGameLayout,
    mobileActiveEnabled: !showDesktopGameLayout && isPlaying,
    baseBoardSize: DESKTOP_BOARD_SIZE,
    basePanelWidth: DESKTOP_PANEL_WIDTH,
    baseGap: DESKTOP_LAYOUT_GAP,
    rightWidthDamping: 0.5,
    mobilePanelHeightEstimate: currentPrompt?.mode === 'moves' && config.movesPieceDisplay === 'panel' ? 376 : 168,
  });

  const renderPhasePanel = ({
    panelPadding,
    sectionGap,
    className,
  }: {
    panelPadding: number;
    sectionGap: number;
    className?: string;
  }) => {
    if (phase === 'config') {
      return (
        <DrillsConfigPanel
          config={config}
          panelPadding={panelPadding}
          sectionGap={sectionGap}
          statusMessage={configStatusMessage}
          statusTone={configStatusTone}
          isStartDisabled={isStartDisabled}
          onConfigChange={updateConfig}
          onStart={startRound}
          className={className}
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
          panelPadding={panelPadding}
          sectionGap={sectionGap}
          className={className}
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
        panelPadding={panelPadding}
        sectionGap={sectionGap}
        onPlayAgain={restartRound}
        onNewConfig={returnToConfig}
        className={className}
      />
    );
  };

  return (
    <div className={cn('bg-stage-glow flex min-h-screen flex-col', showDesktopGameLayout && 'md:flex-row')}>
      <SeoHead
        title={SEO_TITLE}
        description={SEO_DESCRIPTION}
        canonicalUrl={SEO_CANONICAL_URL}
        ogImage={SEO_OG_IMAGE}
      />
      <AppSidebar desktopMode={showDesktopGameLayout} />

      <div className={cn('flex-1 min-h-0', !showDesktopGameLayout && 'pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0')}>
        {showDesktopGameLayout ? (
          <div className="px-4 md:my-4 md:h-[calc(100vh-2rem)] md:py-0">
            <div className="h-full">
              <div
                ref={desktopContainerRef}
                className="mx-auto flex h-full w-full max-w-[1800px] items-center justify-center"
              >
                <div
                  className="grid items-start"
                  style={{
                    gridTemplateColumns: `${layout.boardSize}px ${layout.panelWidth}px`,
                    columnGap: `${layout.gap}px`,
                  }}
                >
                  <div className="flex items-center justify-center">
                    <div style={{ width: `${layout.boardSize}px` }}>
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

                  <div
                    className="self-start"
                    style={{
                      width: `${layout.panelWidth}px`,
                    }}
                  >
                    {renderPhasePanel({
                      panelPadding: layout.panelPadding,
                      sectionGap: layout.sectionGap,
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'px-4 py-4',
              isPlaying && 'flex h-full min-h-0 flex-col overflow-hidden',
            )}
          >
            {isPlaying ? (
              <div
                ref={mobileActiveShellRef}
                className="mx-auto flex h-full w-full max-w-[680px] min-h-0 flex-col"
                style={{ gap: `${layout.mobileActiveGap}px` }}
              >
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  <div style={{ width: `${layout.mobileActiveBoardSize}px` }}>
                    <VisionBoard
                      perspective={config.perspective}
                      showCoordinates={config.showCoordinates}
                      pieces={boardPieces}
                      selectedSquare={selectedMoveSourceSquare}
                      disabled={false}
                      onSquareClick={handleSquareClick}
                      feedback={feedback}
                      className="w-full"
                    />
                  </div>
                </div>

                <div ref={mobileActivePanelRef} className="shrink-0">
                  {renderPhasePanel({
                    panelPadding: layout.mobileActivePanelPadding,
                    sectionGap: layout.mobileActiveSectionGap,
                  })}
                </div>
              </div>
            ) : (
              <div className="mx-auto grid w-full max-w-[760px] grid-cols-1 gap-4">
                <div className="flex justify-center">
                  <div className="w-full" style={{ maxWidth: `${MOBILE_STATIC_BOARD_MAX_WIDTH}px` }}>
                    <VisionBoard
                      perspective={config.perspective}
                      showCoordinates={config.showCoordinates}
                      disabled
                      feedback={null}
                      className="w-full"
                    />
                  </div>
                </div>

                {renderPhasePanel({
                  panelPadding: 20,
                  sectionGap: 18,
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Drills;
