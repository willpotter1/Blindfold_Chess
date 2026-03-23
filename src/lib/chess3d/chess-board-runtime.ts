import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { Chess } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const STANDARD_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const PIECE_NAME_BY_CODE = {
    p: "pawn",
    r: "rook",
    n: "knight",
    b: "bishop",
    q: "queen",
    k: "king",
};
const TEMPLATE_CONFIG = [
    { key: "boardBase", label: "board mesh `board_base`", match: /^boardbase$/ },
    { key: "boardTop", label: "board mesh `board_top`", match: /^boardtop$/ },
    { key: "white_king", label: "white king", match: /^kingwhite\d*$/ },
    { key: "white_queen", label: "white queen", match: /^queenwhite\d*$/ },
    { key: "white_rook", label: "white rook", match: /^rookwhite\d*$/ },
    { key: "white_bishop", label: "white bishop", match: /^bishopwhite\d*$/ },
    { key: "white_knight", label: "white knight", match: /^knightwhite\d*$/ },
    { key: "white_pawn", label: "white pawn", match: /^pawnwhite\d*$/ },
    { key: "black_king", label: "black king", match: /^kingblack\d*$/ },
    { key: "black_queen", label: "black queen", match: /^queenblack\d*$/ },
    { key: "black_rook", label: "black rook", match: /^rookblack\d*$/ },
    { key: "black_bishop", label: "black bishop", match: /^bishopblack\d*$/ },
    { key: "black_knight", label: "black knight", match: /^knightblack\d*$/ },
    { key: "black_pawn", label: "black pawn", match: /^pawnblack\d*$/ },
];
const ID_POOLS = {
    w: {
        k: ["wK"],
        q: ["wQ"],
        r: ["wR1", "wR2"],
        b: ["wB1", "wB2"],
        n: ["wN1", "wN2"],
        p: Array.from({ length: 8 }, (_, index) => `wP${index + 1}`),
    },
    b: {
        k: ["bK"],
        q: ["bQ"],
        r: ["bR1", "bR2"],
        b: ["bB1", "bB2"],
        n: ["bN1", "bN2"],
        p: Array.from({ length: 8 }, (_, index) => `bP${index + 1}`),
    },
};
const CANONICAL_PIECES = [
    { id: "wK", color: "white", code: "k" },
    { id: "wQ", color: "white", code: "q" },
    { id: "wR1", color: "white", code: "r" },
    { id: "wR2", color: "white", code: "r" },
    { id: "wB1", color: "white", code: "b" },
    { id: "wB2", color: "white", code: "b" },
    { id: "wN1", color: "white", code: "n" },
    { id: "wN2", color: "white", code: "n" },
    ...Array.from({ length: 8 }, (_, index) => ({
        id: `wP${index + 1}`,
        color: "white",
        code: "p",
    })),
    { id: "bK", color: "black", code: "k" },
    { id: "bQ", color: "black", code: "q" },
    { id: "bR1", color: "black", code: "r" },
    { id: "bR2", color: "black", code: "r" },
    { id: "bB1", color: "black", code: "b" },
    { id: "bB2", color: "black", code: "b" },
    { id: "bN1", color: "black", code: "n" },
    { id: "bN2", color: "black", code: "n" },
    ...Array.from({ length: 8 }, (_, index) => ({
        id: `bP${index + 1}`,
        color: "black",
        code: "p",
    })),
];

export type ChessBoardReplayFormat = "uci";

export type ChessBoardReplayInput = {
    fen?: string;
    moves?: string | string[];
    format?: ChessBoardReplayFormat;
    moveDurationMs?: number;
    captureDelayMs?: number;
};

export type ChessBoard3DRuntimeOptions = {
    container: HTMLElement;
    glbUrl: string;
    hdriUrl: string;
    initialFen?: string;
    enableControls?: boolean;
    logObjectNames?: boolean;
};

