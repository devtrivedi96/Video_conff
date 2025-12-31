import { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface AdminPanelProps {
  roomId: string;
  onClose: () => void;
}

export function AdminPanel({ roomId, onClose }: AdminPanelProps) {
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    const participantsRef = collection(db, "rooms", roomId, "participants");
    const unsub = onSnapshot(participantsRef, (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setParticipants(arr);
    });
    return () => unsub();
  }, [roomId]);

  const remove = async (peerId: string) => {
    await deleteDoc(doc(db, "rooms", roomId, "participants", peerId)).catch(
      () => {}
    );
  };

  return (
    <div className="fixed left-6 bottom-24 z-50 w-80 bg-slate-900/95 border border-white/10 rounded-xl p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Admin Panel</h3>
        <button onClick={onClose} className="text-slate-300 text-sm">
          Close
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {participants.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between bg-slate-800/60 p-2 rounded"
          >
            <div className="text-sm text-white">
              <div className="font-medium">{p.displayName || p.uid}</div>
              <div className="text-xs text-slate-400">{p.uid}</div>
            </div>
            <div>
              <button
                onClick={() => remove(p.id)}
                className="px-3 py-1 bg-red-600 rounded text-white text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
