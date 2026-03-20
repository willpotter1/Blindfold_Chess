#!/usr/bin/env python3

from __future__ import annotations

import csv
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
INPUT_CSV = BASE_DIR / "data" / "raw" / "lichess_db_puzzle.csv"
OUTPUT_CSV = BASE_DIR / "data" / "processed" / "lichess_mate_1200_plus_dev.csv"

KEEP_COLUMNS = [
    "PuzzleId",
    "FEN",
    "Moves",
    "Rating",
    "RatingDeviation",
    "Popularity",
    "NbPlays",
    "Themes",
    "GameUrl",
    "OpeningTags",
]

MIN_RATING = 1200
MAX_ROWS = 10000
THEME_TEXT = "mate"


def puzzle_matches(row: dict[str, str]) -> bool:
    try:
        rating = int(row["Rating"])
    except (KeyError, TypeError, ValueError):
        return False

    themes = row.get("Themes", "").lower()
    return MIN_RATING <= rating and THEME_TEXT in themes


def main() -> None:
    if not INPUT_CSV.exists():
        raise SystemExit(f"Input file not found: {INPUT_CSV}")

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    with INPUT_CSV.open("r", encoding="utf-8", newline="") as infile:
        reader = csv.DictReader(infile)
        missing_columns = [column for column in KEEP_COLUMNS if column not in (reader.fieldnames or [])]
        if missing_columns:
            raise SystemExit(f"Missing expected columns: {', '.join(missing_columns)}")

        total_matches = 0
        rows_written = 0
        preview_rows: list[dict[str, str]] = []

        with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as outfile:
            writer = csv.DictWriter(outfile, fieldnames=KEEP_COLUMNS)
            writer.writeheader()

            for row in reader:
                if not puzzle_matches(row):
                    continue

                total_matches += 1

                if rows_written >= MAX_ROWS:
                    continue

                filtered_row = {column: row.get(column, "") for column in KEEP_COLUMNS}
                writer.writerow(filtered_row)
                rows_written += 1

                if len(preview_rows) < 5:
                    preview_rows.append(filtered_row)

    print(f"Total matching puzzles: {total_matches}")
    print(f"Rows written to {OUTPUT_CSV}: {rows_written}")
    print("First 5 rows:")

    if not preview_rows:
        print("No rows matched the filter.")
        return

    for index, row in enumerate(preview_rows, start=1):
        print(f"{index}. {row}")


if __name__ == "__main__":
    main()
