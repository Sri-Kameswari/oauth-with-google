import { useState, useEffect } from "react";

const API = "http://localhost:8080";

// ── Google Icon ──────────────────────────────────────────────────────────────
function GoogleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" />
    </svg>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────
const FLOW_STEPS = [
  {
    num: 1,
    title: "Redirect to Google",
    desc: "Your app builds an authorization URL with client_id, redirect_uri, scope, and a random state value, then redirects the browser to Google's login page.",
    tokens: ["client_id", "redirect_uri", "state", "scope"],
  },
  {
    num: 2,
    title: "User Authenticates",
    desc: "The user types their password directly into Google's own login screen. Your app never sees the password. Google then shows a consent screen listing the requested scopes.",
    tokens: ["credentials", "consent"],
  },
  {
    num: 3,
    title: "Google Sends Code Back",
    desc: "If the user approves, Google redirects the browser back to your redirect URI with two query parameters: a short-lived authorization code and the state value.",
    tokens: ["code", "state"],
  },
  {
    num: 4,
    title: "State Validated",
    desc: "Your app reads the state from the callback URL and compares it to the value stored in the session before the redirect. A mismatch means a possible CSRF attack and the login is aborted immediately.",
    tokens: ["state", "session"],
  },
  {
    num: 5,
    title: "Token Exchange",
    desc: "Your server makes a direct POST to Google's token endpoint, sending the authorization code, client_id, client_secret, and redirect_uri. This is entirely server-to-server — the browser is not involved.",
    tokens: ["code", "client_secret", "grant_type"],
  },
  {
    num: 6,
    title: "Tokens Received",
    desc: "Google verifies the request and responds with an access_token and an id_token. The id_token is a signed JWT containing the user's identity claims inside.",
    tokens: ["access_token", "id_token"],
  },
  {
    num: 7,
    title: "ID Token Validated",
    desc: "Your app fetches Google's JWKS, finds the key matching the kid in the JWT header, and verifies the RS256 signature. It then checks iss, aud, exp, and iat claims.",
    tokens: ["kid", "RS256", "iss", "aud", "exp"],
  },
  {
    num: 8,
    title: "Session Created",
    desc: "The old anonymous session is invalidated to prevent session fixation. A new session is created storing the user's sub, email, name, and picture. The user is now logged in.",
    tokens: ["sub", "email", "JSESSIONID"],
  },
];

