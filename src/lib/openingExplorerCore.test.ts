import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  buildOpeningSelection,
  getOpeningExplorerDisplayRef,
  getOpeningExplorerDisplayChildRefIds,
  formatOpeningExplorerMoveLabel,
  getOpeningExplorerCoveringBranchSelection,
  getOpeningExplorerRootRefIds,
  normalizeOpeningSelectionsAfterAdd,
  resolveOpeningExplorerRecordIds,
} from './openingExplorerCore.js';
import { buildOpeningExplorerFixture, getOpeningExplorerNodeForSanMoves } from './openingExplorerTestUtils';
import { defaultOpeningTrainerConfig, resolveOpeningTrainerRecordSelection } from './openingTrainer';

const findDisplayRefIdByLabel = (
  explorer: ReturnType<typeof buildOpeningExplorerFixture>['explorer'],
  playerColor: 'white' | 'black',
  refIds: string[],
  label: string,
) => {
  const refId = refIds.find((candidateRefId) => formatOpeningExplorerMoveLabel(explorer, candidateRefId, playerColor) === label);

  if (!refId) {
    throw new Error(`Missing display ref with label "${label}".`);
  }

  return refId;
};

describe('opening explorer data', () => {
  it('builds a position-keyed tree with white-first and black-perspective roots', () => {
    const { explorer } = buildOpeningExplorerFixture();
    const whiteRootRefIds = getOpeningExplorerRootRefIds(explorer, 'white');
    const blackRootRefIds = getOpeningExplorerRootRefIds(explorer, 'black');

    expect(whiteRootRefIds.map((refId) => formatOpeningExplorerMoveLabel(explorer, refId, 'white'))).toEqual([
      '1. e4',
      '1. d4',
    ]);
    expect(blackRootRefIds.map((refId) => formatOpeningExplorerMoveLabel(explorer, refId, 'black'))).toEqual([
      'vs 1. e4',
      'vs 1. d4',
    ]);
  });

  it('computes descendant counts for move branches', () => {
    const { explorer } = buildOpeningExplorerFixture();
    const frenchNode = getOpeningExplorerNodeForSanMoves(explorer, ['e4', 'e6']);
    const openGameNode = getOpeningExplorerNodeForSanMoves(explorer, ['e4', 'e5']);

    expect(frenchNode.descendantLineCount).toBe(1);
    expect(frenchNode.descendantRecordCount).toBe(2);
    expect(openGameNode.descendantLineCount).toBe(2);
    expect(openGameNode.descendantPositionCount).toBeGreaterThan(0);
  });

  it('projects white rows to opponent reply plus player move after the first layer', () => {
    const { explorer } = buildOpeningExplorerFixture();
    const e4RefId = getOpeningExplorerRootRefIds(explorer, 'white')[0];
    const childLabels = getOpeningExplorerDisplayChildRefIds(explorer, 'white', e4RefId)
      .map((refId) => formatOpeningExplorerMoveLabel(explorer, refId, 'white'));

    expect(childLabels).toEqual([
      '... e5 2. Nf3',
      '... e6 2. d4',
    ]);
  });

  it('projects black rows to player replies and then opponent plus player move pairs', () => {
    const { explorer } = buildOpeningExplorerFixture();
    const vsE4RefId = getOpeningExplorerRootRefIds(explorer, 'black')[0];
    const childLabels = getOpeningExplorerDisplayChildRefIds(explorer, 'black', vsE4RefId)
      .map((refId) => formatOpeningExplorerMoveLabel(explorer, refId, 'black'));

    expect(childLabels).toContain('... e5');
    expect(childLabels).toContain('... e6');

    const e5RefId = findDisplayRefIdByLabel(explorer, 'black', getOpeningExplorerDisplayChildRefIds(explorer, 'black', vsE4RefId), '... e5');
    const deeperLabels = getOpeningExplorerDisplayChildRefIds(explorer, 'black', e5RefId)
      .map((refId) => formatOpeningExplorerMoveLabel(explorer, refId, 'black'));

    expect(deeperLabels).toContain('2. Nf3 ... Nc6');
  });

  it('resolves exact-name opening selections from repeated opening names', () => {
    const { explorer } = buildOpeningExplorerFixture();
    const e4RefId = getOpeningExplorerRootRefIds(explorer, 'white')[0];
    const frenchRefId = findDisplayRefIdByLabel(
      explorer,
      'white',
      getOpeningExplorerDisplayChildRefIds(explorer, 'white', e4RefId),
      '... e6 2. d4',
    );
    const frenchDisplayRef = getOpeningExplorerDisplayRef(explorer, 'white', frenchRefId);

    if (!frenchDisplayRef?.openingNodeId || !frenchDisplayRef.openingName) {
      throw new Error('Missing French Defense reference in fixture.');
    }

    const recordIds = resolveOpeningExplorerRecordIds(explorer, [
      buildOpeningSelection({
        kind: 'opening',
        nodeId: frenchDisplayRef.openingNodeId,
        anchorRefId: frenchDisplayRef.id,
        openingName: frenchDisplayRef.openingName,
        eco: frenchDisplayRef.eco,
      }),
    ]);

    expect(recordIds).toEqual(['record-1', 'record-2']);
  });

  it('collapses descendant selections when a parent branch is added', () => {
    const { explorer } = buildOpeningExplorerFixture();
    const parentRefId = getOpeningExplorerRootRefIds(explorer, 'white')[0];
    const parentDisplayRef = getOpeningExplorerDisplayRef(explorer, 'white', parentRefId);
    const childRefId = findDisplayRefIdByLabel(
      explorer,
      'white',
      getOpeningExplorerDisplayChildRefIds(explorer, 'white', parentRefId),
      '... e6 2. d4',
    );
    const childDisplayRef = getOpeningExplorerDisplayRef(explorer, 'white', childRefId);

    if (!parentDisplayRef || !childDisplayRef) {
      throw new Error('Missing branch display references in fixture.');
    }

    const childBranch = buildOpeningSelection({
      kind: 'branch',
      nodeId: childDisplayRef.terminalNodeId,
      anchorRefId: childDisplayRef.id,
      openingName: childDisplayRef.openingName,
      eco: childDisplayRef.eco,
    });
    const childOpening = buildOpeningSelection({
      kind: 'opening',
      nodeId: childDisplayRef.terminalNodeId,
      anchorRefId: childDisplayRef.id,
      openingName: childDisplayRef.openingName,
      eco: childDisplayRef.eco,
    });
    const parentBranch = buildOpeningSelection({
      kind: 'branch',
      nodeId: parentDisplayRef.terminalNodeId,
      anchorRefId: parentDisplayRef.id,
      openingName: parentDisplayRef.openingName,
      eco: parentDisplayRef.eco,
    });

    const collapsedSelections = normalizeOpeningSelectionsAfterAdd(explorer, [childBranch, childOpening], parentBranch);

    expect(collapsedSelections).toEqual([parentBranch]);
    expect(getOpeningExplorerCoveringBranchSelection(explorer, collapsedSelections, childDisplayRef.terminalNodeId)?.id).toBe(parentBranch.id);
    expect(normalizeOpeningSelectionsAfterAdd(explorer, collapsedSelections, childBranch)).toEqual(collapsedSelections);
  });

  it('feeds subtree selections into the trainer resolver and derives compatibility fields', () => {
    const { explorer } = buildOpeningExplorerFixture();
    const e4RefId = getOpeningExplorerRootRefIds(explorer, 'white')[0];
    const nF3RefId = findDisplayRefIdByLabel(
      explorer,
      'white',
      getOpeningExplorerDisplayChildRefIds(explorer, 'white', e4RefId),
      '... e5 2. Nf3',
    );
    const nF3DisplayRef = getOpeningExplorerDisplayRef(explorer, 'white', nF3RefId);

    if (!nF3DisplayRef) {
      throw new Error('Missing open-game display reference in fixture.');
    }

    const resolvedSelection = resolveOpeningTrainerRecordSelection(explorer, {
      ...defaultOpeningTrainerConfig,
      selections: [
        buildOpeningSelection({
          kind: 'branch',
          nodeId: nF3DisplayRef.terminalNodeId,
          anchorRefId: nF3DisplayRef.id,
          openingName: nF3DisplayRef.openingName,
          eco: nF3DisplayRef.eco,
        }),
      ],
      playerColor: 'white',
      depthPlayerMoves: 3,
    });

    expect(resolvedSelection.recordIds).toEqual(['record-5', 'record-6']);
    expect(resolvedSelection.selectedLineIds).toHaveLength(2);
    expect(resolvedSelection.selectedFamilyNames).toEqual(['Italian Game', 'Ruy Lopez']);
    expect(getOpeningExplorerDisplayChildRefIds(explorer, 'white', nF3DisplayRef.id)).not.toHaveLength(0);
  });
});
