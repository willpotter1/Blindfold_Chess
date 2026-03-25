import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { OpeningCatalogLine, OpeningFamily } from '@/lib/openings';
import type { OpeningTrainerConfig } from '@/lib/openingTrainer';

type OpeningsConfigPanelProps = {
  config: OpeningTrainerConfig;
  families: OpeningFamily[];
  lines: OpeningCatalogLine[];
  statusMessage: string;
  statusTone?: 'default' | 'error';
  isStartDisabled?: boolean;
  onConfigChange: (config: OpeningTrainerConfig) => void;
  onStart: () => void;
  className?: string;
};

type OpeningTreeNode = {
  id: string;
  label: string;
  depth: number;
  family: string;
  lineIds: string[];
  lineCount: number;
  positionCount: number;
  children: OpeningTreeNode[];
  pathLabel: string;
};

const isWholeNumber = (value: string) => /^\d+$/.test(value);

const clampPositiveWholeNumber = (value: number, minimum: number) => Math.max(minimum, Math.round(value));

const buildOpeningTree = (lines: OpeningCatalogLine[]) => {
  const rootMap = new Map<string, OpeningTreeNode>();

  for (const line of lines) {
    const remainder = line.name.startsWith(`${line.family}:`)
      ? line.name.slice(line.family.length + 1).trim()
      : '';
    const segments = remainder.length === 0
      ? []
      : remainder.split(',').map((segment) => segment.trim()).filter(Boolean);

    let currentNode = rootMap.get(line.family);
    if (!currentNode) {
      currentNode = {
        id: `family:${line.family}`,
        label: line.family,
        depth: 0,
        family: line.family,
        lineIds: [],
        lineCount: 0,
        positionCount: 0,
        children: [],
        pathLabel: line.family,
      };
      rootMap.set(line.family, currentNode);
    }

    currentNode.lineIds.push(line.id);
    currentNode.lineCount += 1;
    currentNode.positionCount += line.recordCount;

    let parentNode = currentNode;

    segments.forEach((segment, segmentIndex) => {
      const pathLabel = `${parentNode.pathLabel}: ${segments.slice(0, segmentIndex + 1).join(', ')}`;
      let childNode = parentNode.children.find((child) => child.label === segment);

      if (!childNode) {
        childNode = {
          id: `${parentNode.id}>${segment}`,
          label: segment,
          depth: segmentIndex + 1,
          family: line.family,
          lineIds: [],
          lineCount: 0,
          positionCount: 0,
          children: [],
          pathLabel,
        };
        parentNode.children.push(childNode);
      }

      childNode.lineIds.push(line.id);
      childNode.lineCount += 1;
      childNode.positionCount += line.recordCount;
      parentNode = childNode;
    });
  }

  const sortTree = (nodes: OpeningTreeNode[]): OpeningTreeNode[] => (
    nodes
      .map((node) => ({
        ...node,
        lineIds: Array.from(new Set(node.lineIds)).sort(),
        children: sortTree(node.children),
      }))
      .sort((left, right) => left.label.localeCompare(right.label))
  );

  return sortTree(Array.from(rootMap.values()));
};

const getNodeSelectionState = (
  node: OpeningTreeNode,
  selectedLineIds: Set<string>,
) => {
  const selectedCount = node.lineIds.filter((lineId) => selectedLineIds.has(lineId)).length;

  if (selectedCount === 0) {
    return false;
  }

  if (selectedCount === node.lineIds.length) {
    return true;
  }

  return 'indeterminate' as const;
};

const collectSearchMatches = (
  nodes: OpeningTreeNode[],
  normalizedSearch: string,
) => {
  if (normalizedSearch.length === 0) {
    return {
      nodes,
      forcedExpandedNodeIds: new Set<string>(),
    };
  }

  const forcedExpandedNodeIds = new Set<string>();

  const filterNode = (node: OpeningTreeNode): OpeningTreeNode | null => {
    const filteredChildren = node.children
      .map(filterNode)
      .filter(Boolean);
    const matchesNode = node.pathLabel.toLowerCase().includes(normalizedSearch);

    if (!matchesNode && filteredChildren.length === 0) {
      return null;
    }

    forcedExpandedNodeIds.add(node.id);

    return {
      ...node,
      children: filteredChildren,
    };
  };

  return {
    nodes: nodes
      .map(filterNode)
      .filter(Boolean),
    forcedExpandedNodeIds,
  };
};

