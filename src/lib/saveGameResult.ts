import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { GameState } from "@/hooks/useGameState";
import { getFirestoreDb } from "@/lib/firebase";

type SaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: "no_firebase" | "error"; error?: unknown };

export const saveCompletedGame = async (gameState: GameState): Promise<SaveResult> => {
  const db = getFirestoreDb();
  if (!db) {
    console.info("Firestore not configured; skipping game save.");
    return { ok: false, reason: "no_firebase" };
  }

  const payload = {
    moves: gameState.moves,
    result: gameState.result,
    finalFen: gameState.fen,
    halfMoveCount: gameState.halfMoveCount,
    playerMoveCount: gameState.playerMoveCount,
    config: {
      playerColor: gameState.playerColor,
      difficulty: gameState.difficulty,
      engineElo: gameState.engineElo,
      revealEvery: gameState.revealEvery,
    },
    createdAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, "games"), payload);
    return { ok: true, id: docRef.id };
  } catch (error) {
    console.error("Failed to save completed game:", error);
    return { ok: false, reason: "error", error };
  }
};
