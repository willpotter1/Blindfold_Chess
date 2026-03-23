import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PUZZLE_CHUNK_SIZE = 500;
const MOVE_POSITION_CHUNK_SIZE = 100;

const getSupabaseAdminClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const loadPuzzles = () => {
  const puzzlePath = path.join(PROJECT_ROOT, "src", "data", "lichess_mate_1200_1800_dev.json");
  const raw = fs.readFileSync(puzzlePath, "utf8");
  const puzzles = JSON.parse(raw);

  return puzzles.map((puzzle) => ({
    id: puzzle.id,
    fen: puzzle.fen,
    moves: puzzle.moves,
    rating: puzzle.rating,
    themes: puzzle.themes,
    game_url: puzzle.gameUrl ?? null,
  }));
};

const loadMoveDrillPositions = () => {
  const movePositionsPath = path.join(PROJECT_ROOT, "src", "data", "visionMovePositions.ts");
  const source = fs.readFileSync(movePositionsPath, "utf8");
  const match = source.match(/export const visionMovePositions = (\[[\s\S]*\]) as const;/);

  if (!match) {
    throw new Error("Could not parse src/data/visionMovePositions.ts");
  }

  const movePositions = Function(`"use strict"; return (${match[1]});`)();

  return movePositions.map((position) => ({
    id: position.id,
    fen: position.fen,
    san: position.san,
    from_square: position.fromSquare,
    to_square: position.toSquare,
    turn_color: position.turnColor,
  }));
};

const upsertInChunks = async (supabase, table, rows, chunkSize) => {
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, {
        onConflict: "id",
      });

    if (error) {
      throw error;
    }

    console.log(`Upserted ${table} rows ${start + 1}-${start + chunk.length} of ${rows.length}`);
  }
};

const fetchExactCount = async (supabase, table) => {
  const { count, error } = await supabase
    .from(table)
    .select("*", {
      count: "exact",
      head: true,
    });

  if (error) {
    throw error;
  }

  return count ?? 0;
};

const main = async () => {
  const supabase = getSupabaseAdminClient();
  const puzzles = loadPuzzles();
  const movePositions = loadMoveDrillPositions();

  console.log(`Loaded ${puzzles.length} puzzles from local source data.`);
  console.log(`Loaded ${movePositions.length} move drill positions from local source data.`);

  await upsertInChunks(supabase, "puzzles", puzzles, PUZZLE_CHUNK_SIZE);
  await upsertInChunks(supabase, "drill_move_positions", movePositions, MOVE_POSITION_CHUNK_SIZE);

  const [puzzleCount, movePositionCount] = await Promise.all([
    fetchExactCount(supabase, "puzzles"),
    fetchExactCount(supabase, "drill_move_positions"),
  ]);

  console.log(`Supabase puzzles count: ${puzzleCount}`);
  console.log(`Supabase move drill positions count: ${movePositionCount}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
