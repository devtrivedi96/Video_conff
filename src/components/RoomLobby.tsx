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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <AuthBar />
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500 rounded-full mb-6">
              <Video size={40} className="text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              VideoCall Pro
            </h1>
            <p className="text-xl text-gray-300">
              Connect, collaborate, and share screens in real-time
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode("create")}
              className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl p-8 transition-all hover:scale-105 hover:shadow-2xl"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <Video size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Create Room</h2>
                <p className="text-gray-300 text-center">
                  Start a new video call and invite others
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("join")}
              className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl p-8 transition-all hover:scale-105 hover:shadow-2xl"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center group-hover:bg-green-600 transition-colors">
                  <Users size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Join Room</h2>
                <p className="text-gray-300 text-center">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Create New Room
          </h2>
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={!!user}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter room name"
                required
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setMode("select")}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          Join Room
        </h2>
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={!!user}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room ID
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter room ID"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setMode("select")}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              Join Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
