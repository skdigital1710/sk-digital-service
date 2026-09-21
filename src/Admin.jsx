import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

function Admin() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkSession() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setLoading(false);
  }

  async function handleLogin(event) {
    event.preventDefault();

    setError("");
    setLoginLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSession(data.session);
    }

    setLoginLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="admin-page">
        <div className="admin-login-card">
          <div className="admin-logo">SK</div>

          <span className="admin-kicker">SK DIGITAL SERVICE</span>

          <h1>Admin Login</h1>

          <p className="admin-subtitle">
            Sign in to manage your Resource Hub.
          </p>

          <form onSubmit={handleLogin} className="admin-form">
            <label>
              Email
              <input
                type="email"
                placeholder="Admin email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error && <div className="admin-error">{error}</div>}

            <button type="submit" disabled={loginLoading}>
              {loginLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <a href="/" className="back-home">
            ← Back to Resource Hub
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-dashboard-card">
        <div>
          <span className="admin-kicker">SK DIGITAL SERVICE</span>
          <h1>Admin Dashboard</h1>
          <p>Welcome back. Your admin authentication is working.</p>
        </div>

        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
}

export default Admin;
