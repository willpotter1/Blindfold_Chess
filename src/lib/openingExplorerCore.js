import { Chess } from 'chess.js';

/**
 * @typedef {{
 *   id: string;
 *   kind: 'branch' | 'opening';
 *   nodeId: string;
 *   anchorRefId: string;
 *   openingName?: string | null;
 *   eco?: string | null;
 * }} OpeningSelection
 */

/**
 * @typedef {{
 *   id: string;
 *   epd: string;
 *   fen: string;
 *   ply: number;
 *   name?: string | null;
 *   eco?: string | null;
 *   lineId?: string | null;
 *   children: string[];
 *   terminalRecordIds: string[];
 *   childCount: number;
 *   descendantPositionCount: number;
 *   descendantNamedCount: number;
 *   descendantRecordCount: number;
 *   descendantLineCount: number;
 * }} OpeningPositionNode
 */

/**
 * @typedef {{
 *   id: string;
 *   nodeId: string;
 *   parentRefId: string | null;
 *   childRefIds: string[];
 *   sanFromParent: string | null;
 *   uciFromParent: string | null;
 *   depth: number;
 *   pathSan: string;
 *   pathUci: string;
 * }} OpeningTreeRef
 */

/**
 * @typedef {{
 *   id: string;
 *   parentDisplayRefId: string | null;
 *   childDisplayRefIds: string[];
 *   startTreeRefId: string;
 *   endTreeRefId: string;
 *   terminalNodeId: string;
 *   hiddenTreeRefIds: string[];
 *   depth: number;
 *   label: string;
 *   breadcrumbLabel: string;
 *   pathSan: string;
 *   pathUci: string;
 *   openingNodeId?: string | null;
 *   openingName?: string | null;
 *   eco?: string | null;
 * }} OpeningDisplayRef
 */

/**
 * @typedef {{
 *   meta: import('./openings').OpeningLookupMeta;
 *   catalog: import('./openings').OpeningCatalog;
 *   records: import('./openings').OpeningLookupRecord[];
 *   nodes: OpeningPositionNode[];
 *   treeRefs: OpeningTreeRef[];
 *   rootNodeId: string;
 *   rootRefId: string;
 * }} OpeningExplorerData
 */

const ROOT_CHESS = new Chess();
export const OPENING_EXPLORER_ROOT_FEN = ROOT_CHESS.fen();
export const OPENING_EXPLORER_ROOT_EPD = OPENING_EXPLORER_ROOT_FEN.split(' ').slice(0, 4).join(' ');
const WHITE_ROOT_PRIORITY = ['e4', 'd4', 'c4', 'Nf3'];
const DEFAULT_MOVE_LABEL_SEPARATOR = ' / ';
const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
  ? import.meta.env.BASE_URL.replace(/\/$/, '')
  : '';
const OPENINGS_EXPLORER_URL = `${baseUrl}/data/lichess-openings.explorer.json`;

let openingExplorerPromise = null;
let openingExplorerIndexCache = new WeakMap();

const compareText = (left, right) => left.localeCompare(right);

const toNormalizedEpd = (fen) => {
  const chess = new Chess(fen);
  return chess.fen().split(' ').slice(0, 4).join(' ');
};

const splitUciMoves = (uci) => uci.trim().split(/\s+/).filter(Boolean);

const applyUciToChess = (chess, uci) => chess.move({
  from: uci.slice(0, 2),
  to: uci.slice(2, 4),
  promotion: uci.slice(4, 5) || undefined,
});

const createNode = (id, fen, ply) => ({
  id,
  epd: id,
  fen,
  ply,
  name: null,
  eco: null,
  lineId: null,
  children: [],
  terminalRecordIds: [],
  childCount: 0,
  descendantPositionCount: 0,
  descendantNamedCount: 0,
  descendantRecordCount: 0,
  descendantLineCount: 0,
});

const createTreeRef = ({
  id,
  nodeId,
  parentRefId,
  sanFromParent,
  uciFromParent,
  depth,
  pathSan,
  pathUci,
}) => ({
  id,
  nodeId,
  parentRefId,
  childRefIds: [],
  sanFromParent,
  uciFromParent,
  depth,
  pathSan,
  pathUci,
});

const createDisplayRef = ({
  id,
  parentDisplayRefId,
  startTreeRefId,
  endTreeRefId,
  terminalNodeId,
  hiddenTreeRefIds,
  depth,
  label,
  breadcrumbLabel,
  pathSan,
  pathUci,
  openingNodeId,
  openingName,
  eco,
}) => ({
  id,
  parentDisplayRefId,
  childDisplayRefIds: [],
  startTreeRefId,
  endTreeRefId,
  terminalNodeId,
  hiddenTreeRefIds,
  depth,
  label,
  breadcrumbLabel,
  pathSan,
  pathUci,
  openingNodeId,
  openingName,
  eco,
});

