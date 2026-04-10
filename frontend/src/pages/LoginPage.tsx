import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { InputField } from "../components/common/InputField";
import { useAuthStore } from "../store/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.isLoading);

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

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
      setFormError("Your sign in details were not recognised.");
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <Card className="w-full" padding="lg" shadow="lg">
        <h1 className="font-display text-3xl font-semibold text-navy-900">Welcome back</h1>
        <p className="mt-2 text-sm text-navy-600">Sign in to continue logging your training.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}

          <Button type="submit" fullWidth isLoading={loading}>
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-sm text-navy-600">
          Need an account?{" "}
          <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
            Register
          </Link>
        </p>
      </Card>
    </div>
  );
}
