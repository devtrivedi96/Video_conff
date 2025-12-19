import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { db } from "../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export function ProfileSettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user, updateDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [meetingName, setMeetingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? "");
    // load saved prefs from Firestore
    (async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          setMeetingName(data.meetingName ?? "");
        }
      } catch (err) {
        console.warn("Failed to load user prefs", err);
      }
    })();
  }, [user]);

  if (!open) return null;
  if (!user) return null;

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (displayName !== (user.displayName ?? "")) {
        await updateDisplayName(displayName);
      }
      // store meeting preference
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, { meetingName }, { merge: true });
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form
        onSubmit={handleSave}
        className="relative bg-white/5 backdrop-blur rounded-lg p-6 w-full max-w-lg text-white z-10"
      >
        <h3 className="text-lg font-semibold mb-4">Profile & Settings</h3>
        {error && <div className="text-sm text-red-400 mb-2">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Display name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
            />
            <p className="text-xs text-gray-400 mt-1">
              This name will be used as your name in meetings.
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Meeting name (optional)
            </label>
            <input
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
            />
            <p className="text-xs text-gray-400 mt-1">
              If set, this will be used as the default name when
              creating/joining rooms.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-500 rounded text-white"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfileSettings;