const sortAndDedupeTextValues = (values) => (
  Array.from(new Set(values.filter(Boolean))).sort(compareText)
);

const getWhiteRootPriorityIndex = (san) => {
  const index = WHITE_ROOT_PRIORITY.indexOf(san ?? '');
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const isExcludedRootMoveSan = (san) => /^(a|h)\d$|^N[ah]3$/.test((san ?? '').trim());
const isExcludedRootOpeningName = (openingName) => /saragossa/i.test((openingName ?? '').trim());

const createExplorerIndex = (data) => {
  const nodesById = new Map(data.nodes.map((node) => [node.id, node]));
  const refsById = new Map(data.treeRefs.map((treeRef) => [treeRef.id, treeRef]));
  const recordsById = new Map(data.records.map((record) => [record.id, record]));
  const descendantNodeIdsByNodeId = new Map();
  const descendantRecordIdsByNodeId = new Map();
  const exactNameRecordIdsByKey = new Map();
  const breadcrumbCache = new Map();
  const displayProjectionByPlayerColor = new Map();

  return {
    nodesById,
    refsById,
    recordsById,
    descendantNodeIdsByNodeId,
    descendantRecordIdsByNodeId,
    exactNameRecordIdsByKey,
    breadcrumbCache,
    displayProjectionByPlayerColor,
  };
};

const getExplorerIndex = (data) => {
  const cachedIndex = openingExplorerIndexCache.get(data);

  if (cachedIndex) {
    return cachedIndex;
  }

  const nextIndex = createExplorerIndex(data);
  openingExplorerIndexCache.set(data, nextIndex);
  return nextIndex;
};

const collectDescendantNodeIds = (data, nodeId) => {
  const index = getExplorerIndex(data);
  const cachedIds = index.descendantNodeIdsByNodeId.get(nodeId);

  if (cachedIds) {
    return cachedIds;
  }

  const node = index.nodesById.get(nodeId);
  const collectedIds = new Set();

  if (node) {
    node.children.forEach((childNodeId) => {
      collectedIds.add(childNodeId);
      collectDescendantNodeIds(data, childNodeId).forEach((descendantNodeId) => {
        collectedIds.add(descendantNodeId);
      });
    });
  }

  index.descendantNodeIdsByNodeId.set(nodeId, collectedIds);
  return collectedIds;
};

const collectDescendantRecordIds = (data, nodeId) => {
  const index = getExplorerIndex(data);
  const cachedIds = index.descendantRecordIdsByNodeId.get(nodeId);

  if (cachedIds) {
    return cachedIds;
  }

  const node = index.nodesById.get(nodeId);
  const collectedIds = new Set(node?.terminalRecordIds ?? []);

  if (node) {
    node.children.forEach((childNodeId) => {
      collectDescendantRecordIds(data, childNodeId).forEach((recordId) => {
        collectedIds.add(recordId);
      });
    });
  }

  index.descendantRecordIdsByNodeId.set(nodeId, collectedIds);
  return collectedIds;
};

const collectExactNameRecordIds = (data, nodeId, openingName) => {
  const index = getExplorerIndex(data);
  const cacheKey = `${nodeId}::${openingName}`;
  const cachedIds = index.exactNameRecordIdsByKey.get(cacheKey);

  if (cachedIds) {
    return cachedIds;
  }

  const node = index.nodesById.get(nodeId);
  const collectedIds = new Set();

  if (node) {
    node.terminalRecordIds.forEach((recordId) => {
      const record = index.recordsById.get(recordId);

      if (record?.name === openingName) {
        collectedIds.add(recordId);
      }
    });

    node.children.forEach((childNodeId) => {
      collectExactNameRecordIds(data, childNodeId, openingName).forEach((recordId) => {
        collectedIds.add(recordId);
      });
    });
  }

  index.exactNameRecordIdsByKey.set(cacheKey, collectedIds);
  return collectedIds;
};

export const buildOpeningSelectionId = (selection) => {
  if (selection.kind === 'opening') {
    return `opening:${selection.nodeId}:${selection.openingName ?? ''}`;
  }

  return `branch:${selection.nodeId}`;
};

export const buildOpeningSelection = ({
  kind,
  nodeId,
  anchorRefId,
  openingName = null,
  eco = null,
}) => ({
  id: buildOpeningSelectionId({
    kind,
    nodeId,
    anchorRefId,
    openingName,
    eco,
  }),
  kind,
  nodeId,
  anchorRefId,
  openingName,
  eco,
});

export const buildOpeningExplorerData = ({
  catalog,
  records,
}) => {
  const nodesById = new Map();
  const refsById = new Map();
  const refIdByKey = new Map();
  const recordsById = new Map(records.map((record) => [record.id, record]));
  let nextRefIndex = 1;

  const getOrCreateNode = (epd, fen, ply) => {
    const existingNode = nodesById.get(epd);

    if (existingNode) {
      existingNode.ply = Math.min(existingNode.ply, ply);
      existingNode.fen = fen;
      return existingNode;
    }

    const nextNode = createNode(epd, fen, ply);
    nodesById.set(epd, nextNode);
    return nextNode;
  };

  const rootNode = createNode(OPENING_EXPLORER_ROOT_EPD, OPENING_EXPLORER_ROOT_FEN, 0);
  const rootRef = createTreeRef({
    id: 'ref-root',
    nodeId: rootNode.id,
    parentRefId: null,
    sanFromParent: null,
    uciFromParent: null,
    depth: 0,
    pathSan: '',
    pathUci: '',
  });

  nodesById.set(rootNode.id, rootNode);
  refsById.set(rootRef.id, rootRef);

  records
    .slice()
    .sort((left, right) => compareText(left.id, right.id))
    .forEach((record) => {
      const chess = new Chess();
      const uciMoves = splitUciMoves(record.uci);
      let currentNode = rootNode;
      let currentRef = rootRef;

      uciMoves.forEach((uci, moveIndex) => {
        const appliedMove = applyUciToChess(chess, uci);

        if (!appliedMove) {
          throw new Error(`Could not apply opening move ${uci} for ${record.id}.`);
        }

        const fen = chess.fen();
        const epd = toNormalizedEpd(fen);
        const childNode = getOrCreateNode(epd, fen, moveIndex + 1);

        if (!currentNode.children.includes(childNode.id)) {
          currentNode.children.push(childNode.id);
        }

        const refKey = `${currentRef.id}|${childNode.id}`;
        let childRefId = refIdByKey.get(refKey);

        if (!childRefId) {
          childRefId = `ref-${nextRefIndex}`;
          nextRefIndex += 1;
          refIdByKey.set(refKey, childRefId);

          const nextRef = createTreeRef({
            id: childRefId,
            nodeId: childNode.id,
            parentRefId: currentRef.id,
            sanFromParent: appliedMove.san,
            uciFromParent: uci,
            depth: currentRef.depth + 1,
            pathSan: currentRef.pathSan ? `${currentRef.pathSan} ${appliedMove.san}` : appliedMove.san,
            pathUci: currentRef.pathUci ? `${currentRef.pathUci} ${uci}` : uci,
          });

          refsById.set(nextRef.id, nextRef);
          currentRef.childRefIds.push(nextRef.id);
        }

        currentRef = refsById.get(childRefId);
        currentNode = childNode;
      });

      if (!currentNode.terminalRecordIds.includes(record.id)) {
        currentNode.terminalRecordIds.push(record.id);
      }

      if (!currentNode.name) {
        currentNode.name = record.name;
        currentNode.eco = record.eco;
        currentNode.lineId = record.lineId;
      }
    });

  const statsMemo = new Map();

  const collectNodeStats = (nodeId) => {
    const cachedStats = statsMemo.get(nodeId);

    if (cachedStats) {
      return cachedStats;
    }

    const node = nodesById.get(nodeId);
    const descendantNodeIds = new Set();
    const descendantNamedNodeIds = new Set();
    const descendantRecordIds = new Set(node?.terminalRecordIds ?? []);
    const descendantLineIds = new Set(
      (node?.terminalRecordIds ?? [])
        .map((recordId) => recordsById.get(recordId)?.lineId ?? null)
        .filter(Boolean),
    );

    if (node) {
      node.children.forEach((childNodeId) => {
        descendantNodeIds.add(childNodeId);

        const childNode = nodesById.get(childNodeId);
        if (childNode?.name) {
          descendantNamedNodeIds.add(childNodeId);
        }

        const childStats = collectNodeStats(childNodeId);
        childStats.descendantNodeIds.forEach((descendantNodeId) => {
          descendantNodeIds.add(descendantNodeId);
        });
        childStats.descendantNamedNodeIds.forEach((descendantNodeId) => {
          descendantNamedNodeIds.add(descendantNodeId);
        });
        childStats.descendantRecordIds.forEach((recordId) => {
          descendantRecordIds.add(recordId);
        });
        childStats.descendantLineIds.forEach((lineId) => {
          descendantLineIds.add(lineId);
        });
      });
    }

    const nextStats = {
      descendantNodeIds,
      descendantNamedNodeIds,
      descendantRecordIds,
      descendantLineIds,
    };

    statsMemo.set(nodeId, nextStats);
    return nextStats;
  };

  nodesById.forEach((node) => {
    const nodeStats = collectNodeStats(node.id);
    node.childCount = node.children.length;
    node.descendantPositionCount = nodeStats.descendantNodeIds.size;
    node.descendantNamedCount = nodeStats.descendantNamedNodeIds.size;
    node.descendantRecordCount = nodeStats.descendantRecordIds.size;
    node.descendantLineCount = nodeStats.descendantLineIds.size;
  });

  const getNodeForRef = (refId) => nodesById.get(refsById.get(refId)?.nodeId ?? '');

  const compareChildRefs = (parentRefId, leftRefId, rightRefId) => {
    const leftRef = refsById.get(leftRefId);
    const rightRef = refsById.get(rightRefId);
    const leftNode = getNodeForRef(leftRefId);
    const rightNode = getNodeForRef(rightRefId);

    if (parentRefId === rootRef.id) {
      const priorityDifference = getWhiteRootPriorityIndex(leftRef?.sanFromParent) - getWhiteRootPriorityIndex(rightRef?.sanFromParent);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }
    }

    const descendantDifference = (rightNode?.descendantLineCount ?? 0) - (leftNode?.descendantLineCount ?? 0);

    if (descendantDifference !== 0) {
      return descendantDifference;
    }

    const sanComparison = compareText(leftRef?.sanFromParent ?? '', rightRef?.sanFromParent ?? '');

    if (sanComparison !== 0) {
      return sanComparison;
    }

    return compareText(leftRef?.pathUci ?? '', rightRef?.pathUci ?? '');
  };

  refsById.forEach((treeRef) => {
    treeRef.childRefIds = treeRef.childRefIds
      .slice()
      .sort((leftRefId, rightRefId) => compareChildRefs(treeRef.id, leftRefId, rightRefId));
  });

  nodesById.forEach((node) => {
    node.children = node.children
      .slice()
      .sort((leftNodeId, rightNodeId) => compareText(leftNodeId, rightNodeId));
    node.terminalRecordIds = node.terminalRecordIds
      .slice()
      .sort(compareText);
  });

  return {
    meta: catalog.meta,
    catalog,
    records: records.slice().sort((left, right) => compareText(left.id, right.id)),
    nodes: Array.from(nodesById.values()).sort((left, right) => compareText(left.id, right.id)),
    treeRefs: Array.from(refsById.values()).sort((left, right) => compareText(left.id, right.id)),
    rootNodeId: rootNode.id,
    rootRefId: rootRef.id,
  };
};

