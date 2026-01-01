import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import ProfileSettings from "./ProfileSettings";
import { LogOut, User } from "lucide-react";

export function AuthBar() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  if (loading) return null;

  // If not signed in, don't show a login button in the top-right (handled by lobby)
  if (!user) return null;

  return (
    <div className="fixed top-6 right-6 z-50">
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            background:
              "linear-gradient(90deg, var(--primary-start), var(--primary-end))",
          }}
          className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-blue-500/50 hover:ring-blue-400 flex items-center justify-center transition-all duration-200 shadow-lg font-semibold text-white"
          aria-label="Open profile"
          title={user.displayName || user.email || "Profile"}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold">
              {(user.displayName ?? user.email ?? "U")[0].toUpperCase()}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-3 w-56 glass-card text-white shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-4 border-b border-white/10">
              <p className="text-sm font-semibold text-gray-200">
                {user.displayName || "Guest"}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                setShowProfile(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/10 transition-colors text-left"
            >
              <User size={16} />
              Profile / Settings
            </button>
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-red-500/20 text-red-300 transition-colors text-left border-t border-white/10"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        )}
      </div>
      {showProfile && (
        <ProfileSettings
          open={showProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}

export default AuthBar;
