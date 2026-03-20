#!/usr/bin/env python3

from __future__ import annotations

import csv
import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
INPUT_CSV = BASE_DIR / "data" / "processed" / "lichess_mate_1200_1800_dev.csv"
OUTPUT_JSON = BASE_DIR / "src" / "data" / "lichess_mate_1200_1800_dev.json"


def main() -> None:
    if not INPUT_CSV.exists():
        raise SystemExit(f"Input file not found: {INPUT_CSV}")

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    puzzles = []
    with INPUT_CSV.open("r", encoding="utf-8", newline="") as infile:
        reader = csv.DictReader(infile)
        for row in reader:
            puzzle_id = row.get("PuzzleId", "").strip()
            fen = row.get("FEN", "").strip()
            moves = [move for move in row.get("Moves", "").split() if move]
            rating = int(row.get("Rating", "0") or 0)
            themes = [theme for theme in row.get("Themes", "").split() if theme]

            if not puzzle_id or not fen or not moves:
                continue

            puzzles.append(
                {
                    "id": puzzle_id,
                    "fen": fen,
                    "moves": moves,
                    "rating": rating,
                    "themes": themes,
                    "gameUrl": row.get("GameUrl", "").strip(),
                }
            )

    with OUTPUT_JSON.open("w", encoding="utf-8") as outfile:
        json.dump(puzzles, outfile, indent=2)
        outfile.write("\n")

    print(f"Wrote {len(puzzles)} puzzles to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
