import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  buildOpeningSelection,
  formatOpeningExplorerMoveLabel,
  getOpeningExplorerAncestorRefIds,
  getOpeningExplorerBreadcrumbText,
  getOpeningExplorerCoveringBranchSelection,
  getOpeningExplorerDisplayRef,
  getOpeningExplorerDisplayNameForRef,
  getOpeningExplorerData,
  getOpeningExplorerDisplayChildRefIds,
  getOpeningExplorerNode,
  getOpeningExplorerRootRefIds,
  getOpeningExplorerVisibleRefIds,
  normalizeOpeningSelectionsAfterAdd,
  removeOpeningSelectionById,
  searchOpeningExplorer,
} from '@/lib/openingExplorerCore.js';
import type { OpeningSelection } from '@/lib/openingTrainer';
import { cn } from '@/lib/utils';

type ExplorerData = Awaited<ReturnType<typeof getOpeningExplorerData>>;

type OpeningMoveTreeExplorerProps = {
  explorer: ExplorerData | null;
  playerColor: 'white' | 'black';
  selections: OpeningSelection[];
  onSelectionsChange: (nextSelections: OpeningSelection[]) => void;
  onFocusedRefChange?: (refId: string | null) => void;
  className?: string;
};

const TreeNodeRow = ({
  explorer,
  playerColor,
  displayRefId,
  isExpanded,
  isFocused,
  branchSelected,
  openingSelected,
  coveredBySelection,
  openingCoveredBySelection,
  onFocus,
  onToggleExpand,
  onToggleBranch,
  onToggleOpening,
  onKeyDown,
  registerRowElement,
}: {
  explorer: ExplorerData;
  playerColor: 'white' | 'black';
  displayRefId: string;
  isExpanded: boolean;
  isFocused: boolean;
  branchSelected: boolean;
  openingSelected: boolean;
  coveredBySelection: OpeningSelection | null;
  openingCoveredBySelection: OpeningSelection | null;
  onFocus: (treeRefId: string) => void;
  onToggleExpand: (treeRefId: string) => void;
  onToggleBranch: (treeRefId: string) => void;
  onToggleOpening: (treeRefId: string) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>, treeRefId: string) => void;
  registerRowElement: (treeRefId: string, element: HTMLDivElement | null) => void;
}) => {
  const displayRef = getOpeningExplorerDisplayRef(explorer, playerColor, displayRefId);
  const node = displayRef ? getOpeningExplorerNode(explorer, displayRef.terminalNodeId) : null;

  if (!displayRef || !node) {
    return null;
  }

  const hasChildren = getOpeningExplorerDisplayChildRefIds(explorer, playerColor, displayRefId).length > 0;
  const openingDisplayName = getOpeningExplorerDisplayNameForRef(explorer, displayRef.id, playerColor);
  const branchControlDisabled = Boolean(coveredBySelection && !branchSelected);
  const openingControlDisabled = Boolean(
    (
      openingCoveredBySelection ||
      (branchSelected && displayRef.openingNodeId === displayRef.terminalNodeId)
    ) &&
    !openingSelected,
  );
  const displayEco = openingDisplayName ? displayRef.eco : null;

  return (
    <div
      ref={(element) => registerRowElement(displayRefId, element)}
      role="treeitem"
      aria-level={Math.max(1, displayRef.depth)}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={branchSelected || openingSelected}
      tabIndex={isFocused ? 0 : -1}
      className={cn(
        'rounded-xl border border-border/50 bg-card px-3 py-2.5 outline-none transition-colors',
        isFocused && 'border-foreground/20 ring-2 ring-foreground/10',
        coveredBySelection && !branchSelected && !openingSelected && 'opacity-50',
      )}
      style={{ marginLeft: `${Math.max(0, displayRef.depth - 1) * 12}px` }}
      onClick={() => onFocus(displayRefId)}
      onFocus={() => onFocus(displayRefId)}
      onKeyDown={(event) => onKeyDown(event, displayRefId)}
    >
      {/* Move label row */}
      <div className="flex items-center gap-2">
        {hasChildren ? (
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpand(displayRefId);
            }}
            aria-label={isExpanded ? `Collapse ${displayRef.label}` : `Expand ${displayRef.label}`}
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="h-3.5 w-3.5 shrink-0" />
        )}

        <span className="text-sm font-semibold text-foreground">
          {formatOpeningExplorerMoveLabel(explorer, displayRefId, playerColor)}
        </span>

        {displayEco && (
          <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {displayEco}
          </span>
        )}

        {/* Status badges */}
        {branchSelected && (
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.6rem] font-semibold text-primary">Branch</span>
        )}
        {openingSelected && (
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.6rem] font-semibold text-primary">Opening</span>
        )}
        {coveredBySelection && !branchSelected && !openingSelected && (
          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[0.6rem] font-semibold text-muted-foreground">Covered</span>
        )}
      </div>

      {/* Opening name (if any) */}
      {openingDisplayName && (
        <p className="mt-1 ml-6 text-xs text-muted-foreground">{openingDisplayName}</p>
      )}

      {/* Action buttons */}
      <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={branchSelected ? 'default' : 'outline'}
          className="h-7 px-2.5 text-[0.65rem]"
          disabled={branchControlDisabled}
          onClick={(event) => {
            event.stopPropagation();
            onToggleBranch(displayRefId);
          }}
        >
          {branchSelected ? 'Remove branch' : branchControlDisabled ? 'Covered' : 'Add branch'}
        </Button>

        {displayRef.openingName && displayRef.openingNodeId && (
          <Button
            type="button"
            size="sm"
            variant={openingSelected ? 'default' : 'outline'}
            className="h-7 px-2.5 text-[0.65rem]"
            disabled={openingControlDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onToggleOpening(displayRefId);
            }}
          >
            {openingSelected ? 'Remove opening' : openingControlDisabled ? 'Covered' : 'Add opening'}
          </Button>
        )}
      </div>
    </div>
  );
};

