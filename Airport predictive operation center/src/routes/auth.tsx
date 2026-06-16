import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ClearPath OPS" },
      { name: "description", content: "Sign in to access the APOC decision register." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/register" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
      navigate({ to: "/register" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1628] text-white grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6">
          <ClipboardList className="h-4 w-4" /> ClearPath OPS
        </Link>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h1 className="text-lg font-semibold">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Access the shared APOC decision register.
          </p>
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <div>
              <label className="text-xs text-white/60">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="text-xs text-white/60">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-sky-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-sky-500 hover:bg-sky-400 text-sky-950 font-medium text-sm py-2 disabled:opacity-50"
            >
              {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 text-xs text-white/60 hover:text-white"
          >
            {mode === "signin"
              ? "No account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
