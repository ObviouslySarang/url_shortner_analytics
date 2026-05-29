import { SignInButton, SignUpButton } from "@clerk/clerk-react";

export default function AuthPanel({
  isLogin,
  form,
  error,
  loading,
  enableClerk,
  onFieldChange,
  onSubmit,
  onToggleMode,
}) {
  return (
    <section className="panel">
      <h2>{isLogin ? "Login" : "Register"}</h2>
      <p className="panel-copy">
        Use the same account to manage all your short links.
      </p>

      <form className="form" onSubmit={onSubmit}>
        <label>
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => onFieldChange("email", event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => onFieldChange("password", event.target.value)}
            placeholder="••••••••"
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
        </button>
      </form>

      <button type="button" className="text-button" onClick={onToggleMode}>
        {isLogin
          ? "Don't have an account? Register"
          : "Already have an account? Login"}
      </button>

      {enableClerk ? (
        <div className="oauth-box">
          <div className="oauth-divider">
            <span>or</span>
          </div>

          <div className="oauth-actions">
            <SignInButton mode="modal">
              <button type="button" className="secondary-button oauth-button">
                Continue with Clerk OAuth
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button type="button" className="secondary-button oauth-button">
                Create a Clerk account
              </button>
            </SignUpButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}
