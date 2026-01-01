import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { ConfirmModal } from "./ConfirmModal";

interface AdminPanelProps {
  roomId: string;
  onClose: () => void;
}

export function AdminPanel({ roomId, onClose }: AdminPanelProps) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [confirmKick, setConfirmKick] = useState<string | null>(null);
  const [confirmEndRoom, setConfirmEndRoom] = useState(false);
  const [hostId, setHostId] = useState<string | null>(null);
  const [confirmMakeHost, setConfirmMakeHost] = useState<string | null>(null);

  useEffect(() => {
    const participantsRef = collection(db, "rooms", roomId, "participants");
    const unsub = onSnapshot(participantsRef, (snap) => {
      const arr: any[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setParticipants(arr);
    });
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    const roomRef = doc(db, "rooms", roomId);
    const unsub = onSnapshot(roomRef, (snap) => {
      const data = snap.data() as any;
      if (!data) return;
      setHostId(data.hostId || null);
    });
    return () => unsub();
  }, [roomId]);

  const makeHost = async (uid: string) => {
    try {
      await updateDoc(doc(db, "rooms", roomId), { hostId: uid });
    } catch (e) {
      console.error("Failed to transfer host:", e);
      alert("Failed to transfer host. Try again.");
    }
  };

  const remove = async (peerId: string) => {
    await deleteDoc(doc(db, "rooms", roomId, "participants", peerId)).catch(
      () => {}
    );
    setConfirmKick(null);
  };

  const endRoom = async () => {
    try {
      await updateDoc(doc(db, "rooms", roomId), { is_active: false });
    } catch (e) {}
    setConfirmEndRoom(false);
    onClose();
  };

  return (
    <div className="fixed left-6 bottom-24 z-50 w-80 bg-slate-900/95 border border-white/10 rounded-xl p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Admin Panel</h3>
        <button onClick={onClose} className="text-slate-300 text-sm">
          Close
        </button>
      </div>
      <div className="flex flex-col gap-2 mb-3">
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
              {hostId === p.uid ? (
                <span className="px-3 py-1 bg-green-600 rounded text-white text-sm">
                  Host
                </span>
              ) : (
                <button
                  onClick={() => setConfirmMakeHost(p.uid)}
                  className="px-3 py-1 bg-amber-600 rounded text-white text-sm mr-2"
                >
                  Make Host
                </button>
              )}

              <button
                onClick={() => setConfirmKick(p.id)}
                className="px-3 py-1 bg-red-600 rounded text-white text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setConfirmEndRoom(true)}
          className="px-4 py-2 bg-red-700 rounded text-white text-sm"
        >
          End Room
        </button>
      </div>

      {confirmKick ? (
        <ConfirmModal
          title="Remove Participant"
          message="Are you sure you want to remove this participant from the room?"
          confirmText="Remove"
          cancelText="Cancel"
          onConfirm={() => remove(confirmKick)}
          onCancel={() => setConfirmKick(null)}
        />
      ) : null}

      {confirmMakeHost ? (
        <ConfirmModal
          title="Transfer Host"
          message={`Make this participant the new host? They will gain admin controls.`}
          confirmText="Make Host"
          cancelText="Cancel"
          onConfirm={() => {
            makeHost(confirmMakeHost);
            setConfirmMakeHost(null);
          }}
          onCancel={() => setConfirmMakeHost(null)}
        />
      ) : null}

      {confirmEndRoom ? (
        <ConfirmModal
          title="End Room"
          message="End the room for everyone? This will disconnect all participants."
          confirmText="End Room"
          cancelText="Cancel"
          onConfirm={endRoom}
          onCancel={() => setConfirmEndRoom(false)}
        />
      ) : null}
    </div>
  );
}
