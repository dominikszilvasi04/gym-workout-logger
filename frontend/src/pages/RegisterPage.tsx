import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { InputField } from "../components/common/InputField";
import { useAuthStore } from "../store/authStore";

function getPasswordStrength(password: string) {
  if (password.length < 8) {
    return { label: "Weak", colour: "text-red-600" };
  }
  if (password.length < 12 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return { label: "Moderate", colour: "text-orange-600" };
  }
  return { label: "Strong", colour: "text-emerald-600" };
}

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.isLoading);
  const registrationError = useAuthStore((state) => state.error);

  const [displayName, setDisplayName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

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
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <Card className="w-full" padding="lg" shadow="lg">
        <h1 className="font-display text-3xl font-semibold text-navy-900">Create account</h1>
        <p className="mt-2 text-sm text-navy-600">Start tracking your progress in a cleaner mobile experience.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          {!formError && registrationError ? (
            <p className="text-sm text-red-600">{registrationError}</p>
          ) : null}

          <Button type="submit" fullWidth isLoading={loading}>
            Create account
          </Button>
        </form>

        <p className="mt-4 text-sm text-navy-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
