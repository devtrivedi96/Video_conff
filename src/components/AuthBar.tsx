import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import ProfileSettings from "./ProfileSettings";

export function AuthBar() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  if (loading) return null;

  // If not signed in, don't show a login button in the top-right (handled by lobby)
  if (!user) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/10 bg-white/5 flex items-center justify-center"
          aria-label="Open profile"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-white">
              {(user.displayName ?? user.email ?? "U")[0]}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white/5 backdrop-blur rounded-lg border border-white/10 text-white shadow-lg py-2">
            <div className="px-3 py-2 text-sm">
              {user.displayName ?? user.email}
            </div>
            <div className="border-t border-white/5" />
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-white/10"
            >
              Sign out
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setShowProfile(true);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-white/10"
            >
              Profile / Settings
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
