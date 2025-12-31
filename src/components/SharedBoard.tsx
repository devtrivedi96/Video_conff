import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface SharedBoardProps {
  roomId: string;
  isHost: boolean;
}

export function SharedBoard({ roomId, isHost }: SharedBoardProps) {
  const [board, setBoard] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [editingBoard, setEditingBoard] = useState(false);
  const [editingCode, setEditingCode] = useState(false);
  const [tab, setTab] = useState<"board" | "code">("board");

  useEffect(() => {
    const roomRef = doc(db, "rooms", roomId);
    const unsub = onSnapshot(roomRef, (snap) => {
      const data = snap.data() as any;
      if (!data) return;
      setBoard(data.board || "");
      setCode(data.code || "");
    });
    return () => unsub();
  }, [roomId]);

  const saveBoard = async () => {
    await updateDoc(doc(db, "rooms", roomId), {
      board,
      board_updated_at: new Date(),
    }).catch(() => {});
    setEditingBoard(false);
  };

  const saveCode = async () => {
    await updateDoc(doc(db, "rooms", roomId), {
      code,
      code_updated_at: new Date(),
    }).catch(() => {});
    setEditingCode(false);
  };

  return (
    <div className="fixed right-6 bottom-24 z-50 w-96 bg-slate-900/95 border border-white/10 rounded-xl p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("board")}
            className={`px-3 py-1 rounded ${
              tab === "board" ? "bg-slate-800 text-white" : "text-slate-300"
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setTab("code")}
            className={`px-3 py-1 rounded ${
              tab === "code" ? "bg-slate-800 text-white" : "text-slate-300"
            }`}
          >
            Code
          </button>
        </div>
        <div>
          {tab === "board" && isHost ? (
            <button
              onClick={() => setEditingBoard((v) => !v)}
              className="text-xs text-blue-300 hover:text-blue-200"
            >
              {editingBoard ? "Cancel" : "Edit"}
            </button>
          ) : null}
          {tab === "code" && isHost ? (
            <button
              onClick={() => setEditingCode((v) => !v)}
              className="text-xs text-blue-300 hover:text-blue-200"
            >
              {editingCode ? "Cancel" : "Edit"}
            </button>
          ) : null}
        </div>
      </div>

      {tab === "board" ? (
        editingBoard && isHost ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              className="w-full h-40 p-2 rounded bg-slate-800 border border-white/10 text-white"
            />
            <div className="flex justify-end">
              <button
                onClick={saveBoard}
                className="px-4 py-2 bg-blue-600 rounded text-white"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="text-slate-200 text-sm whitespace-pre-wrap max-h-40 overflow-auto">
            {board || <span className="text-slate-500">No board content</span>}
          </div>
        )
      ) : tab === "code" ? (
        editingCode && isHost ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-40 p-2 rounded bg-black border border-white/10 text-green-200 font-mono text-sm"
            />
            <div className="flex justify-end">
              <button
                onClick={saveCode}
                className="px-4 py-2 bg-blue-600 rounded text-white"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <pre className="text-green-200 text-sm font-mono max-h-40 overflow-auto whitespace-pre-wrap">
            {code || "// No code shared"}
          </pre>
        )
      ) : null}
    </div>
  );
}
