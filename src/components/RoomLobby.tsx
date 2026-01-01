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
      <div className="min-h-screen flex items-center justify-center text-white">
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
      <div className="min-h-screen flex items-center justify-center p-4">
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
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse" />

        <div className="max-w-4xl w-full">
          <div className="text-center mb-16">
            <AuthBar />
            <div
              className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-8 shadow-2xl mb-8"
              style={{
                background:
                  "linear-gradient(90deg, var(--primary-start), var(--primary-end))",
              }}
            >
              <Video size={48} className="text-white" />
            </div>
            <h1 className="text-6xl font-bold mb-4 text-accent">
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
              className="group relative glass-card border rounded-3xl p-10 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className="relative flex flex-col items-center gap-4">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--primary-start), var(--primary-end))",
                  }}
                >
                  <Video size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold">Create Room</h2>
                <p className="text-gray-300 text-center text-lg">
                  Start a new call and invite others to join
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("join")}
              className="group relative glass-card border rounded-3xl p-10 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className="relative flex flex-col items-center gap-4">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--primary-start), var(--primary-end))",
                  }}
                >
                  <Users size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold">Join Room</h2>
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
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent -z-10" />

        <div className="glass-card p-10 max-w-md w-full shadow-2xl transition-all duration-300">
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
              <button type="submit" className="flex-1 px-6 py-3 btn-primary">
                Create Room
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent -z-10" />

      <div className="glass-card p-10 max-w-md w-full shadow-2xl transition-all duration-300">
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
            <button type="submit" className="flex-1 px-6 py-3 btn-primary">
              Join Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
