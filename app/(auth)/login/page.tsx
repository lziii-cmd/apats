"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* ─── Shared style tokens ─── */
const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  fontSize: "13px",
  padding: "9px 11px 9px 34px",
  border: "0.5px solid var(--color-border-tertiary)",
  borderRadius: "var(--border-radius-md)",
  background: "var(--color-background-secondary)",
  color: "var(--color-text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

const BTN_PRIMARY: React.CSSProperties = {
  width: "100%",
  fontSize: "13px",
  padding: "10px 16px",
  background: "#14171c",
  color: "white",
  border: "1px solid #14171c",
  borderRadius: "var(--border-radius-md)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  fontWeight: 500,
  cursor: "pointer",
};

/* ─── Left panel (dark branding) ─── */
function LeftPanel() {
  return (
    <div
      style={{
        background: "#14171c",
        padding: "36px 32px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        minHeight: "520px",
      }}
    >
      {/* Grid pattern */}
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, opacity: 0.06, pointerEvents: "none" }}
        aria-hidden="true"
      >
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Logo */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            background: "#1D9E75",
            borderRadius: "9px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <i className="ti ti-diamond" style={{ color: "white", fontSize: "19px" }} />
        </div>
        <div style={{ lineHeight: "1.15" }}>
          <div style={{ color: "white", fontWeight: 500, fontSize: "15px", letterSpacing: "0.4px" }}>
            APATS
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px" }}>
            Amicale des PATs ENSMG
          </div>
        </div>
      </div>

      {/* Tagline */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "inline-block",
            padding: "4px 11px",
            borderRadius: "999px",
            background: "rgba(29,158,117,0.18)",
            color: "#5DCAA5",
            fontSize: "11px",
            fontWeight: 500,
            marginBottom: "16px",
          }}
        >
          <i
            className="ti ti-sparkles"
            style={{ fontSize: "11px", verticalAlign: "-1px", marginRight: "4px" }}
          />
          Espace numérique de l&apos;amicale
        </div>
        <div
          style={{
            color: "white",
            fontSize: "22px",
            fontWeight: 500,
            lineHeight: 1.3,
            marginBottom: "10px",
          }}
        >
          L&apos;espace numérique de l&apos;amicale du personnel administratif et technique.
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: "13px",
            lineHeight: 1.55,
          }}
        >
          Cotisations, réunions, annonces et trésorerie — centralisés dans une plateforme conçue
          pour les membres de l&apos;ENSMG.
        </div>

        {/* Member avatars */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginTop: "22px",
            padding: "11px 14px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "var(--border-radius-md)",
            border: "0.5px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex" }}>
            {[
              { initials: "EH", bg: "#EEEDFE", color: "#3C3489" },
              { initials: "AL", bg: "#FAECE7", color: "#712B13" },
              { initials: "FN", bg: "#EAF3DE", color: "#27500A" },
            ].map((a, i) => (
              <div
                key={a.initials}
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  background: a.bg,
                  color: a.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                  fontWeight: 500,
                  border: "1.5px solid #14171c",
                  marginLeft: i > 0 ? "-7px" : 0,
                }}
              >
                {a.initials}
              </div>
            ))}
          </div>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px" }}>
            <span style={{ color: "white", fontWeight: 500 }}>21 membres</span> déjà inscrits
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        <span>© 2026 APATS · ENSMG · UCAD</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <i className="ti ti-shield-check" style={{ fontSize: "12px" }} />
          <span>Connexion sécurisée</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Login form ─── */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Erreur de connexion.");
      return;
    }

    router.push(data.redirect ?? from);
  }

  if (showReset) {
    return <ResetRequestForm onBack={() => setShowReset(false)} />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-background-secondary)",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          width: "100%",
          maxWidth: "780px",
          background: "var(--color-background-primary)",
          borderRadius: "var(--border-radius-lg)",
          overflow: "hidden",
          boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
          border: "0.5px solid var(--color-border-tertiary)",
        }}
      >
        <LeftPanel />

        {/* Right panel — form */}
        <div
          style={{
            padding: "36px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ marginBottom: "26px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 500, margin: "0 0 4px" }}>Bon retour</h1>
            <p style={{ fontSize: "12.5px", color: "var(--color-text-secondary)", margin: 0 }}>
              Connectez-vous avec votre adresse ENSMG.
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Email */}
            <div>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  display: "block",
                  marginBottom: "5px",
                  letterSpacing: "0.3px",
                  textTransform: "uppercase",
                }}
              >
                Email ENSMG
              </label>
              <div style={{ position: "relative" }}>
                <i
                  className="ti ti-mail"
                  style={{
                    position: "absolute",
                    left: "11px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-tertiary)",
                    fontSize: "14px",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="prenom.nom@ensmg.com"
                  style={INPUT_STYLE}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "5px",
                }}
              >
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                    letterSpacing: "0.3px",
                    textTransform: "uppercase",
                  }}
                >
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  style={{
                    fontSize: "10.5px",
                    color: "#0F6E56",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <i
                  className="ti ti-lock"
                  style={{
                    position: "absolute",
                    left: "11px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-tertiary)",
                    fontSize: "14px",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ ...INPUT_STYLE, paddingRight: "34px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: "absolute",
                    right: "11px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-text-tertiary)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  <i className={`ti ${showPwd ? "ti-eye-off" : "ti-eye"}`} style={{ fontSize: "14px" }} />
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#791F1F",
                  background: "#FCEBEB",
                  border: "0.5px solid #f5c6c6",
                  borderRadius: "var(--border-radius-md)",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <i className="ti ti-alert-circle" style={{ fontSize: "14px", flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={BTN_PRIMARY}>
              {loading ? (
                <>
                  <i className="ti ti-loader-2" style={{ fontSize: "14px" }} />
                  Connexion…
                </>
              ) : (
                <>
                  <i className="ti ti-login-2" style={{ fontSize: "14px" }} />
                  Se connecter
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── Reset form ─── */
function ResetRequestForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/reset-password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-background-secondary)",
          padding: "24px",
        }}
      >
        <div
          style={{
            background: "var(--color-background-primary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "40px",
            maxWidth: "440px",
            width: "100%",
            textAlign: "center",
            border: "0.5px solid var(--color-border-tertiary)",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              background: "#E1F5EE",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <i className="ti ti-mail-check" style={{ fontSize: "20px", color: "#0F6E56" }} />
          </div>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "13px", marginBottom: "16px" }}>
            Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.
          </p>
          <button
            onClick={onBack}
            style={{
              fontSize: "12px",
              color: "#0F6E56",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            ← Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-background-secondary)",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "var(--color-background-primary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "36px",
          maxWidth: "440px",
          width: "100%",
          border: "0.5px solid var(--color-border-tertiary)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            fontSize: "12px",
            color: "var(--color-text-secondary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: "20px",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: "14px" }} />
          Retour
        </button>
        <h2 style={{ fontSize: "20px", fontWeight: 500, margin: "0 0 6px" }}>
          Réinitialiser le mot de passe
        </h2>
        <p style={{ fontSize: "12.5px", color: "var(--color-text-secondary)", margin: "0 0 22px" }}>
          Entrez votre adresse email pour recevoir un lien de réinitialisation.
        </p>
        <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                display: "block",
                marginBottom: "5px",
                letterSpacing: "0.3px",
                textTransform: "uppercase",
              }}
            >
              Email ENSMG
            </label>
            <div style={{ position: "relative" }}>
              <i
                className="ti ti-mail"
                style={{
                  position: "absolute",
                  left: "11px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-text-tertiary)",
                  fontSize: "14px",
                  pointerEvents: "none",
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="prenom.nom@ensmg.com"
                style={INPUT_STYLE}
              />
            </div>
          </div>
          <button type="submit" disabled={loading} style={BTN_PRIMARY}>
            {loading ? "Envoi…" : "Envoyer le lien"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