export const OpeningMoveTreeExplorer = ({
  explorer,
  playerColor,
  selections,
  onSelectionsChange,
  onFocusedRefChange,
  className,
}: OpeningMoveTreeExplorerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRefIds, setExpandedRefIds] = useState<Set<string>>(new Set());
  const [focusedRefId, setFocusedRefId] = useState<string | null>(null);
  const rowElementsRef = useRef(new Map<string, HTMLDivElement>());

  const rootRefIds = useMemo(
    () => (explorer ? getOpeningExplorerRootRefIds(explorer, playerColor) : []),
    [explorer, playerColor],
  );

  useEffect(() => {
    if (focusedRefId && explorer && getOpeningExplorerDisplayRef(explorer, playerColor, focusedRefId)) {
      return;
    }

    if (rootRefIds.length > 0) {
      setFocusedRefId(rootRefIds[0]);
    }
  }, [explorer, focusedRefId, playerColor, rootRefIds]);

  useEffect(() => {
    setExpandedRefIds(new Set());
  }, [playerColor]);

  const hasUserInteractedRef = useRef(false);

  useEffect(() => {
    if (!focusedRefId) {
      return;
    }

    if (!hasUserInteractedRef.current) {
      hasUserInteractedRef.current = true;
      return;
    }

    const element = rowElementsRef.current.get(focusedRefId);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: 'nearest' });
  }, [focusedRefId]);

  useEffect(() => {
    onFocusedRefChange?.(focusedRefId);
  }, [focusedRefId, onFocusedRefChange]);

  const visibleRefIds = useMemo(
    () => (explorer ? getOpeningExplorerVisibleRefIds(explorer, playerColor, expandedRefIds) : []),
    [expandedRefIds, explorer, playerColor],
  );

  const searchResults = useMemo(
    () => (explorer ? searchOpeningExplorer(explorer, playerColor, searchQuery) : []),
    [explorer, playerColor, searchQuery],
  );

  const jumpToRef = (treeRefId: string) => {
    if (!explorer) {
      return;
    }

    setExpandedRefIds((currentValue) => {
      const nextValue = new Set(currentValue);
      getOpeningExplorerAncestorRefIds(explorer, playerColor, treeRefId).forEach((ancestorRefId) => {
        nextValue.add(ancestorRefId);
      });
      return nextValue;
    });
    setFocusedRefId(treeRefId);
  };

  const handleToggleBranch = (treeRefId: string) => {
    if (!explorer) {
      return;
    }

    const displayRef = getOpeningExplorerDisplayRef(explorer, playerColor, treeRefId);
    const node = displayRef ? getOpeningExplorerNode(explorer, displayRef.terminalNodeId) : null;

    if (!displayRef || !node) {
      return;
    }

    const existingSelection = selections.find((selection) => selection.kind === 'branch' && selection.nodeId === node.id);

    if (existingSelection) {
      onSelectionsChange(removeOpeningSelectionById(selections, existingSelection.id));
      return;
    }

    const nextSelection = buildOpeningSelection({
      kind: 'branch',
      nodeId: node.id,
      anchorRefId: treeRefId,
      openingName: displayRef.openingName,
      eco: displayRef.eco,
    });

    onSelectionsChange(normalizeOpeningSelectionsAfterAdd(explorer, selections, nextSelection));
  };

  const handleToggleOpening = (treeRefId: string) => {
    if (!explorer) {
      return;
    }

    const displayRef = getOpeningExplorerDisplayRef(explorer, playerColor, treeRefId);

    if (!displayRef?.openingNodeId || !displayRef.openingName) {
      return;
    }

    const existingSelection = selections.find((selection) => (
      selection.kind === 'opening' &&
      selection.nodeId === displayRef.openingNodeId &&
      selection.openingName === displayRef.openingName
    ));

    if (existingSelection) {
      onSelectionsChange(removeOpeningSelectionById(selections, existingSelection.id));
      return;
    }

    const nextSelection = buildOpeningSelection({
      kind: 'opening',
      nodeId: displayRef.openingNodeId,
      anchorRefId: treeRefId,
      openingName: displayRef.openingName,
      eco: displayRef.eco,
    });

    onSelectionsChange(normalizeOpeningSelectionsAfterAdd(explorer, selections, nextSelection));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, treeRefId: string) => {
    if (!explorer) {
      return;
    }

    const visibleIndex = visibleRefIds.indexOf(treeRefId);
    const displayRef = getOpeningExplorerDisplayRef(explorer, playerColor, treeRefId);

    if (!displayRef) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextRefId = visibleRefIds[Math.min(visibleRefIds.length - 1, visibleIndex + 1)];
        if (nextRefId) {
          setFocusedRefId(nextRefId);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const nextRefId = visibleRefIds[Math.max(0, visibleIndex - 1)];
        if (nextRefId) {
          setFocusedRefId(nextRefId);
        }
        break;
      }
      case 'ArrowRight': {
        const displayChildRefIds = getOpeningExplorerDisplayChildRefIds(explorer, playerColor, treeRefId);

        if (displayChildRefIds.length === 0) {
          break;
        }

        event.preventDefault();

        if (!expandedRefIds.has(treeRefId)) {
          setExpandedRefIds((currentValue) => new Set(currentValue).add(treeRefId));
          break;
        }

        setFocusedRefId(displayChildRefIds[0]);
        break;
      }
      case 'ArrowLeft': {
        const displayChildRefIds = getOpeningExplorerDisplayChildRefIds(explorer, playerColor, treeRefId);

        if (expandedRefIds.has(treeRefId) && displayChildRefIds.length > 0) {
          event.preventDefault();
          setExpandedRefIds((currentValue) => {
            const nextValue = new Set(currentValue);
            nextValue.delete(treeRefId);
            return nextValue;
          });
          break;
        }

        const nearestVisibleAncestorRefId = getOpeningExplorerAncestorRefIds(explorer, playerColor, treeRefId)
          .reverse()
          .find((ancestorRefId) => visibleRefIds.includes(ancestorRefId));

        if (nearestVisibleAncestorRefId) {
          event.preventDefault();
          setFocusedRefId(nearestVisibleAncestorRefId);
        }
        break;
      }
      case 'Home': {
        event.preventDefault();
        if (visibleRefIds[0]) {
          setFocusedRefId(visibleRefIds[0]);
        }
        break;
      }
      case 'End': {
        event.preventDefault();
        if (visibleRefIds.length > 0) {
          setFocusedRefId(visibleRefIds[visibleRefIds.length - 1]);
        }
        break;
      }
      case ' ': {
        event.preventDefault();
        handleToggleBranch(treeRefId);
        break;
      }
      default:
        break;
    }
  };

  const breadcrumbText = explorer && focusedRefId
    ? getOpeningExplorerBreadcrumbText(explorer, focusedRefId, playerColor)
    : '';

  return (
    <div className={cn('grid gap-3 grid-rows-[auto_auto_auto] lg:min-h-0 lg:grid-rows-[auto_auto_minmax(0,1fr)]', className)}>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="opening-tree-search"
              type="text"
              className="pl-9"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search openings..."
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setSearchQuery('')}
            disabled={searchQuery.length === 0}
            aria-label="Clear opening search"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {searchQuery.trim().length > 0 && (
          <div className="rounded-2xl border border-border/50 bg-card p-2">
            {searchResults.length > 0 ? (
              <ScrollArea className="max-h-40">
                <div className="grid gap-1 pr-3">
                  {searchResults.map((result) => {
                    const displayRef = explorer ? getOpeningExplorerDisplayRef(explorer, playerColor, result.refId) : null;

                    return (
                      <button
                        key={result.refId}
                        type="button"
                        className="rounded-xl px-3 py-2 text-left hover:bg-secondary"
                        onClick={() => jumpToRef(result.refId)}
                      >
                        <div className="text-sm font-semibold text-foreground">
                          {explorer ? getOpeningExplorerBreadcrumbText(explorer, result.refId, playerColor) : ''}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {displayRef?.openingName ? `${displayRef.openingName}${displayRef.eco ? ` • ${displayRef.eco}` : ''}` : 'Move sequence'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <p className="px-2 py-1 text-sm text-muted-foreground">
                No matching branches found.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Breadcrumb</div>
        <div className="mt-1 text-sm text-foreground">
          {breadcrumbText || 'Browse opening moves, then add a subtree or named opening.'}
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card lg:min-h-0">
        {explorer ? (
          <ScrollArea className="lg:h-full">
            <div role="tree" aria-label="Opening move tree" aria-multiselectable="true" className="grid gap-2 p-3">
              {visibleRefIds.map((treeRefId) => {
                const displayRef = getOpeningExplorerDisplayRef(explorer, playerColor, treeRefId);
                const branchSelected = selections.some((selection) => selection.kind === 'branch' && selection.nodeId === displayRef?.terminalNodeId);
                const openingSelected = Boolean(
                  displayRef?.openingNodeId &&
                  displayRef?.openingName &&
                  selections.some((selection) => (
                    selection.kind === 'opening' &&
                    selection.nodeId === displayRef.openingNodeId &&
                    selection.openingName === displayRef.openingName
                  )),
                );
                const coveredBySelection = displayRef
                  ? getOpeningExplorerCoveringBranchSelection(explorer, selections, displayRef.terminalNodeId, null)
                  : null;
                const openingCoveredBySelection = displayRef?.openingNodeId
                  ? getOpeningExplorerCoveringBranchSelection(explorer, selections, displayRef.openingNodeId, null)
                  : null;

                return (
                  <Fragment key={treeRefId}>
                    <TreeNodeRow
                      explorer={explorer}
                      playerColor={playerColor}
                      displayRefId={treeRefId}
                      isExpanded={expandedRefIds.has(treeRefId)}
                      isFocused={focusedRefId === treeRefId}
                      branchSelected={branchSelected}
                      openingSelected={openingSelected}
                      coveredBySelection={coveredBySelection}
                      openingCoveredBySelection={openingCoveredBySelection}
                      onFocus={setFocusedRefId}
                      onToggleExpand={(nextTreeRefId) => {
                        setExpandedRefIds((currentValue) => {
                          const nextValue = new Set(currentValue);
                          if (nextValue.has(nextTreeRefId)) {
                            nextValue.delete(nextTreeRefId);
                          } else {
                            nextValue.add(nextTreeRefId);
                          }
                          return nextValue;
                        });
                      }}
                      onToggleBranch={handleToggleBranch}
                      onToggleOpening={handleToggleOpening}
                      onKeyDown={handleKeyDown}
                      registerRowElement={(nextTreeRefId, element) => {
                        if (!element) {
                          rowElementsRef.current.delete(nextTreeRefId);
                          return;
                        }

                        rowElementsRef.current.set(nextTreeRefId, element);
                      }}
                    />
                  </Fragment>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex h-full items-center justify-center px-4 py-6 text-sm text-muted-foreground">
            Loading opening explorer...
          </div>
        )}
      </div>
    </div>
  );
};