export const resetOpeningExplorerAssetCacheForTests = () => {
  openingExplorerPromise = null;
  openingExplorerIndexCache = new WeakMap();
};

export const getOpeningExplorerData = async () => {
  if (!openingExplorerPromise) {
    openingExplorerPromise = fetch(OPENINGS_EXPLORER_URL).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load openings explorer data: ${response.status}`);
      }

      return response.json();
    });
  }

  return openingExplorerPromise;
};

export const getOpeningExplorerNode = (data, nodeId) => getExplorerIndex(data).nodesById.get(nodeId) ?? null;

export const getOpeningExplorerTreeRef = (data, refId) => getExplorerIndex(data).refsById.get(refId) ?? null;

export const getOpeningExplorerRecord = (data, recordId) => getExplorerIndex(data).recordsById.get(recordId) ?? null;

const formatRawOpeningExplorerMoveLabel = (
  data,
  refId,
  playerColor,
) => {
  const treeRef = getOpeningExplorerTreeRef(data, refId);

  if (!treeRef || !treeRef.sanFromParent) {
    return 'Start';
  }

  if (playerColor === 'black' && treeRef.depth === 1) {
    return `vs 1. ${treeRef.sanFromParent}`;
  }

  if (treeRef.depth % 2 === 1) {
    return `${Math.ceil(treeRef.depth / 2)}. ${treeRef.sanFromParent}`;
  }

  return `... ${treeRef.sanFromParent}`;
};

const getRawOpeningExplorerBreadcrumbItems = (
  data,
  refId,
  playerColor,
) => {
  const index = getExplorerIndex(data);
  const cacheKey = `raw:${playerColor}:${refId}`;
  const cachedItems = index.breadcrumbCache.get(cacheKey);

  if (cachedItems) {
    return cachedItems;
  }

  const breadcrumbItems = [];
  let currentRef = getOpeningExplorerTreeRef(data, refId);

  while (currentRef && currentRef.parentRefId) {
    if (currentRef.id !== data.rootRefId) {
      breadcrumbItems.unshift({
        refId: currentRef.id,
        label: formatRawOpeningExplorerMoveLabel(data, currentRef.id, playerColor),
      });
    }

    currentRef = getOpeningExplorerTreeRef(data, currentRef.parentRefId);
  }

  index.breadcrumbCache.set(cacheKey, breadcrumbItems);
  return breadcrumbItems;
};

const getRawTreeRefPathIdsBetween = (data, startTreeRefId, endTreeRefId) => {
  const pathRefIds = [];
  let currentRef = getOpeningExplorerTreeRef(data, endTreeRefId);

  while (currentRef) {
    pathRefIds.unshift(currentRef.id);

    if (currentRef.id === startTreeRefId) {
      return pathRefIds;
    }

    currentRef = currentRef.parentRefId
      ? getOpeningExplorerTreeRef(data, currentRef.parentRefId)
      : null;
  }

  return [];
};

const formatOpeningExplorerDisplayLabel = (
  data,
  playerColor,
  startTreeRefId,
  endTreeRefId,
) => {
  const startTreeRef = getOpeningExplorerTreeRef(data, startTreeRefId);
  const endTreeRef = getOpeningExplorerTreeRef(data, endTreeRefId);

  if (!startTreeRef?.sanFromParent || !endTreeRef?.sanFromParent) {
    return 'Start';
  }

  if (startTreeRefId === endTreeRefId) {
    return formatRawOpeningExplorerMoveLabel(data, startTreeRefId, playerColor);
  }

  if (playerColor === 'white') {
    return `... ${startTreeRef.sanFromParent} ${Math.ceil(endTreeRef.depth / 2)}. ${endTreeRef.sanFromParent}`;
  }

  return `${Math.ceil(startTreeRef.depth / 2)}. ${startTreeRef.sanFromParent} ... ${endTreeRef.sanFromParent}`;
};

const getNextOpeningExplorerDisplaySegments = (data, playerColor, terminalTreeRefId) => {
  const terminalTreeRef = getOpeningExplorerTreeRef(data, terminalTreeRefId);

  if (!terminalTreeRef) {
    return [];
  }

  if (terminalTreeRef.id === data.rootRefId) {
    return terminalTreeRef.childRefIds.map((childTreeRefId) => ({
      startTreeRefId: childTreeRefId,
      endTreeRefId: childTreeRefId,
    }));
  }

  if (playerColor === 'black' && terminalTreeRef.depth === 1) {
    return terminalTreeRef.childRefIds.map((childTreeRefId) => ({
      startTreeRefId: childTreeRefId,
      endTreeRefId: childTreeRefId,
    }));
  }

  return terminalTreeRef.childRefIds.flatMap((firstHopTreeRefId) => {
    const firstHopTreeRef = getOpeningExplorerTreeRef(data, firstHopTreeRefId);

    return (firstHopTreeRef?.childRefIds ?? []).map((secondHopTreeRefId) => ({
      startTreeRefId: firstHopTreeRefId,
      endTreeRefId: secondHopTreeRefId,
    }));
  });
};

const getNearestDisplayAncestorOpeningName = (displayRefsById, displayRefId) => {
  let currentDisplayRefId = displayRefId;

  while (currentDisplayRefId) {
    const displayRef = displayRefsById.get(currentDisplayRefId);

    if (!displayRef) {
      return null;
    }

    if (displayRef.openingName) {
      return displayRef.openingName;
    }

    currentDisplayRefId = displayRef.parentDisplayRefId;
  }

  return null;
};

const buildOpeningExplorerDisplayProjection = (data, playerColor) => {
  const index = getExplorerIndex(data);
  const cachedProjection = index.displayProjectionByPlayerColor.get(playerColor);

  if (cachedProjection) {
    return cachedProjection;
  }

  const displayRefsById = new Map();

  const buildDisplayChildRefIds = (parentDisplayRefId, terminalTreeRefId, depth) => (
    getNextOpeningExplorerDisplaySegments(data, playerColor, terminalTreeRefId).map(({ startTreeRefId, endTreeRefId }) => {
      const rawPathRefIds = getRawTreeRefPathIdsBetween(data, startTreeRefId, endTreeRefId);
      const endTreeRef = getOpeningExplorerTreeRef(data, endTreeRefId);
      const displayRefId = `display:${playerColor}:${startTreeRefId}:${endTreeRefId}`;
      const ancestorOpeningName = getNearestDisplayAncestorOpeningName(displayRefsById, parentDisplayRefId);
      let openingNodeId = null;
      let openingName = null;
      let eco = null;

      rawPathRefIds.some((rawTreeRefId) => {
        const rawTreeRef = getOpeningExplorerTreeRef(data, rawTreeRefId);
        const node = rawTreeRef ? getOpeningExplorerNode(data, rawTreeRef.nodeId) : null;

        if (!node?.name || node.name === ancestorOpeningName) {
          return false;
        }

        openingNodeId = node.id;
        openingName = node.name;
        eco = node.eco ?? null;
        return true;
      });

      if (!endTreeRef) {
        return null;
      }

      const displayRef = createDisplayRef({
        id: displayRefId,
        parentDisplayRefId,
        startTreeRefId,
        endTreeRefId,
        terminalNodeId: endTreeRef.nodeId,
        hiddenTreeRefIds: rawPathRefIds.slice(0, -1),
        depth,
        label: formatOpeningExplorerDisplayLabel(data, playerColor, startTreeRefId, endTreeRefId),
        breadcrumbLabel: formatOpeningExplorerDisplayLabel(data, playerColor, startTreeRefId, endTreeRefId),
        pathSan: endTreeRef.pathSan,
        pathUci: endTreeRef.pathUci,
        openingNodeId,
        openingName,
        eco,
      });

      displayRefsById.set(displayRef.id, displayRef);
      displayRef.childDisplayRefIds = buildDisplayChildRefIds(displayRef.id, endTreeRefId, depth + 1);
      return displayRef.id;
    }).filter(Boolean)
  );

  const projection = {
    displayRefs: [],
    displayRefsById,
    rootDisplayRefIds: buildDisplayChildRefIds(null, data.rootRefId, 1).filter((displayRefId) => {
      const displayRef = displayRefsById.get(displayRefId);
      const startTreeRef = displayRef ? getOpeningExplorerTreeRef(data, displayRef.startTreeRefId) : null;
      return (
        !isExcludedRootMoveSan(startTreeRef?.sanFromParent ?? '') &&
        !isExcludedRootOpeningName(displayRef?.openingName)
      );
    }),
  };

  projection.displayRefs = Array.from(displayRefsById.values());
  index.displayProjectionByPlayerColor.set(playerColor, projection);
  return projection;
};

export const getOpeningExplorerDisplayRef = (
  data,
  playerColor,
  refId,
) => buildOpeningExplorerDisplayProjection(data, playerColor).displayRefsById.get(refId) ?? null;

export const getOpeningExplorerRootRefIds = (
  data,
  playerColor = 'white',
) => buildOpeningExplorerDisplayProjection(data, playerColor).rootDisplayRefIds;

export const getOpeningExplorerDisplayChildRefIds = (
  data,
  playerColor,
  refId,
) => getOpeningExplorerDisplayRef(data, playerColor, refId)?.childDisplayRefIds ?? [];

export const getOpeningExplorerVisibleRefIds = (
  data,
  playerColor = 'white',
  expandedRefIds,
) => {
  const visibleRefIds = [];
  const expandedSet = expandedRefIds instanceof Set ? expandedRefIds : new Set(expandedRefIds);

  const walkRef = (refId) => {
    visibleRefIds.push(refId);

    if (!expandedSet.has(refId)) {
      return;
    }

    getOpeningExplorerDisplayChildRefIds(data, playerColor, refId).forEach(walkRef);
  };

  getOpeningExplorerRootRefIds(data, playerColor).forEach(walkRef);
  return visibleRefIds;
};

export const getOpeningExplorerAncestorRefIds = (
  data,
  playerColor,
  refId,
) => {
  const ancestorRefIds = [];
  let currentDisplayRef = getOpeningExplorerDisplayRef(data, playerColor, refId);

  while (currentDisplayRef?.parentDisplayRefId) {
    ancestorRefIds.unshift(currentDisplayRef.parentDisplayRefId);
    currentDisplayRef = getOpeningExplorerDisplayRef(data, playerColor, currentDisplayRef.parentDisplayRefId);
  }

  return ancestorRefIds;
};

export const formatOpeningExplorerMoveLabel = (
  data,
  refId,
  playerColor = 'white',
) => getOpeningExplorerDisplayRef(data, playerColor, refId)?.label
  ?? formatRawOpeningExplorerMoveLabel(data, refId, playerColor);

export const getOpeningExplorerBreadcrumbItems = (
  data,
  refId,
  playerColor = 'white',
) => {
  const displayRef = getOpeningExplorerDisplayRef(data, playerColor, refId);

  if (!displayRef) {
    return getRawOpeningExplorerBreadcrumbItems(data, refId, playerColor);
  }

  const index = getExplorerIndex(data);
  const cacheKey = `display:${playerColor}:${refId}`;
  const cachedItems = index.breadcrumbCache.get(cacheKey);

  if (cachedItems) {
    return cachedItems;
  }

  const breadcrumbItems = [];
  let currentDisplayRef = displayRef;

  while (currentDisplayRef) {
    breadcrumbItems.unshift({
      refId: currentDisplayRef.id,
      label: currentDisplayRef.breadcrumbLabel,
    });

    currentDisplayRef = currentDisplayRef.parentDisplayRefId
      ? getOpeningExplorerDisplayRef(data, playerColor, currentDisplayRef.parentDisplayRefId)
      : null;
  }

  index.breadcrumbCache.set(cacheKey, breadcrumbItems);
  return breadcrumbItems;
};

export const getOpeningExplorerBreadcrumbText = (
  data,
  refId,
  playerColor = 'white',
  separator = DEFAULT_MOVE_LABEL_SEPARATOR,
) => getOpeningExplorerBreadcrumbItems(data, refId, playerColor)
  .map((item) => item.label)
  .join(separator);

const getRawOpeningExplorerNearestNamedAncestor = (data, refId) => {
  let currentRef = getOpeningExplorerTreeRef(data, refId);

  while (currentRef?.parentRefId) {
    currentRef = getOpeningExplorerTreeRef(data, currentRef.parentRefId);

    if (!currentRef || currentRef.id === data.rootRefId) {
      continue;
    }

    const node = getOpeningExplorerNode(data, currentRef.nodeId);

    if (node?.name) {
      return node;
    }
  }

  return null;
};

export const getOpeningExplorerDisplayNameForRef = (
  data,
  refId,
  playerColor = 'white',
) => {
  const displayRef = getOpeningExplorerDisplayRef(data, playerColor, refId);

  if (displayRef) {
    if (!displayRef.openingName) {
      return null;
    }

    const ancestorDisplayRef = getOpeningExplorerAncestorRefIds(data, playerColor, refId)
      .map((ancestorRefId) => getOpeningExplorerDisplayRef(data, playerColor, ancestorRefId))
      .reverse()
      .find((ancestorRef) => ancestorRef?.openingName);

    if (ancestorDisplayRef?.openingName === displayRef.openingName) {
      return null;
    }

    return displayRef.openingName;
  }

  const treeRef = getOpeningExplorerTreeRef(data, refId);
  const node = treeRef ? getOpeningExplorerNode(data, treeRef.nodeId) : null;

  if (!node?.name) {
    return null;
  }

  const ancestorNode = getRawOpeningExplorerNearestNamedAncestor(data, refId);

  if (ancestorNode?.name === node.name) {
    return null;
  }

  return node.name;
};

const normalizeSearchText = (value) => value.toLowerCase().trim().replace(/\s+/g, ' ');

const normalizeMoveSequenceText = (value) => normalizeSearchText(value).replace(/\d+\.(\.\.)?/g, '').replace(/\s+/g, ' ').trim();

export const searchOpeningExplorer = (
  data,
  playerColor,
  query,
) => {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedMoveQuery = normalizeMoveSequenceText(query);

  if (!normalizedQuery) {
    return [];
  }

  return buildOpeningExplorerDisplayProjection(data, playerColor).displayRefs
    .map((displayRef) => {
      const terminalNode = getOpeningExplorerNode(data, displayRef.terminalNodeId);
      const nameText = normalizeSearchText(displayRef.openingName ?? '');
      const ecoText = normalizeSearchText(displayRef.eco ?? '');
      const labelText = normalizeSearchText(displayRef.label);
      const pathSanText = normalizeSearchText(displayRef.pathSan);
      const pathUciText = normalizeSearchText(displayRef.pathUci);
      const moveSequenceText = normalizeMoveSequenceText(displayRef.pathSan);
      const breadcrumbText = normalizeSearchText(getOpeningExplorerBreadcrumbText(data, displayRef.id, playerColor));
      const matches = (
        nameText.includes(normalizedQuery) ||
        ecoText.includes(normalizedQuery) ||
        labelText.includes(normalizedQuery) ||
        breadcrumbText.includes(normalizedQuery) ||
        pathUciText.includes(normalizedQuery) ||
        pathSanText.includes(normalizedQuery) ||
        (normalizedMoveQuery.length > 0 && (
          moveSequenceText.startsWith(normalizedMoveQuery) ||
          pathUciText.startsWith(normalizedMoveQuery)
        ))
      );

      return matches
        ? {
            refId: displayRef.id,
            nodeId: displayRef.terminalNodeId,
            score: (
              Number(nameText.startsWith(normalizedQuery)) * 8 +
              Number(ecoText.startsWith(normalizedQuery)) * 7 +
              Number(labelText.startsWith(normalizedQuery)) * 6 +
              Number(pathSanText.startsWith(normalizedQuery)) * 5 +
              Number(moveSequenceText.startsWith(normalizedMoveQuery)) * 4 +
              Number(nameText.includes(normalizedQuery)) * 3 +
              Number(pathSanText.includes(normalizedQuery)) * 2 +
              Number(pathUciText.includes(normalizedQuery))
            ),
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const leftRef = getOpeningExplorerDisplayRef(data, playerColor, left.refId);
      const rightRef = getOpeningExplorerDisplayRef(data, playerColor, right.refId);
      const leftNode = getOpeningExplorerNode(data, left.nodeId) ?? getOpeningExplorerNode(data, leftRef?.openingNodeId ?? '');
      const rightNode = getOpeningExplorerNode(data, right.nodeId) ?? getOpeningExplorerNode(data, rightRef?.openingNodeId ?? '');

      if ((rightNode?.descendantLineCount ?? 0) !== (leftNode?.descendantLineCount ?? 0)) {
        return (rightNode?.descendantLineCount ?? 0) - (leftNode?.descendantLineCount ?? 0);
      }

      if ((leftRef?.depth ?? 0) !== (rightRef?.depth ?? 0)) {
        return (leftRef?.depth ?? 0) - (rightRef?.depth ?? 0);
      }

      return compareText(leftRef?.pathUci ?? '', rightRef?.pathUci ?? '');
    })
    .slice(0, 24);
};

export const resolveOpeningExplorerRecordIds = (
  data,
  selections,
) => {
  const recordIds = new Set();

  (selections ?? []).forEach((selection) => {
    if (selection.kind === 'opening' && selection.openingName) {
      collectExactNameRecordIds(data, selection.nodeId, selection.openingName).forEach((recordId) => {
        recordIds.add(recordId);
      });
      return;
    }

    collectDescendantRecordIds(data, selection.nodeId).forEach((recordId) => {
      recordIds.add(recordId);
    });
  });

  return Array.from(recordIds).sort(compareText);
};

export const deriveOpeningExplorerLegacySelectionsFromRecordIds = (
  data,
  recordIds,
) => {
  const families = [];
  const lineIds = [];

  recordIds.forEach((recordId) => {
    const record = getOpeningExplorerRecord(data, recordId);

    if (!record) {
      return;
    }

    families.push(record.family);
    lineIds.push(record.lineId);
  });

  return {
    selectedFamilyNames: sortAndDedupeTextValues(families),
    selectedLineIds: sortAndDedupeTextValues(lineIds),
  };
};

export const getOpeningExplorerCoveringBranchSelection = (
  data,
  selections,
  nodeId,
  excludedSelectionId = null,
) => {
  for (const selection of selections ?? []) {
    if (selection.kind !== 'branch' || selection.id === excludedSelectionId || selection.nodeId === nodeId) {
      continue;
    }

    if (collectDescendantNodeIds(data, selection.nodeId).has(nodeId)) {
      return selection;
    }
  }

  return null;
};

export const normalizeOpeningSelectionsAfterAdd = (
  data,
  currentSelections,
  nextSelection,
) => {
  const currentValue = currentSelections ?? [];

  if (getOpeningExplorerCoveringBranchSelection(data, currentValue, nextSelection.nodeId, null)) {
    return currentValue;
  }

  if (currentValue.some((selection) => selection.id === nextSelection.id)) {
    return currentValue;
  }

  if (nextSelection.kind === 'branch') {
    const descendantNodeIds = collectDescendantNodeIds(data, nextSelection.nodeId);

    return [
      ...currentValue.filter((selection) => (
        selection.nodeId !== nextSelection.nodeId &&
        !descendantNodeIds.has(selection.nodeId)
      )),
      nextSelection,
    ];
  }

  return [...currentValue, nextSelection];
};

export const removeOpeningSelectionById = (selections, selectionId) => (
  (selections ?? []).filter((selection) => selection.id !== selectionId)
);

export const getOpeningExplorerSelectionLabel = (
  data,
  selection,
  playerColor,
) => {
  if (!selection) {
    return '';
  }

  if (selection.kind === 'opening' && selection.openingName) {
    return selection.openingName;
  }

  return getOpeningExplorerBreadcrumbText(data, selection.anchorRefId, playerColor) || 'Start';
};