const PHASES = [
  {
    badge: "Phase 0",
    title: "Google Cloud Setup",
    concepts: [
      {
        q: "Why register our app in Google Cloud Console?",
        a: "Google needs to know your app exists before it will hand out tokens for it. Registering gives you a client ID (your app's identity) and a client secret (your app's password). Google uses these to verify that token requests really come from your app.",
      },
      {
        q: "Why must the redirect URI match exactly?",
        a: "After the user logs in, Google sends the authorization code to the redirect URI. If any URI were allowed, an attacker could register their own and steal the code. Locking it to the exact registered string ensures the code only ever goes to your real app.",
      },
    ],
    doubts: [
      {
        q: "Why add test users during development?",
        a: "When the consent screen is in Testing mode, Google only allows accounts you explicitly list to log in. This stops your unfinished app from being accessible to random accounts before it is ready. Once you publish the app, this restriction is lifted.",
      },
    ],
  },
  {
    badge: "Phase 1",
    title: "Authorization Request",
    concepts: [
      {
        q: "Why redirect the user to Google instead of handling login ourselves?",
        a: "Your app never sees the Google password. The user types it directly into Google's page. This is the whole point of OAuth — the password stays with the identity provider, your app only receives a token proving the login happened.",
      },
      {
        q: "What is the state parameter and why do we generate it?",
        a: "State is a random string you generate, store in the session, and attach to the Google redirect URL. When Google sends the user back, it echoes the state. If they match, the callback is genuine. If not, you reject it — this is CSRF protection.",
      },
      {
        q: "Why use SecureRandom instead of Math.random()?",
        a: "Math.random() is predictable — an attacker with enough samples can guess future values. SecureRandom draws from the OS entropy source, producing values that are genuinely unpredictable. Always use SecureRandom for security tokens.",
      },
    ],
    doubts: [
      {
        q: "Why use response_type=code and not get the token directly?",
        a: "Requesting a code means the token exchange happens server-to-server, hidden from the browser. If the token came through the browser URL it would be exposed in browser history, logs, and referrer headers. The code alone is useless without the client_secret.",
      },
    ],
  },
  {
    badge: "Phase 2",
    title: "Callback & State Check",
    concepts: [
      {
        q: "What happens at the callback endpoint?",
        a: "Google redirects the browser back with the authorization code and the state value in the URL. Your app validates state first, then hands the code to the token exchange. The code is single-use and expires in about 60 seconds.",
      },
      {
        q: "Why remove state from the session after validating?",
        a: "State is single-use. Once validated, removing it means a second request with the same state will fail. This prevents browser retries or crafted replays from accidentally succeeding.",
      },
    ],
    doubts: [
      {
        q: "Why did savedState come back as null sometimes?",
        a: "The callback was hit twice — browser prefetching or a slow connection triggered a retry. The first hit consumed and removed state from the session. The second found nothing. This is correct defensive behaviour — the second request is legitimately rejected.",
      },
    ],
  },
  {
    badge: "Phase 3",
    title: "Token Exchange",
    concepts: [
      {
        q: "What is the token exchange?",
        a: "Your server POSTs the authorization code and client_secret directly to Google's token endpoint. Google verifies both and responds with an access token and an ID token. This is entirely server-to-server — the browser plays no part.",
      },
      {
        q: "Why use application/x-www-form-urlencoded and not JSON?",
        a: "Google's token endpoint follows the OAuth 2.0 spec, which requires form-encoded bodies, not JSON. This is a protocol requirement — sending JSON results in a 400 error.",
      },
    ],
    doubts: [
      {
        q: "Why does Google reject the request if redirect_uri doesn't match?",
        a: "The redirect_uri in the token request must byte-for-byte match what you registered in Cloud Console. Google uses it as a second identity check — it proves the token request comes from the same app that started the login.",
      },
      {
        q: "What is MultiValueMap and why not a regular Map?",
        a: "HTTP form bodies can have multiple values per key. MultiValueMap is Map<String, List<String>>. Spring's RestClient knows how to serialize it into correct form encoding automatically.",
      },
    ],
  },
  {
    badge: "Phase 4",
    title: "ID Token Validation",
    concepts: [
      {
        q: "Why validate the ID token if it came from Google?",
        a: "Arrival does not mean authenticity. A man-in-the-middle attack or misconfigured endpoint could produce something that looks valid. Validation cryptographically proves Google signed this exact token and issued it for your specific app.",
      },
      {
        q: "What is JWKS and why fetch it?",
        a: "JWKS is Google's publicly available set of current RSA public keys. Google signs the ID token with its private key. You verify the signature using the matching public key from JWKS. If it checks out, only Google could have created this token.",
      },
      {
        q: "What is kid and why does it matter?",
        a: "Google rotates its signing keys periodically and keeps multiple active at once. The kid in the JWT header tells you which key was used. Without it you would have to try every key. With it you look up the exact one directly.",
      },
      {
        q: "What claims do we validate and why?",
        a: "iss confirms the token came from Google. aud confirms it was issued for your app. exp confirms it has not expired. iat confirms it was not issued suspiciously far in the future. Each is a distinct layer of security.",
      },
    ],
    doubts: [
      {
        q: "Why is parsing the JWT separate from verifying it?",
        a: "Parsing just base64-decodes the three chunks into readable data with no security checks. You need to read the header first to find kid, then verify the signature. They are intentionally two separate steps.",
      },
      {
        q: "Why allow 5 minutes of clock skew for iat but not exp?",
        a: "Your server's clock might be slightly behind Google's, so a token issued 30 seconds from now is still legitimate. But exp is a hard deadline — accepting an expired token would completely defeat the purpose of expiry.",
      },
    ],
  },
  {
    badge: "Phase 5",
    title: "Session Management",
    concepts: [
      {
        q: "Why create an app session instead of using the ID token directly?",
        a: "The ID token is Google's one-time proof of identity. Your application session is your own record of who is logged in. Keeping them separate means you control session lifetime and can log users out independently of their Google session.",
      },
      {
        q: "Why key users on sub and not email?",
        a: "sub is Google's permanent, immutable ID for an account — it never changes. Email can change or be recycled by a different person. Keying on sub means one record per real Google account, forever, regardless of email changes.",
      },
      {
        q: "Why invalidate the session and create a new one after login?",
        a: "Before login the user had an anonymous session holding the state parameter. After login you discard it and create a brand new one — this is session fixation protection. An attacker who knew the old session ID cannot hijack the now-authenticated session.",
      },
    ],
    doubts: [],
  },
  {
    badge: "Phase 6",
    title: "Logout",
    concepts: [
      {
        q: "What does session.invalidate() actually do?",
        a: "It destroys the server-side session record and tells the browser to clear the JSESSIONID cookie. After this, any call to /me returns 401 because there is no session left to look up.",
      },
    ],
    doubts: [
      {
        q: "Does logging out of our app also log the user out of Google?",
        a: "No. session.invalidate() only clears your app's session. The user's Google account stays signed in. If they click Login with Google again, Google may skip the consent screen entirely and issue a new code immediately.",
      },
    ],
  },
];

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  // Page shells
  page: {
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#1a1a1a",
  },

  // Page 1
  loginPage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "2rem",
    textAlign: "center",
  },
  loginHeading: {
    fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "2rem",
    maxWidth: 520,
    lineHeight: 1.3,
  },
  googleBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    border: "1.5px solid #dadce0",
    borderRadius: 50,
    padding: "12px 24px",
    fontSize: 15,
    fontWeight: 600,
    color: "#1a1a1a",
    cursor: "pointer",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    transition: "box-shadow 0.2s, border-color 0.2s",
  },

  // Page 2 — top bar
  topBar: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    padding: "0 2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
  },
  tabs: {
    display: "flex",
    gap: 4,
    background: "#f1f5f9",
    borderRadius: 10,
    padding: 4,
  },
  tab: (active) => ({
    padding: "7px 18px",
    borderRadius: 7,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    background: active ? "#2563eb" : "transparent",
    color: active ? "#fff" : "#64748b",
    transition: "all 0.18s",
  }),
  logoutBtn: {
    padding: "7px 16px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontSize: 13,
    fontWeight: 500,
    color: "#64748b",
    cursor: "pointer",
    transition: "all 0.18s",
  },

  // Content area
  content: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "2.5rem 2rem 5rem",
  },

  // Flow grid
  flowGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 16,
  },
  flowCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: "1.1rem 1.2rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  stepNum: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#2563eb",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
    flexShrink: 0,
  },
  flowTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 6,
  },
  flowDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.7,
    marginBottom: 10,
  },
  token: {
    display: "inline-block",
    fontFamily: "monospace",
    fontSize: 11,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    borderRadius: 4,
    padding: "1px 6px",
    margin: "2px 2px 2px 0",
  },

  // Phases
  phasesWrap: {
    maxWidth: 740,
    margin: "0 auto",
  },
  phaseBadge: {
    display: "inline-block",
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#2563eb",
    background: "#dbeafe",
    padding: "3px 10px",
    borderRadius: 20,
    marginBottom: 6,
  },
  phaseTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "1rem",
  },
  conceptCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "0.9rem 1.1rem",
    marginBottom: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  conceptQ: {
    fontSize: 13,
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: 4,
  },
  conceptA: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.75,
    margin: 0,
  },
  doubtsLabel: {
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#b45309",
    marginBottom: 8,
    marginTop: "1.25rem",
  },
  doubtCard: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 12,
    padding: "0.9rem 1.1rem",
    marginBottom: 8,
  },
  doubtQ: {
    fontSize: 13,
    fontWeight: 600,
    color: "#78350f",
    marginBottom: 4,
  },
  doubtA: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.75,
    margin: 0,
  },
  divider: {
    border: "none",
    borderTop: "1px solid #f1f5f9",
    margin: "2rem 0",
  },

  // Page 3
  loggedOutPage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "2rem",
    textAlign: "center",
  },
  loggedOutMsg: {
    fontSize: "clamp(1.1rem, 3vw, 1.5rem)",
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: "2rem",
    maxWidth: 480,
    lineHeight: 1.5,
  },
};

