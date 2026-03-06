import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { GameState } from "@/hooks/useGameState";
import { getFirestoreDb, getFirebaseAuth } from "@/lib/firebase";

type SaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: "no_firebase" | "error"; error?: unknown };

export const saveCompletedGame = async (gameState: GameState, pgn: string): Promise<SaveResult> => {
  const db = getFirestoreDb();
  if (!db) {
    console.info("Firestore not configured; skipping game save.");
    return { ok: false, reason: "no_firebase" };
  }

  const userId = getFirebaseAuth()?.currentUser?.uid ?? "guest";

  const payload = {
    userId,
    pgn,
    config: {
      playerColor: gameState.playerColor,
      engineElo: gameState.engineElo,
      revealEvery: gameState.revealEvery,
      allowCheats: gameState.allowCheats,
      hideMoveHistory: gameState.hideMoveHistory,
    },
    createdAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, "games"), payload);
    console.info("Saved completed game:", docRef.id);
    return { ok: true, id: docRef.id };
  } catch (error) {
    console.error("Failed to save completed game:", error);
    return { ok: false, reason: "error", error };
  }
};
