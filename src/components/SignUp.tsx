import React, { useState } from "react";
import { useAuth } from "../lib/auth";

export function SignUp({
  onBack,
  onSuccess,
  onSignIn,
}: {
  onBack: () => void;
  onSuccess: () => void;
  onSignIn: () => void;
}) {
  const { signUpWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full text-white">
        <h2 className="text-2xl font-bold mb-4">Create account</h2>
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
          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
              className="flex-1 px-4 py-2 bg-green-500 rounded text-white"
            >
              {loading ? "Creating..." : "Create account"}
            </button>
          </div>
        </form>
        <div className="mt-4 text-sm text-gray-300 text-center">
          Already have an account?{" "}
          <button onClick={onSignIn} className="underline">
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
