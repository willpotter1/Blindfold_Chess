import { buildSavedGameConfig, type GameState } from "@/lib/gameSession";
import { supabase } from "@/lib/supabase";

type SaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: "no_supabase" | "not_signed_in" | "error"; error?: unknown };

export const saveCompletedGame = async (gameState: GameState, pgn: string): Promise<SaveResult> => {
  if (!supabase) {
    console.info("Supabase not configured; skipping game save.");
    return { ok: false, reason: "no_supabase" };
  }

  const config = buildSavedGameConfig(gameState);
  const payload = {
    pgn,
    mode: gameState.mode,
    player_color: config.mode === "computer" ? config.playerColor : null,
    engine_elo: config.mode === "computer" ? config.engineElo : null,
    reveal_every: config.revealEvery,
    allow_cheats: config.allowCheats,
    hide_move_history: config.hideMoveHistory,
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    if (!user) {
      console.info("Skipping completed game save because the user is not signed in.");
      return { ok: false, reason: "not_signed_in" };
    }

    const { data, error } = await supabase
      .from("games")
      .insert({
        user_id: user.id,
        ...payload,
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    console.info("Saved completed game:", data.id);
    return { ok: true, id: data.id };
  } catch (error) {
    console.error("Failed to save completed game:", error);
    return { ok: false, reason: "error", error };
  }
};
