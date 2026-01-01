import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { Mail, Lock, AlertCircle, Check } from "lucide-react";

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
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
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

  const passwordsMatch = password && confirm && password === confirm;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse" />

      <div className="glass-card p-10 max-w-md w-full text-white shadow-2xl">
        <h2 className="text-4xl font-bold mb-2">Get Started</h2>
        <p className="text-gray-400 mb-8">
          Create your account to start video calling
        </p>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/50 text-red-200 text-sm mb-4 p-3 rounded-lg">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-3.5 text-gray-500"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 pl-10 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-500 transition-all duration-200"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-3.5 text-gray-500"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pl-10 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-500 transition-all duration-200"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-3.5 text-gray-500"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-4 py-3 pl-10 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-500 transition-all duration-200"
                placeholder="Confirm your password"
              />
              {passwordsMatch && (
                <Check
                  size={18}
                  className="absolute right-3 top-3.5 text-green-400"
                />
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-400 text-center">
          Already have an account?{" "}
          <button
            onClick={onSignIn}
            className="text-green-400 hover:text-green-300 font-semibold transition-colors"
          >
            Sign in
          </button>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="w-full mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-semibold transition-all duration-200"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default SignUp;
