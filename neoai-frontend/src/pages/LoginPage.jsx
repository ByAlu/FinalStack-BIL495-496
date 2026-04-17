import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logSimpleAction, ActionTypes, completeAction } from "../services/actionLogger";

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const [credentials, setCredentials] = useState({
    username: "doctor",
    password: "doctor123"
  });
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setCredentials((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    const actionLog = logSimpleAction(
      `Login: ${credentials.username}`,
      ActionTypes.LOGIN,
      "User authentication attempt",
      { username: credentials.username }
    );

    try {
      await login(credentials);
      completeAction(actionLog.id, "SUCCEEDED");
    } catch {
      completeAction(actionLog.id, "FAILED");
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-content">
        <div className="login-brand-row">
          <h1>NeoAi</h1>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Username
            <input name="username" value={credentials.username} onChange={handleChange} required />
          </label>
          <label>
            Password
            <input name="password" type="password" value={credentials.password} onChange={handleChange} required />
          </label>
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="credential-hint">
          <strong>Demo accounts</strong>
          <span>Doctor: doctor / doctor123</span>
          <span>Admin: admin / admin123</span>
        </div>
      </section>
    </div>
  );
}
