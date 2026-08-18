"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("E-mail ou senha incorretos. Verifique suas credenciais.");
    } else {
      router.push(callbackUrl);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">📋</div>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--gray-50)" }}>DocManager</div>
            <div style={{ fontSize: ".75rem", color: "var(--gray-500)" }}>Gestão de Documentos</div>
          </div>
        </div>

        <h1 className="auth-title">Bem-vindo de volta</h1>
        <p className="auth-subtitle">Acesse sua conta para continuar</p>

        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          {error && (
            <div className="alert alert-error" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="login-email">E-mail corporativo</label>
            <input
              id="login-email"
              type="email"
              className={`form-input ${error ? "error" : ""}`}
              placeholder="seu@empresa.com.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Senha</label>
            <div style={{ position: "relative" }}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className={`form-input ${error ? "error" : ""}`}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: "44px" }}
              />
              <button
                type="button"
                id="toggle-password"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--gray-400)", fontSize: "1.1rem"
                }}
                aria-label="Mostrar/ocultar senha"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            id="btn-login"
            type="submit"
            className={`btn btn-primary btn-full btn-lg ${loading ? "btn-loading" : ""}`}
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {!loading && "Entrar no sistema"}
          </button>
        </form>

        <div className="auth-divider" style={{ marginTop: 24 }}>
          Não tem uma conta?{" "}
          <Link href="/register" className="auth-link" id="link-register">
            Cadastre-se
          </Link>
        </div>
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
