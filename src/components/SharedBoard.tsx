import { useEffect, useState, useRef } from "react";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  setDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
// optional CodeMirror integration
import CodeMirror from "@uiw/react-codemirror";

import { javascript } from "@codemirror/lang-javascript";

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
  const peerIdRef = useRef<string>(`local-${Date.now()}`);
  const [boardEditingBy, setBoardEditingBy] = useState<string | null>(null);
  const [codeEditingBy, setCodeEditingBy] = useState<string | null>(null);
  const boardDebounceRef = useRef<any>(null);
  const codeDebounceRef = useRef<any>(null);

  useEffect(() => {
    const roomRef = doc(db, "rooms", roomId);
    const unsub = onSnapshot(roomRef, (snap) => {
      const data = snap.data() as any;
      if (!data) return;
      setBoard(data.board || "");
      setCode(data.code || "");
      setBoardEditingBy(data.board_editing_by || null);
      setCodeEditingBy(data.code_editing_by || null);
    });
    return () => unsub();
  }, [roomId]);

  const saveBoard = async () => {
    if (boardDebounceRef.current) {
      clearTimeout(boardDebounceRef.current);
      boardDebounceRef.current = null;
    }
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        board,
        board_updated_at: new Date(),
        board_editing_by: null,
      });
    } catch (e) {}
    setEditingBoard(false);
  };

  const saveCode = async () => {
    if (codeDebounceRef.current) {
      clearTimeout(codeDebounceRef.current);
      codeDebounceRef.current = null;
    }
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        code,
        code_updated_at: new Date(),
        code_editing_by: null,
      });
    } catch (e) {}
    setEditingCode(false);
  };

  // Cursor docs: update our cursor position on selection change (minimal)
  const updateCursor = async (pos: {
    index?: number;
    line?: number;
    ch?: number;
  }) => {
    try {
      await setDoc(doc(db, "rooms", roomId, "cursors", peerIdRef.current), {
        pos,
        updated_at: new Date(),
      });
    } catch (e) {
      // ignore
    }
  };

  const startBoardEdit = async () => {
    setEditingBoard(true);
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        board_editing_by: peerIdRef.current,
      });
    } catch (e) {}
  };

  const startCodeEdit = async () => {
    setEditingCode(true);
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        code_editing_by: peerIdRef.current,
      });
    } catch (e) {}
  };

  const scheduleBoardSave = (value: string) => {
    setBoard(value);
    if (boardDebounceRef.current) clearTimeout(boardDebounceRef.current);
    boardDebounceRef.current = setTimeout(async () => {
      try {
        await updateDoc(doc(db, "rooms", roomId), {
          board: value,
          board_updated_at: new Date(),
        });
      } catch (e) {}
      boardDebounceRef.current = null;
    }, 500);
  };

  const scheduleCodeSave = (value: string) => {
    setCode(value);
    if (codeDebounceRef.current) clearTimeout(codeDebounceRef.current);
    codeDebounceRef.current = setTimeout(async () => {
      try {
        await updateDoc(doc(db, "rooms", roomId), {
          code: value,
          code_updated_at: new Date(),
        });
      } catch (e) {}
      codeDebounceRef.current = null;
    }, 500);
  };

  useEffect(() => {
    return () => {
      // cleanup: if this client was editing, clear flags
      (async () => {
        try {
          const roomRef = doc(db, "rooms", roomId);
          const updates: any = {};
          if (boardEditingBy === peerIdRef.current)
            updates.board_editing_by = null;
          if (codeEditingBy === peerIdRef.current)
            updates.code_editing_by = null;
          if (Object.keys(updates).length) await updateDoc(roomRef, updates);
        } catch (e) {}
      })();
    };
  }, [roomId, boardEditingBy, codeEditingBy]);

  const [remoteCursors, setRemoteCursors] = useState<Record<string, any>>({});

  const [participantsMap, setParticipantsMap] = useState<
    Record<string, string>
  >({});

  // subscribe to participants to map peerId -> displayName
  useEffect(() => {
    const partsCol = collection(db, "rooms", roomId, "participants");
    const unsub = onSnapshot(partsCol, (snap) => {
      const map: Record<string, string> = {};
      snap.forEach((d) => {
        const data = d.data() as any;
        map[d.id] = data.displayName || data.uid || d.id.split("-")[0];
      });
      setParticipantsMap(map);
    });
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    const cursorsCol = collection(db, "rooms", roomId, "cursors");
    const unsub = onSnapshot(cursorsCol, (snap) => {
      const curs: Record<string, any> = {};
      snap.forEach((d) => {
        curs[d.id] = d.data();
      });
      setRemoteCursors(curs);
    });
    return () => unsub();
  }, [roomId]);

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
          {tab === "board" ? (
            <button
              onClick={() => {
                if (editingBoard) {
                  // stop editing
                  setEditingBoard(false);
                  updateDoc(doc(db, "rooms", roomId), {
                    board_editing_by: null,
                  }).catch(() => {});
                } else {
                  startBoardEdit();
                }
              }}
              className="text-xs text-blue-300 hover:text-blue-200"
            >
              {editingBoard ? "Cancel" : "Edit"}
            </button>
          ) : null}
          {tab === "code" ? (
            <button
              onClick={() => {
                if (editingCode) {
                  setEditingCode(false);
                  updateDoc(doc(db, "rooms", roomId), {
                    code_editing_by: null,
                  }).catch(() => {});
                } else {
                  startCodeEdit();
                }
              }}
              className="text-xs text-blue-300 hover:text-blue-200"
            >
              {editingCode ? "Cancel" : "Edit"}
            </button>
          ) : null}
        </div>
      </div>

      {/* Current editor indicator */}
      <div className="mb-2 text-xs text-slate-400">
        {tab === "board" && boardEditingBy ? (
          <span>
            Editing:{" "}
            {boardEditingBy === peerIdRef.current ? "You" : boardEditingBy}
          </span>
        ) : null}
        {tab === "code" && codeEditingBy ? (
          <span>
            Editing:{" "}
            {codeEditingBy === peerIdRef.current ? "You" : codeEditingBy}
          </span>
        ) : null}
      </div>

      {tab === "board" ? (
        <div>
          {editingBoard ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={board}
                onChange={(e) => scheduleBoardSave(e.target.value)}
                className="w-full h-40 p-2 rounded bg-slate-800 border border-white/10 text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={saveBoard}
                  className="px-4 py-2 bg-blue-600 rounded text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingBoard(false);
                    updateDoc(doc(db, "rooms", roomId), {
                      board_editing_by: null,
                    }).catch(() => {});
                  }}
                  className="px-4 py-2 bg-slate-700 rounded text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-slate-200 text-sm whitespace-pre-wrap max-h-40 overflow-auto">
              {board || (
                <span className="text-slate-500">No board content</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          {editingCode ? (
            <div className="flex flex-col gap-2">
              <div className="w-full">
                <CodeMirror
                  value={code}
                  height="240px"
                  extensions={[javascript()]}
                  onChange={(value: string, viewUpdate: any) => {
                    scheduleCodeSave(value);
                    try {
                      const head = viewUpdate.state.selection.main.head;
                      updateCursor({ index: head });
                    } catch (e) {}
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={saveCode}
                  className="px-4 py-2 bg-blue-600 rounded text-white"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingCode(false);
                    updateDoc(doc(db, "rooms", roomId), {
                      code_editing_by: null,
                    }).catch(() => {});
                  }}
                  className="px-4 py-2 bg-slate-700 rounded text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <pre className="text-green-200 text-sm font-mono max-h-40 overflow-auto whitespace-pre-wrap">
                {code || "// No code shared"}
              </pre>
              <div className="mt-2 text-xs text-slate-300">Remote cursors:</div>
              <ul className="text-xs text-slate-300 max-h-24 overflow-auto">
                {Object.keys(remoteCursors)
                  .filter((k) => k !== peerIdRef.current)
                  .map((k) => (
                    <li key={k} className="py-1">
                      <span className="font-medium text-white">
                        {participantsMap[k] || k}
                      </span>
                      <span className="ml-2 text-slate-400">
                        {JSON.stringify(remoteCursors[k].pos)}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