function normalizeName(value = "") {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function markShadowCasters(object) {
    object.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
}

function softenPieceMaterials(object) {
    object.traverse((child) => {
        if (!child.isMesh || !child.material) {
            return;
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
            if (!material || typeof material !== "object") {
                continue;
            }

            if ("metalness" in material && typeof material.metalness === "number") {
                material.metalness *= 0.35;
            }

            if ("roughness" in material && typeof material.roughness === "number") {
                material.roughness = Math.min(1, Math.max(material.roughness, 0.72));
            }

            if ("envMapIntensity" in material && typeof material.envMapIntensity === "number") {
                material.envMapIntensity *= 0.45;
            }
        }
    });
}

function softenBoardMaterials(object) {
    object.traverse((child) => {
        if (!child.isMesh || !child.material) {
            return;
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
            if (!material || typeof material !== "object") {
                continue;
            }

            if ("metalness" in material && typeof material.metalness === "number") {
                material.metalness *= 0.18;
            }

            if ("roughness" in material && typeof material.roughness === "number") {
                material.roughness = Math.min(1, Math.max(material.roughness, 0.88));
            }

            if ("envMapIntensity" in material && typeof material.envMapIntensity === "number") {
                material.envMapIntensity *= 0.12;
            }
        }
    });
}

function createEmptyBoardState() {
    const state = {};

    for (let rank = 1; rank <= 8; rank += 1) {
        for (const file of FILES) {
            state[`${file}${rank}`] = null;
        }
    }

    return state;
}

function sortSquares(a, b) {
    const fileDifference = FILES.indexOf(a[0]) - FILES.indexOf(b[0]);
    if (fileDifference !== 0) {
        return fileDifference;
    }

    return Number.parseInt(a[1], 10) - Number.parseInt(b[1], 10);
}

function parseUciMove(token) {
    const normalized = String(token).trim().toLowerCase();
    if (!normalized) {
        throw new Error("Encountered an empty UCI move token.");
    }

    const match = normalized.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
    if (!match) {
        throw new Error(`Invalid UCI move: ${token}`);
    }

    return {
        uci: normalized,
        from: match[1],
        to: match[2],
        promotion: match[3] ?? undefined,
    };
}

function normalizeMoveList(moves) {
    if (Array.isArray(moves)) {
        return moves.flatMap((entry) => String(entry).split(/[\s,]+/)).filter(Boolean);
    }

    return String(moves ?? "")
        .split(/[\s,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function sleep(milliseconds) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}

function createChess(fen = STANDARD_START_FEN) {
    const chess = new Chess();
    try {
        chess.load(fen);
    } catch {
        throw new Error(`Invalid FEN: ${fen}`);
    }
    return chess;
}

function disposeMaterial(material, textures) {
    if (!material) {
        return;
    }

    for (const value of Object.values(material)) {
        if (value && typeof value === "object" && "isTexture" in value) {
            textures.add(value);
        }
    }

    if (typeof material.dispose === "function") {
        material.dispose();
    }
}

function disposeObject3D(root) {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();

    root.traverse((child) => {
        if (!child || !("isMesh" in child) || !child.isMesh) {
            return;
        }

        if (child.geometry) {
            geometries.add(child.geometry);
        }

        if (Array.isArray(child.material)) {
            for (const material of child.material) {
                materials.add(material);
            }
            return;
        }

        if (child.material) {
            materials.add(child.material);
        }
    });

    for (const geometry of geometries) {
        if (geometry && typeof geometry.dispose === "function") {
            geometry.dispose();
        }
    }

    for (const material of materials) {
        disposeMaterial(material, textures);
    }

    for (const texture of textures) {
        if (texture && typeof texture.dispose === "function") {
            texture.dispose();
        }
    }
}

export class ChessBoard3DRuntime {
    constructor({
        container,
        glbUrl,
        hdriUrl,
        initialFen = STANDARD_START_FEN,
        enableControls = true,
        logObjectNames = true,
    }: ChessBoard3DRuntimeOptions) {
        if (!container) {
            throw new Error("A container element is required for ChessBoard3DRuntime.");
        }
        if (!glbUrl) {
            throw new Error("A GLB asset URL is required for ChessBoard3DRuntime.");
        }
        if (!hdriUrl) {
            throw new Error("An HDRI asset URL is required for ChessBoard3DRuntime.");
        }

        this.container = container;
        this.glbUrl = glbUrl;
        this.hdriUrl = hdriUrl;
        this.initialFen = initialFen;
        this.enableControls = enableControls;
        this.logObjectNames = logObjectNames;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.controls = null;
        this.resizeObserver = null;

        this.boardGroup = new THREE.Group();
        this.boardGroup.name = "BoardGroup";
        this.pieceGroup = new THREE.Group();
        this.pieceGroup.name = "PieceGroup";

        this.gltfLoader = new GLTFLoader();
        this.hdriLoader = new RGBELoader();
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.interactionPoint = new THREE.Vector3();
        this.interactionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        this.objectNames = [];
        this.pieceTemplates = {
            white: {},
            black: {},
        };
        this.boardBounds = null;
        this.boardSurfaceY = 0;
        this.squareSize = 0;
        this.cameraDirection = new THREE.Vector3(-0.42, 1.02, -1.18).normalize();
        this.cameraTarget = new THREE.Vector3();

        this.pieces = new Map();
        this.boardState = createEmptyBoardState();

        this.replay = null;
        this.isPlaying = false;
        this.piecesVisible = true;
        this.playSession = 0;
        this.playPromise = null;
        this.playPromiseSession = null;
        this.playPromiseResolver = null;
        this.activeStepPromise = null;
        this.animationEpoch = 0;
        this.initialized = false;
        this.disposed = false;
    }

    async init() {
        if (this.initialized) {
            return;
        }
        if (this.disposed) {
            throw new Error("ChessBoard3DRuntime has already been disposed.");
        }

        this.setupRenderer();
        this.setupScene();

        const [environmentMap, gltf] = await Promise.all([
            this.hdriLoader.loadAsync(this.hdriUrl),
            this.gltfLoader.loadAsync(this.glbUrl),
        ]);

        environmentMap.mapping = THREE.EquirectangularReflectionMapping;
        this.environmentMap = environmentMap;
        this.scene.environment = environmentMap;

        this.extractTemplates(gltf.scene);
        this.buildPieceRegistry();
        this.setPosition(this.initialFen);
        this.setPiecesVisible(this.piecesVisible);
        this.frameCameraToBoard();

        this.startRenderLoop();
        this.initialized = true;
    }

    getObjectNames() {
        return [...this.objectNames];
    }

    squareToPosition(square) {
        this.assertInitializedState();
        this.assertSquare(square);

        const fileIndex = FILES.indexOf(square[0]);
        const rankIndex = Number.parseInt(square[1], 10) - 1;
        const x = this.boardBounds.min.x + this.squareSize / 2 + fileIndex * this.squareSize;
        const z = this.boardBounds.min.z + this.squareSize / 2 + rankIndex * this.squareSize;

        return new THREE.Vector3(x, this.boardSurfaceY, z);
    }

    setPosition(fen = STANDARD_START_FEN) {
        this.assertInitializedState();
        this.pause();
        this.animationEpoch += 1;

        const chess = createChess(fen);
        const assignments = this.buildAssignmentsFromFen(chess);

        this.boardState = createEmptyBoardState();

        for (const piece of this.pieces.values()) {
            this.applyPieceVisual(piece, piece.baseType);
            piece.square = null;
            piece.captured = true;
            piece.promoted = false;
            piece.mesh.visible = false;
        }

        for (const assignment of assignments) {
            const piece = this.pieces.get(assignment.pieceId);
            if (!piece) {
                throw new Error(`Unknown piece ID generated from FEN: ${assignment.pieceId}`);
            }

            this.applyPieceVisual(piece, assignment.type);
            this.placePiece(piece, assignment.square);
            piece.promoted = assignment.promoted;
            this.boardState[assignment.square] = assignment.pieceId;
        }
    }

    getBoardState() {
        return { ...this.boardState };
    }

    getSquareFromClientPoint(clientX, clientY) {
        this.assertInitializedState();

        const bounds = this.renderer.domElement.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) {
            return null;
        }

        this.pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
        this.pointer.y = -(((clientY - bounds.top) / bounds.height) * 2 - 1);
        this.interactionPlane.constant = -this.boardSurfaceY;
        this.raycaster.setFromCamera(this.pointer, this.camera);

        const intersection = this.raycaster.ray.intersectPlane(this.interactionPlane, this.interactionPoint);
        if (!intersection) {
            return null;
        }

        const withinX = intersection.x >= this.boardBounds.min.x && intersection.x <= this.boardBounds.max.x;
        const withinZ = intersection.z >= this.boardBounds.min.z && intersection.z <= this.boardBounds.max.z;

        if (!withinX || !withinZ) {
            return null;
        }

        const fileIndex = Math.min(
            FILES.length - 1,
            Math.max(0, Math.floor((intersection.x - this.boardBounds.min.x) / this.squareSize)),
        );
        const rankIndex = Math.min(
            7,
            Math.max(0, Math.floor((intersection.z - this.boardBounds.min.z) / this.squareSize)),
        );

        return `${FILES[fileIndex]}${rankIndex + 1}`;
    }

    setPiecesVisible(visible) {
        this.piecesVisible = Boolean(visible);
        this.syncPieceVisibility();
    }

    async animateMove(pieceId, from, to, options = {}) {
        this.assertInitializedState();
        this.assertSquare(from);
        this.assertSquare(to);

        const piece = this.requirePiece(pieceId);
        const durationMs = options.durationMs ?? 700;
        const updateState = options.updateState ?? true;
        const startPosition = piece.mesh.position.clone();
        const targetSurface = this.squareToPosition(to);
        const targetPosition = new THREE.Vector3(targetSurface.x, piece.mesh.position.y, targetSurface.z);
        const liftHeight = options.liftHeight ?? Math.max(this.squareSize * 0.4, 0.05);
        const startTime = performance.now();
        const animationEpoch = this.animationEpoch;

        await new Promise((resolve) => {
            const step = (timestamp) => {
                if (animationEpoch !== this.animationEpoch) {
                    resolve();
                    return;
                }

                const elapsed = timestamp - startTime;
                const progress = durationMs <= 0 ? 1 : Math.min(elapsed / durationMs, 1);
                const arc = Math.sin(progress * Math.PI) * liftHeight;

                piece.mesh.position.lerpVectors(startPosition, targetPosition, progress);
                piece.mesh.position.y = THREE.MathUtils.lerp(startPosition.y, targetPosition.y, progress) + arc;

                if (progress >= 1) {
                    piece.mesh.position.copy(targetPosition);
                    resolve();
                    return;
                }

                window.requestAnimationFrame(step);
            };

            window.requestAnimationFrame(step);
        });

        if (animationEpoch !== this.animationEpoch) {
            return;
        }

        piece.mesh.position.copy(targetPosition);
        piece.square = to;

        if (updateState) {
            this.boardState[from] = null;
            this.boardState[to] = pieceId;
        }
    }

    loadReplay(input: ChessBoardReplayInput = {}) {
        this.assertInitializedState();

        const format = input.format ?? "uci";
        if (format !== "uci") {
            throw new Error(`Unsupported replay format: ${format}`);
        }

        const initialFen = input.fen ?? STANDARD_START_FEN;
        const chess = createChess(initialFen);
        const queue = [];

        for (const token of normalizeMoveList(input.moves)) {
            const parsedMove = parseUciMove(token);
            const result = chess.move({
                from: parsedMove.from,
                to: parsedMove.to,
                promotion: parsedMove.promotion,
            });

            if (!result) {
                throw new Error(`Illegal move in replay sequence: ${token}`);
            }

            const rook =
                result.flags.includes("k") || result.flags.includes("q")
                    ? {
                          from: `${result.flags.includes("k") ? "h" : "a"}${result.color === "w" ? "1" : "8"}`,
                          to: `${result.flags.includes("k") ? "f" : "d"}${result.color === "w" ? "1" : "8"}`,
                      }
                    : null;

            queue.push({
                uci: parsedMove.uci,
                from: result.from,
                to: result.to,
                promotion: result.promotion ?? null,
                flags: result.flags,
                color: result.color,
                piece: result.piece,
                san: result.san,
                captured: result.captured ?? null,
                capturedSquare: result.flags.includes("e")
                    ? `${result.to[0]}${result.from[1]}`
                    : result.captured
                      ? result.to
                      : null,
                rook,
            });
        }

        this.replay = {
            format,
            initialFen,
            moves: queue,
            currentIndex: 0,
            moveDurationMs: input.moveDurationMs ?? 700,
            captureDelayMs: input.captureDelayMs ?? 120,
        };

        this.setPosition(initialFen);
    }

    play() {
        if (!this.replay || this.isPlaying) {
            return this.playPromise ?? Promise.resolve();
        }

        if (this.replay.currentIndex >= this.replay.moves.length) {
            return Promise.resolve();
        }

        this.isPlaying = true;
        this.playSession += 1;
        const session = this.playSession;
        const playPromise = this.createPlayPromise(session);

        void (async () => {
            try {
                while (
                    this.isPlaying &&
                    session === this.playSession &&
                    this.replay &&
                    this.replay.currentIndex < this.replay.moves.length
                ) {
                    await this.stepForward();
                }
            } finally {
                if (session === this.playSession) {
                    this.isPlaying = false;
                    this.resolvePlayPromise(session);
                }
            }
        })();

        return playPromise;
    }

    pause() {
        const activeSession = this.playSession;
        this.isPlaying = false;
        this.playSession += 1;
        this.resolvePlayPromise(activeSession);
    }

    async stepForward() {
        if (!this.replay || this.replay.currentIndex >= this.replay.moves.length) {
            return;
        }

        if (this.activeStepPromise) {
            return this.activeStepPromise;
        }

        const replayState = this.replay;
        const currentIndex = replayState.currentIndex;
        const currentMove = replayState.moves[currentIndex];
        const stepEpoch = this.animationEpoch;
        const promise = this.executeReplayMove(currentMove, {
            durationMs: this.replay.moveDurationMs,
            captureDelayMs: this.replay.captureDelayMs,
            stepEpoch,
        })
            .then((completed) => {
                if (
                    completed &&
                    this.replay === replayState &&
                    this.animationEpoch === stepEpoch &&
                    replayState.currentIndex === currentIndex
                ) {
                    replayState.currentIndex += 1;
                }
            })
            .finally(() => {
                if (this.activeStepPromise === promise) {
                    this.activeStepPromise = null;
                }
            });

        this.activeStepPromise = promise;
        return promise;
    }

    reset() {
        this.pause();
        this.animationEpoch += 1;

        if (this.replay) {
            this.replay.currentIndex = 0;
            this.setPosition(this.replay.initialFen);
            return;
        }

        this.setPosition(this.initialFen);
    }

    dispose() {
        if (this.disposed) {
            return;
        }

        this.pause();
        this.animationEpoch += 1;
        this.renderer.setAnimationLoop(null);
        this.resizeObserver?.disconnect();
        this.controls?.dispose();

        if (this.environmentMap) {
            this.environmentMap.dispose();
            this.environmentMap = null;
        }

        disposeObject3D(this.boardGroup);
        disposeObject3D(this.pieceGroup);
        this.renderer.dispose();

        if (this.renderer.domElement.parentElement === this.container) {
            this.container.removeChild(this.renderer.domElement);
        }

        this.disposed = true;
        this.initialized = false;
    }

    setupRenderer() {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight, false);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.domElement.style.width = "100%";
        this.renderer.domElement.style.height = "100%";

        this.container.innerHTML = "";
        this.container.appendChild(this.renderer.domElement);

        if (typeof ResizeObserver !== "undefined") {
            this.resizeObserver = new ResizeObserver(() => {
                this.handleResize();
            });
            this.resizeObserver.observe(this.container);
        }
    }

    setupScene() {
        this.scene.add(this.boardGroup);
        this.scene.add(this.pieceGroup);

        const ambientLight = new THREE.HemisphereLight(0xf7ecd1, 0x24190f, 1.35);
        this.scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
        keyLight.position.set(1.8, 2.6, 1.2);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(2048, 2048);
        keyLight.shadow.camera.near = 0.2;
        keyLight.shadow.camera.far = 8;
        keyLight.shadow.camera.left = -2;
        keyLight.shadow.camera.right = 2;
        keyLight.shadow.camera.top = 2;
        keyLight.shadow.camera.bottom = -2;
        this.scene.add(keyLight);

        if (this.enableControls) {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.minDistance = 0.95;
            this.controls.maxDistance = 2.6;
            this.controls.maxPolarAngle = Math.PI * 0.48;
            this.controls.minPolarAngle = Math.PI * 0.18;
        }

        this.handleResize();
    }

    handleResize() {
        const width = Math.max(this.container.clientWidth, 1);
        const height = Math.max(this.container.clientHeight, 1);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);

        if (this.boardBounds) {
            this.frameCameraToBoard();
        }
    }

    extractTemplates(sourceScene) {
        const namedObjects = [];
        const candidates = [];

        sourceScene.updateMatrixWorld(true);
        sourceScene.traverse((object) => {
            if (!object.name) {
                return;
            }

            namedObjects.push(object.name);
            candidates.push({
                name: object.name,
                normalized: normalizeName(object.name),
                object,
            });
        });

        this.objectNames = [...new Set(namedObjects)];

        if (this.logObjectNames) {
            console.groupCollapsed("[ChessBoard3D] GLB object names");
            for (const name of this.objectNames) {
                console.log(name);
            }
            console.groupEnd();
        }

        const matches = {};
        const missing = [];

        for (const config of TEMPLATE_CONFIG) {
            const entry = candidates.find(({ normalized }) => config.match.test(normalized));
            if (!entry) {
                missing.push(config.label);
                continue;
            }

            matches[config.key] = entry.object;
        }

        if (missing.length > 0) {
            throw new Error(
                `Missing required template selectors: ${missing.join(", ")}. Discovered objects: ${this.objectNames.join(", ")}`
            );
        }

        this.boardGroup.clear();
        const boardBase = this.createTemplateClone(matches.boardBase);
        const boardTop = this.createTemplateClone(matches.boardTop);
        softenBoardMaterials(boardBase);
        softenBoardMaterials(boardTop);
        this.boardGroup.add(boardBase);
        this.boardGroup.add(boardTop);

        this.boardBounds = new THREE.Box3().setFromObject(this.boardGroup);
        this.boardSurfaceY = new THREE.Box3().setFromObject(boardTop).max.y;
        this.squareSize = (this.boardBounds.max.x - this.boardBounds.min.x) / 8;

        this.pieceTemplates = {
            white: {
                king: this.buildTemplateInfo(matches.white_king, { softenMaterials: true }),
                queen: this.buildTemplateInfo(matches.white_queen, { softenMaterials: true }),
                rook: this.buildTemplateInfo(matches.white_rook, { softenMaterials: true }),
                bishop: this.buildTemplateInfo(matches.white_bishop, { softenMaterials: true }),
                knight: this.buildTemplateInfo(matches.white_knight, { softenMaterials: true }),
                pawn: this.buildTemplateInfo(matches.white_pawn, { softenMaterials: true }),
            },
            black: {
                king: this.buildTemplateInfo(matches.black_king, { softenMaterials: true }),
                queen: this.buildTemplateInfo(matches.black_queen, { softenMaterials: true }),
                rook: this.buildTemplateInfo(matches.black_rook, { softenMaterials: true }),
                bishop: this.buildTemplateInfo(matches.black_bishop, { softenMaterials: true }),
                knight: this.buildTemplateInfo(matches.black_knight, { softenMaterials: true }),
                pawn: this.buildTemplateInfo(matches.black_pawn, { softenMaterials: true }),
            },
        };
    }

    buildTemplateInfo(sourceObject, options = {}) {
        const template = this.createTemplateClone(sourceObject);
        if (options.softenMaterials) {
            softenPieceMaterials(template);
        }
        const bounds = new THREE.Box3().setFromObject(template);
        return {
            object: template,
            minY: bounds.min.y,
        };
    }

    createTemplateClone(sourceObject) {
        const clone = sourceObject.clone(true);
        clone.position.set(0, 0, 0);
        clone.updateMatrixWorld(true);
        markShadowCasters(clone);
        return clone;
    }

    buildPieceRegistry() {
        this.pieceGroup.clear();
        this.pieces.clear();

        for (const spec of CANONICAL_PIECES) {
            const holder = new THREE.Group();
            holder.name = spec.id;
            holder.visible = false;
            holder.userData.pieceId = spec.id;

            const piece = {
                id: spec.id,
                color: spec.color,
                baseType: PIECE_NAME_BY_CODE[spec.code],
                type: PIECE_NAME_BY_CODE[spec.code],
                mesh: holder,
                visual: null,
                square: null,
                captured: true,
                promoted: false,
            };

            this.applyPieceVisual(piece, piece.baseType);
            this.pieceGroup.add(holder);
            this.pieces.set(piece.id, piece);
        }
    }

    buildAssignmentsFromFen(chess) {
        const placements = {
            w: { p: [], r: [], n: [], b: [], q: [], k: [] },
            b: { p: [], r: [], n: [], b: [], q: [], k: [] },
        };

        chess.board().forEach((row, rowIndex) => {
            row.forEach((piece, fileIndex) => {
                if (!piece) {
                    return;
                }

                const square = `${FILES[fileIndex]}${8 - rowIndex}`;
                placements[piece.color][piece.type].push(square);
            });
        });

        const assignments = [];
        assignments.push(...this.allocateColorAssignments("w", placements.w));
        assignments.push(...this.allocateColorAssignments("b", placements.b));

        return assignments;
    }

    allocateColorAssignments(colorCode, byType) {
        const colorPools = ID_POOLS[colorCode];
        const assignments = [];
        const availablePawnIds = [...colorPools.p];

        if (byType.p.length > colorPools.p.length) {
            throw new Error(`FEN contains too many ${colorCode === "w" ? "white" : "black"} pawns.`);
        }

        const sortedPawns = [...byType.p].sort(sortSquares);
        sortedPawns.forEach((square, index) => {
            const pieceId = colorPools.p[index];
            assignments.push({
                pieceId,
                square,
                type: "pawn",
                promoted: false,
            });
            availablePawnIds.shift();
        });

        const allocationOrder = ["k", "q", "r", "b", "n"];
        for (const pieceCode of allocationOrder) {
            const squares = [...byType[pieceCode]].sort(sortSquares);
            const pool = colorPools[pieceCode];
            const type = PIECE_NAME_BY_CODE[pieceCode];

            if (pieceCode === "k" && squares.length > 1) {
                throw new Error(`FEN contains too many ${colorCode === "w" ? "white" : "black"} kings.`);
            }

            const directAssignments = Math.min(squares.length, pool.length);
            for (let index = 0; index < directAssignments; index += 1) {
                assignments.push({
                    pieceId: pool[index],
                    square: squares[index],
                    type,
                    promoted: false,
                });
            }

            if (squares.length > pool.length) {
                const promotedSquares = squares.slice(pool.length);
                if (promotedSquares.length > availablePawnIds.length) {
                    throw new Error(
                        `FEN needs more promoted ${type} pieces than available pawn IDs for ${
                            colorCode === "w" ? "white" : "black"
                        }.`
                    );
                }

                for (const square of promotedSquares) {
                    const pieceId = availablePawnIds.shift();
                    assignments.push({
                        pieceId,
                        square,
                        type,
                        promoted: true,
                    });
                }
            }
        }

        return assignments;
    }

    applyPieceVisual(piece, type) {
        if (piece.visual && piece.type === type) {
            if (piece.square) {
                piece.mesh.position.copy(this.getPiecePosition(piece.square, piece.color, type));
            }
            piece.promoted = piece.baseType === "pawn" && type !== "pawn";
            return;
        }

        if (piece.visual) {
            piece.mesh.remove(piece.visual);
        }

        const template = this.pieceTemplates[piece.color][type];
        if (!template) {
            throw new Error(`Missing ${piece.color} template for ${type}.`);
        }

        const visual = template.object.clone(true);
        markShadowCasters(visual);
        piece.mesh.add(visual);
        piece.visual = visual;
        piece.type = type;
        piece.promoted = piece.baseType === "pawn" && type !== "pawn";

        if (piece.square) {
            piece.mesh.position.copy(this.getPiecePosition(piece.square, piece.color, type));
        } else {
            piece.mesh.position.set(0, this.boardSurfaceY - template.minY, 0);
        }
    }

    placePiece(piece, square) {
        piece.square = square;
        piece.captured = false;
        piece.mesh.visible = this.piecesVisible;
        piece.mesh.position.copy(this.getPiecePosition(square, piece.color, piece.type));
    }

    getPiecePosition(square, color, type) {
        const squarePosition = this.squareToPosition(square);
        const template = this.pieceTemplates[color][type];
        return new THREE.Vector3(squarePosition.x, this.boardSurfaceY - template.minY, squarePosition.z);
    }

    requirePiece(pieceId) {
        const piece = this.pieces.get(pieceId);
        if (!piece) {
            throw new Error(`Unknown piece ID: ${pieceId}`);
        }

        return piece;
    }

    async executeReplayMove(move, options) {
        const isCancelled = () => options.stepEpoch !== this.animationEpoch;
        const movingPieceId = this.boardState[move.from];
        if (!movingPieceId) {
            throw new Error(`No piece found at ${move.from} for replay move ${move.uci}.`);
        }

        const movingPiece = this.requirePiece(movingPieceId);
        const capturedPieceId = move.capturedSquare ? this.boardState[move.capturedSquare] : null;

        if (move.capturedSquare && !capturedPieceId) {
            throw new Error(`Replay expected a capture on ${move.capturedSquare} for move ${move.uci}.`);
        }

        if (move.rook) {
            const rookPieceId = this.boardState[move.rook.from];
            if (!rookPieceId) {
                throw new Error(`Replay expected a rook at ${move.rook.from} for move ${move.uci}.`);
            }

            const rookPiece = this.requirePiece(rookPieceId);

            await Promise.all([
                this.animateMove(movingPieceId, move.from, move.to, {
                    durationMs: options.durationMs,
                    updateState: false,
                }),
                this.animateMove(rookPieceId, move.rook.from, move.rook.to, {
                    durationMs: options.durationMs,
                    updateState: false,
                }),
            ]);

            if (isCancelled()) {
                return false;
            }

            this.boardState[move.from] = null;
            this.boardState[move.rook.from] = null;
            this.boardState[move.to] = movingPieceId;
            this.boardState[move.rook.to] = rookPieceId;
            movingPiece.square = move.to;
            rookPiece.square = move.rook.to;
            return true;
        }

        await this.animateMove(movingPieceId, move.from, move.to, {
            durationMs: options.durationMs,
            updateState: false,
        });

        if (isCancelled()) {
            return false;
        }

        if (capturedPieceId) {
            if (options.captureDelayMs > 0) {
                await sleep(options.captureDelayMs);
            }

            if (isCancelled()) {
                return false;
            }

            const capturedPiece = this.requirePiece(capturedPieceId);
            capturedPiece.square = null;
            capturedPiece.captured = true;
            capturedPiece.mesh.visible = false;
            this.boardState[move.capturedSquare] = null;
        }

        this.boardState[move.from] = null;
        this.boardState[move.to] = movingPieceId;
        movingPiece.square = move.to;

        if (move.promotion) {
            this.applyPieceVisual(movingPiece, PIECE_NAME_BY_CODE[move.promotion]);
            this.placePiece(movingPiece, move.to);
        }

        return true;
    }

    assertSquare(square) {
        if (!/^[a-h][1-8]$/.test(square)) {
            throw new Error(`Invalid chess square: ${square}`);
        }
    }

    assertInitializedState() {
        if (!this.boardBounds) {
            throw new Error("ChessBoard3DRuntime has not been initialized yet.");
        }
    }

    syncPieceVisibility() {
        for (const piece of this.pieces.values()) {
            piece.mesh.visible = this.piecesVisible && !piece.captured;
        }
    }

    frameCameraToBoard() {
        const combinedBounds = new THREE.Box3().setFromObject(this.boardGroup);
        combinedBounds.expandByObject(this.pieceGroup);

        const size = combinedBounds.getSize(new THREE.Vector3());
        const center = combinedBounds.getCenter(new THREE.Vector3());
        const radius = size.length() * 0.5;
        const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
        const limitingFov = Math.min(verticalFov, horizontalFov);
        const distance = (radius / Math.sin(limitingFov / 2)) * 1.12;

        this.cameraTarget.copy(center);
        this.cameraTarget.y = this.boardSurfaceY + size.y * 0.2;
        this.camera.position.copy(this.cameraTarget).addScaledVector(this.cameraDirection, distance);
        this.camera.lookAt(this.cameraTarget);

        if (this.controls) {
            this.controls.target.copy(this.cameraTarget);
            this.controls.minDistance = distance * 0.72;
            this.controls.maxDistance = distance * 1.75;
            this.controls.update();
        }
    }

    startRenderLoop() {
        this.renderer.setAnimationLoop(() => {
            if (this.controls) {
                this.controls.update();
            }

            this.renderer.render(this.scene, this.camera);
        });
    }

    createPlayPromise(session) {
        if (this.playPromise && this.playPromiseSession === session) {
            return this.playPromise;
        }

        this.playPromiseSession = session;
        this.playPromise = new Promise((resolve) => {
            this.playPromiseResolver = resolve;
        });

        return this.playPromise;
    }

    resolvePlayPromise(session) {
        if (!this.playPromise || this.playPromiseSession !== session) {
            return;
        }

        const resolve = this.playPromiseResolver;
        this.playPromise = null;
        this.playPromiseSession = null;
        this.playPromiseResolver = null;
        resolve?.();
    }
}