const OpeningTreeRow = ({
  node,
  selectedFamilies,
  selectedLineIds,
  expandedNodeIds,
  onToggleExpand,
  onToggleFamily,
  onToggleBranch,
}: {
  node: OpeningTreeNode;
  selectedFamilies: Set<string>;
  selectedLineIds: Set<string>;
  expandedNodeIds: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onToggleFamily: (familyName: string) => void;
  onToggleBranch: (node: OpeningTreeNode) => void;
}) => {
  const isRoot = node.depth === 0;
  const isExpanded = expandedNodeIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isFamilySelected = selectedFamilies.has(node.family);
  const branchSelectionState = getNodeSelectionState(node, selectedLineIds);

  return (
    <div className="grid gap-1">
      <div
        className={cn(
          'rounded-xl border-2 border-border bg-surface-white px-3 py-2.5',
          !isRoot && 'ml-4',
          isFamilySelected && !isRoot && 'opacity-60',
        )}
      >
        <div className="flex items-start gap-3">
          {hasChildren ? (
            <button
              type="button"
              className="mt-0.5 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-primary"
              onClick={() => onToggleExpand(node.id)}
              aria-label={isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="mt-0.5 h-4 w-4 shrink-0" />
          )}

          <Checkbox
            checked={isRoot ? (isFamilySelected ? true : branchSelectionState) : branchSelectionState}
            disabled={!isRoot && isFamilySelected}
            onCheckedChange={() => {
              if (isRoot) {
                onToggleFamily(node.family);
                return;
              }

              onToggleBranch(node);
            }}
          />

          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">{node.label}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {node.lineCount} variation{node.lineCount === 1 ? '' : 's'}, {node.positionCount} position{node.positionCount === 1 ? '' : 's'}
              {isRoot ? ' • include whole family' : ' • include this branch'}
            </div>
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="grid gap-1">
          {node.children.map((child) => (
            <OpeningTreeRow
              key={child.id}
              node={child}
              selectedFamilies={selectedFamilies}
              selectedLineIds={selectedLineIds}
              expandedNodeIds={expandedNodeIds}
              onToggleExpand={onToggleExpand}
              onToggleFamily={onToggleFamily}
              onToggleBranch={onToggleBranch}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const OpeningsConfigPanel = ({
  config,
  families,
  lines,
  statusMessage,
  statusTone = 'default',
  isStartDisabled = false,
  onConfigChange,
  onStart,
  className,
}: OpeningsConfigPanelProps) => {
  const [depthInput, setDepthInput] = useState(String(config.depthPlayerMoves));
  const [revealEveryInput, setRevealEveryInput] = useState(String(config.revealEvery));
  const [treeSearch, setTreeSearch] = useState('');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDepthInput(String(config.depthPlayerMoves));
    setRevealEveryInput(String(config.revealEvery));
  }, [config.depthPlayerMoves, config.revealEvery]);

  const selectedFamilies = useMemo(() => new Set(config.selectedFamilyNames), [config.selectedFamilyNames]);
  const selectedLineIds = useMemo(() => new Set(config.selectedLineIds), [config.selectedLineIds]);
  const openingTree = useMemo(() => buildOpeningTree(lines), [lines]);

  const { nodes: visibleTree, forcedExpandedNodeIds } = useMemo(() => {
    return collectSearchMatches(openingTree, treeSearch.trim().toLowerCase());
  }, [openingTree, treeSearch]);
  const effectiveExpandedNodeIds = useMemo(() => {
    const nextExpandedNodeIds = new Set(expandedNodeIds);
    forcedExpandedNodeIds.forEach((nodeId) => nextExpandedNodeIds.add(nodeId));
    return nextExpandedNodeIds;
  }, [expandedNodeIds, forcedExpandedNodeIds]);

  const totalFamilyPositionCount = useMemo(() => (
    config.selectedFamilyNames.reduce((count, familyName) => {
      const family = families.find((entry) => entry.name === familyName);
      return count + (family?.positionCount ?? 0);
    }, 0)
  ), [config.selectedFamilyNames, families]);

  const toggleFamily = (familyName: string) => {
    const nextFamilyNames = selectedFamilies.has(familyName)
      ? config.selectedFamilyNames.filter((name) => name !== familyName)
      : [...config.selectedFamilyNames, familyName];

    onConfigChange({
      ...config,
      selectedFamilyNames: nextFamilyNames,
    });
  };

  const toggleBranch = (node: OpeningTreeNode) => {
    const nextLineIds = new Set(config.selectedLineIds);
    const isFullySelected = node.lineIds.every((lineId) => nextLineIds.has(lineId));

    node.lineIds.forEach((lineId) => {
      if (isFullySelected) {
        nextLineIds.delete(lineId);
      } else {
        nextLineIds.add(lineId);
      }
    });

    onConfigChange({
      ...config,
      selectedLineIds: Array.from(nextLineIds),
    });
  };

  const commitDepthInput = () => {
    if (!isWholeNumber(depthInput)) {
      setDepthInput(String(config.depthPlayerMoves));
      return;
    }

    const nextDepth = clampPositiveWholeNumber(Number(depthInput), 1);
    setDepthInput(String(nextDepth));

    if (nextDepth !== config.depthPlayerMoves) {
      onConfigChange({
        ...config,
        depthPlayerMoves: nextDepth,
      });
    }
  };

  const commitRevealEveryInput = () => {
    if (!isWholeNumber(revealEveryInput)) {
      setRevealEveryInput(String(config.revealEvery));
      return;
    }

    const nextRevealEvery = clampPositiveWholeNumber(Number(revealEveryInput), 0);
    setRevealEveryInput(String(nextRevealEvery));

    if (nextRevealEvery !== config.revealEvery) {
      onConfigChange({
        ...config,
        revealEvery: nextRevealEvery,
      });
    }
  };

  return (
    <Card className={cn('flex h-full min-h-0 w-full flex-col overflow-hidden border-2 border-border', className)}>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-xl">Opening Setup</CardTitle>
      </CardHeader>

      <CardContent className="grid min-h-0 flex-1 grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] gap-3 pt-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="opening-player-color" className="text-[11px] font-semibold text-primary">
              Play As
            </Label>
            <Select
              value={config.playerColor}
              onValueChange={(value) =>
                onConfigChange({
                  ...config,
                  playerColor: value as 'white' | 'black',
                })
              }
            >
              <SelectTrigger id="opening-player-color" className="h-11 rounded-xl text-[15px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="black">Black</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening-depth" className="text-[11px] font-semibold text-primary">
              Depth
            </Label>
            <Input
              id="opening-depth"
              type="number"
              min={1}
              step={1}
              className="h-11 rounded-xl text-[15px]"
              value={depthInput}
              onChange={(event) => setDepthInput(event.target.value)}
              onBlur={commitDepthInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="opening-reveal-frequency"
              className="text-[11px] font-semibold text-primary"
            >
              Reveal Freq.
            </Label>
            <Input
              id="opening-reveal-frequency"
              type="number"
              min={0}
              step={1}
              className="h-11 rounded-xl text-[15px]"
              value={revealEveryInput}
              onChange={(event) => setRevealEveryInput(event.target.value)}
              onBlur={commitRevealEveryInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
              placeholder="0 = never auto-reveal"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-stretch">
          <div className="flex h-full min-h-[54px] items-center justify-between gap-3 rounded-xl border-2 border-border bg-surface-white px-4 py-3">
            <Label htmlFor="opening-allow-cheats" className="min-w-0 cursor-pointer text-sm font-semibold text-foreground">
              Allow Cheats
            </Label>
            <Switch
              id="opening-allow-cheats"
              className="shrink-0"
              checked={config.allowCheats}
              onCheckedChange={(checked) =>
                onConfigChange({
                  ...config,
                  allowCheats: checked,
                })
              }
            />
          </div>

          <div className="flex h-full min-h-[54px] items-center justify-between gap-3 rounded-xl border-2 border-border bg-surface-white px-4 py-3">
            <Label htmlFor="opening-hide-history" className="min-w-0 cursor-pointer text-sm font-semibold text-foreground">
              Hide History
            </Label>
            <Switch
              id="opening-hide-history"
              className="shrink-0"
              checked={config.hideMoveHistory}
              onCheckedChange={(checked) =>
                onConfigChange({
                  ...config,
                  hideMoveHistory: checked,
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border-2 border-border bg-surface-base px-4 py-3 sm:grid-cols-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Whole Families</div>
            <div className="mt-1 text-2xl font-semibold leading-none text-foreground">{config.selectedFamilyNames.length}</div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Branch Variations</div>
            <div className="mt-1 text-2xl font-semibold leading-none text-foreground">{config.selectedLineIds.length}</div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Family Positions</div>
            <div className="mt-1 text-2xl font-semibold leading-none text-foreground">{totalFamilyPositionCount.toLocaleString()}</div>
          </div>
        </div>

        <div className="grid min-h-0 gap-3">
          <Label htmlFor="opening-tree-search">Opening Browser</Label>

          <Input
            id="opening-tree-search"
            type="text"
            value={treeSearch}
            onChange={(event) => setTreeSearch(event.target.value)}
            placeholder="Search family or branch"
          />

          <ScrollArea className="min-h-0 rounded-2xl border-2 border-border bg-surface-white">
            <div className="grid gap-2 p-3">
              {visibleTree.map((node) => (
                <OpeningTreeRow
                  key={node.id}
                  node={node}
                  selectedFamilies={selectedFamilies}
                  selectedLineIds={selectedLineIds}
                  expandedNodeIds={effectiveExpandedNodeIds}
                  onToggleExpand={(nodeId) => {
                    setExpandedNodeIds((currentValue) => {
                      const nextValue = new Set(currentValue);
                      if (nextValue.has(nodeId)) {
                        nextValue.delete(nodeId);
                      } else {
                        nextValue.add(nodeId);
                      }
                      return nextValue;
                    });
                  }}
                  onToggleFamily={toggleFamily}
                  onToggleBranch={toggleBranch}
                />
              ))}
              {visibleTree.length === 0 && (
                <p className="text-sm text-muted-foreground">No opening branches match the current search.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="grid gap-3">
          <p className={statusTone === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
            {statusMessage}
          </p>

          <Button type="button" size="lg" onClick={onStart} disabled={isStartDisabled}>
            Start Opening Round
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
