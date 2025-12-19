import React, { useState } from "react";
import { useAuth } from "../lib/auth";

export function SignIn({
  onBack,
  onSuccess,
  onSignUp,
}: {
  onBack: () => void;
  onSuccess: () => void;
  onSignUp: () => void;
}) {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full text-white">
        <h2 className="text-2xl font-bold mb-4">Sign in</h2>
        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded bg-white/5 border border-white/10"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-4 py-2 bg-white/10 rounded"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 rounded text-white"
            >
              {loading ? "Signing..." : "Sign in"}
            </button>
          </div>
        </form>

        <div className="mt-4">
          <button
            onClick={handleGoogle}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Sign in with Google
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-300 text-center">
          Don't have an account?{" "}
          <button onClick={onSignUp} className="underline">
            Create one
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
