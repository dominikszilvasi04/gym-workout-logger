import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { InputField } from "../components/common/InputField";
import { authAPI } from "../services/api";
import { useAuthStore } from "../store/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.isLoading);
  const authenticationError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleGoogleSignIn = () => {
    window.location.href = authAPI.getGoogleLoginUrl();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!emailAddress.trim() || !password.trim()) {
      setFormError("Please fill in both fields.");
      return;
    }

    try {
      await signIn(emailAddress, password);
      navigate("/");
    } catch {
      setFormError("");
    }
  };

  return (
    <div className="app-min-h mx-auto flex w-full max-w-md items-start px-4 pb-8 pt-6 sm:items-center">
      <Card className="w-full border border-primary-400/35" padding="lg" shadow="lg">
        <div className="mb-6 border-b border-primary-300/25 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-700">Private training ledger</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,5vw,2.4rem)] font-semibold text-navy-950">Welcome back</h1>
          <p className="mt-2 max-w-[26ch] text-sm text-navy-700">Sign in to continue your weekly strength narrative.</p>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <InputField
            label="Email address"
            type="email"
            value={emailAddress}
            onChange={(event) => setEmailAddress(event.target.value)}
            autoComplete="email"
            required
          />
          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          {formError ? <p className="text-sm text-red-300" role="alert" aria-live="assertive">{formError}</p> : null}
          {!formError && authenticationError ? (
            <p className="text-sm text-red-300" role="alert" aria-live="assertive">{authenticationError}</p>
          ) : null}

          <Button type="submit" fullWidth isLoading={loading}>
            Sign in
          </Button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-navy-300/70" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-500">or</span>
            <span className="h-px flex-1 bg-navy-300/70" />
          </div>

          <Button type="button" variant="outline" fullWidth onClick={handleGoogleSignIn}>
            Continue with Google
          </Button>
        </form>

        <p className="mt-5 text-sm text-navy-700">
          Need an account?{" "}
          <Link to="/register" className="font-semibold text-primary-700 hover:text-primary-800">
            Register
          </Link>
        </p>
      </Card>
    </div>
  );
}
