import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { AuthBar } from "./AuthBar";
import SignIn from "./SignIn";
import SignUp from "./SignUp";
import { Video, Users } from "lucide-react";

interface RoomLobbyProps {
  onCreateRoom: (roomName: string, userName: string) => void;
  onJoinRoom: (roomId: string, userName: string) => void;
}

export function RoomLobby({ onCreateRoom, onJoinRoom }: RoomLobbyProps) {
  const [mode, setMode] = useState<
    "select" | "create" | "join" | "signin" | "signup"
  >("select");
  const [roomName, setRoomName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const { user, loading, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (user) {
      setUserName(user.displayName ?? user.email ?? "");
    }
  }, [user]);

  // Respect auth loading: only change mode after auth finished.
  useEffect(() => {
    if (!loading && !user) setMode("signin");
  }, [user, loading]);

  // If user becomes authenticated and lobby is still on signin/signup, reset to select.
  useEffect(() => {
    if (!loading && user && (mode === "signin" || mode === "signup")) {
      setMode("select");
    }
  }, [user, loading, mode]);

  // While auth is initializing, show a neutral loading state to avoid a flash.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="text-center">
          <div className="mb-3">Loading...</div>
        </div>
      </div>
    );
  }

  // If not signed in (after loading), require authentication first — do not allow create/join.
  if (!user && !loading) {
    if (mode === "signin") {
      return (
        <SignIn
          onBack={() => setMode("select")}
          onSuccess={() => setMode("select")}
          onSignUp={() => setMode("signup")}
        />
      );
    }

    if (mode === "signup") {
      return (
        <SignUp
          onBack={() => setMode("select")}
          onSuccess={() => setMode("select")}
          onSignIn={() => setMode("signin")}
        />
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Sign in required
          </h2>
          <p className="text-gray-300 mb-6">
            You must sign in to create or join rooms.
          </p>
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={() => signInWithGoogle()}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
            >
              Sign in with Google
            </button>
            <button
              onClick={() => setMode("signin")}
              className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium"
            >
              Sign in with email
            </button>
            <button
              onClick={() => setMode("signup")}
              className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
            >
              Create an account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim() && userName.trim()) {
      onCreateRoom(roomName.trim(), userName.trim());
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim() && userName.trim()) {
      onJoinRoom(roomId.trim(), userName.trim());
    }
  };

  if (mode === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse" />

        <div className="max-w-4xl w-full">
          <div className="text-center mb-16">
            <AuthBar />
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl mb-8 shadow-2xl mb-8">
              <Video size={48} className="text-white" />
            </div>
            <h1 className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">
              VideoCall Pro
            </h1>
            <p className="text-xl text-gray-300 font-light">
              Crystal-clear video calls, screen sharing & collaboration—all in
              one platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <button
              onClick={() => setMode("create")}
              className="group relative bg-gradient-to-br from-blue-500/20 to-blue-600/20 hover:from-blue-500/40 hover:to-blue-600/40 backdrop-blur-xl border border-blue-400/30 hover:border-blue-400/60 rounded-3xl p-10 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/10 group-hover:to-blue-600/10 rounded-3xl transition-all duration-300" />
              <div className="relative flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center group-hover:shadow-2xl group-hover:shadow-blue-500/50 transition-all duration-300">
                  <Video size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white">Create Room</h2>
                <p className="text-gray-300 text-center text-lg">
                  Start a new call and invite others to join
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("join")}
              className="group relative bg-gradient-to-br from-green-500/20 to-green-600/20 hover:from-green-500/40 hover:to-green-600/40 backdrop-blur-xl border border-green-400/30 hover:border-green-400/60 rounded-3xl p-10 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-green-600/0 group-hover:from-green-500/10 group-hover:to-green-600/10 rounded-3xl transition-all duration-300" />
              <div className="relative flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center group-hover:shadow-2xl group-hover:shadow-green-500/50 transition-all duration-300">
                  <Users size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white">Join Room</h2>
                <p className="text-gray-300 text-center text-lg">
                  Enter a room ID to join an existing call
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent -z-10" />

        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 hover:border-blue-400/30 rounded-3xl p-10 max-w-md w-full shadow-2xl transition-all duration-300">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">
            Create New Room
          </h2>
          <form onSubmit={handleCreateRoom} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={!!user}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter room name"
                required
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setMode("select")}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all duration-200 border border-white/10 hover:border-white/20"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-blue-500/50"
              >
                Create Room
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent -z-10" />

      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 hover:border-green-400/30 rounded-3xl p-10 max-w-md w-full shadow-2xl transition-all duration-300">
        <h2 className="text-4xl font-bold text-white mb-8 text-center">
          Join Room
        </h2>
        <form onSubmit={handleJoinRoom} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={!!user}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Room ID
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 font-mono"
              placeholder="Paste room ID here"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setMode("select")}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all duration-200 border border-white/10 hover:border-white/20"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-green-500/50"
            >
              Join Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
