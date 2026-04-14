import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { InputField } from "../components/common/InputField";
import { authAPI } from "../services/api";
import { useAuthStore } from "../store/authStore";

function getPasswordStrength(password: string) {
  if (password.length < 8) {
    return { label: "Basic", colour: "text-navy-500" };
  }
  if (password.length < 12 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return { label: "Improving", colour: "text-primary-700" };
  }
  return { label: "Strong", colour: "text-primary-900" };
}

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.isLoading);
  const registrationError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [displayName, setDisplayName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleGoogleSignUp = () => {
    window.location.href = authAPI.getGoogleLoginUrl();
  };

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!emailAddress.trim() || !password.trim()) {
      setFormError("Please complete all required fields.");
      return;
    }

    try {
      await register(emailAddress, password, displayName);
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
          <h1 className="mt-2 font-display text-[clamp(2rem,5vw,2.4rem)] font-semibold text-navy-950">Create account</h1>
          <p className="mt-2 max-w-[28ch] text-sm text-navy-700">Build a refined routine log designed for consistency and clarity.</p>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <InputField
            label="Display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
          />
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
            autoComplete="new-password"
            helperText="Use at least twelve characters with letters and numbers."
            required
          />

          {password ? (
            <p className={`text-sm ${passwordStrength.colour}`}>
              Password strength: {passwordStrength.label}
            </p>
          ) : null}

          {formError ? <p className="text-sm text-red-300" role="alert" aria-live="assertive">{formError}</p> : null}
          {!formError && registrationError ? (
            <p className="text-sm text-red-300" role="alert" aria-live="assertive">{registrationError}</p>
          ) : null}

          <Button type="submit" fullWidth isLoading={loading}>
            Create account
          </Button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-navy-300/70" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-500">or</span>
            <span className="h-px flex-1 bg-navy-300/70" />
          </div>

          <Button type="button" variant="outline" fullWidth onClick={handleGoogleSignUp}>
            Continue with Google
          </Button>
        </form>

        <p className="mt-5 text-sm text-navy-700">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary-700 hover:text-primary-800">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
