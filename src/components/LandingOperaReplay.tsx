import { useEffect, useRef } from "react";
import { ChessBoard3D, type ChessBoard3DHandle } from "@/components/ChessBoard3D";
import { startLoopingReplay } from "@/lib/chess3d/operaReplay";

export const LandingOperaReplay = () => {
  const boardRef = useRef<ChessBoard3DHandle | null>(null);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) {
      return undefined;
    }

    return startLoopingReplay(board);
  }, []);

  return (
    <ChessBoard3D
      ref={boardRef}
      piecesVisible
      enableControls
      className="w-full max-w-3xl"
    />
  );
};