// ── Page 1: Login ─────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={s.loginPage}>
      <h1 style={s.loginHeading}>
        Welcome! Let's learn how the OAuth protocol works.
      </h1>
      <button
        onClick={onLogin}
        style={{
          ...s.googleBtn,
          boxShadow: hovered
            ? "0 4px 16px rgba(59,130,246,0.2)"
            : s.googleBtn.boxShadow,
          borderColor: hovered ? "#a8c4f8" : "#dadce0",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <GoogleIcon size={20} />
        Continue with Google
      </button>
    </div>
  );
}

// ── OAuth Flow tab ────────────────────────────────────────────────────────────
function OAuthFlow() {
  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>
        OAuth Flow
      </h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: "1.75rem", lineHeight: 1.6 }}>
        Eight steps that happen every time a user logs in with Google.
      </p>
      <div style={s.flowGrid}>
        {FLOW_STEPS.map((step) => (
          <div key={step.num} style={s.flowCard}>
            <div style={s.stepNum}>{step.num}</div>
            <div style={s.flowTitle}>{step.title}</div>
            <div style={s.flowDesc}>{step.desc}</div>
            <div>
              {step.tokens.map((t) => (
                <span key={t} style={s.token}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Phases & Doubts tab ───────────────────────────────────────────────────────
function PhasesAndDoubts() {
  return (
    <div style={s.phasesWrap}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem" }}>
        Phases & Doubts
      </h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: "1.75rem", lineHeight: 1.6 }}>
        A phase-by-phase breakdown of everything built, with common questions answered.
      </p>
      {PHASES.map((phase, i) => (
        <div key={i}>
          <span style={s.phaseBadge}>{phase.badge}</span>
          <div style={s.phaseTitle}>{phase.title}</div>

          {phase.concepts.map((c, j) => (
            <div key={j} style={s.conceptCard}>
              <div style={s.conceptQ}>{c.q}</div>
              <p style={s.conceptA}>{c.a}</p>
            </div>
          ))}

          {phase.doubts.length > 0 && (
            <>
              <div style={s.doubtsLabel}>Common Doubts</div>
              {phase.doubts.map((d, k) => (
                <div key={k} style={s.doubtCard}>
                  <div style={s.doubtQ}>{d.q}</div>
                  <p style={s.doubtA}>{d.a}</p>
                </div>
              ))}
            </>
          )}

          {i < PHASES.length - 1 && <hr style={s.divider} />}
        </div>
      ))}
    </div>
  );
}

// ── Page 2: Dashboard ─────────────────────────────────────────────────────────
function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("flow");

  return (
    <div style={{ ...s.page, background: "#f8fafc" }}>
      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.tabs}>
          <button
            style={s.tab(activeTab === "flow")}
            onClick={() => setActiveTab("flow")}
          >
            OAuth Flow
          </button>
          <button
            style={s.tab(activeTab === "phases")}
            onClick={() => setActiveTab("phases")}
          >
            Phases & Doubts
          </button>
        </div>
        <button
          style={s.logoutBtn}
          onClick={onLogout}
          onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "#fca5a5"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
        >
          Logout
        </button>
      </div>

      {/* Tab content */}
      <div style={s.content}>
        {activeTab === "flow"   && <OAuthFlow />}
        {activeTab === "phases" && <PhasesAndDoubts />}
      </div>
    </div>
  );
}

// ── Page 3: Logged out ────────────────────────────────────────────────────────
function LoggedOutPage({ onLogin }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={s.loggedOutPage}>
      <p style={s.loggedOutMsg}>
        Hope you learned something new today. Have an amazing day!
      </p>
      <button
        onClick={onLogin}
        style={{
          ...s.googleBtn,
          boxShadow: hovered
            ? "0 4px 16px rgba(59,130,246,0.2)"
            : s.googleBtn.boxShadow,
          borderColor: hovered ? "#a8c4f8" : "#dadce0",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <GoogleIcon size={20} />
        Login again
      </button>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  // "login" | "dashboard" | "loggedout"
  const [page, setPage] = useState("login");
  const [loading, setLoading] = useState(true);

  // On mount: check if already logged in
  useEffect(() => {
    fetch(`${API}/me`, { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setPage("dashboard");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function handleLogin() {
    window.location.href = `${API}/oauth2/authorize/google`;
  }

  function handleLogout() {
    fetch(`${API}/logout`, { credentials: "include" })
      .then(() => setPage("loggedout"));
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>Loading...</span>
      </div>
    );
  }

  if (page === "dashboard") return <Dashboard onLogout={handleLogout} />;
  if (page === "loggedout") return <LoggedOutPage onLogin={handleLogin} />;
  return <LoginPage onLogin={handleLogin} />;
}
