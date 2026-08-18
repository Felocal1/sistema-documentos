"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validatePassword } from "@/lib/validation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 3) e.name = "Nome deve ter ao menos 3 caracteres";
    if (!form.email.includes("@")) e.email = "E-mail inválido";
    const passCheck = validatePassword(form.password);
    if (!passCheck.valid) e.password = passCheck.message;
    if (form.password !== form.confirm) e.confirm = "As senhas não coincidem";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setLoading(true);

    const res = await fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setServerError(data.error || "Erro ao cadastrar. Tente novamente.");
    } else {
      router.push("/login?registered=1");
    }
  };

  // Indicador de força de senha
  const getPasswordStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const strength = getPasswordStrength();
  const strengthLabels = ["", "Fraca", "Regular", "Boa", "Forte"];
  const strengthColors = ["", "var(--danger)", "var(--warning)", "var(--info)", "var(--success)"];

  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">📋</div>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--gray-50)" }}>DocManager</div>
            <div style={{ fontSize: ".75rem", color: "var(--gray-500)" }}>Gestão de Documentos</div>
          </div>
        </div>

        <h1 className="auth-title">Criar conta</h1>
        <p className="auth-subtitle">Use seu e-mail corporativo para se cadastrar</p>

        <form className="auth-form" onSubmit={handleSubmit} id="register-form">
          {serverError && (
            <div className="alert alert-error" role="alert">
              <span>⚠️</span>
              <span>{serverError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Nome completo</label>
            <input
              id="reg-name"
              type="text"
              className={`form-input ${errors.name ? "error" : ""}`}
              placeholder="João Silva"
              value={form.name}
              onChange={e => handleChange("name", e.target.value)}
              autoFocus
            />
            {errors.name && <span className="form-error">⚠ {errors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">E-mail corporativo</label>
            <input
              id="reg-email"
              type="email"
              className={`form-input ${errors.email ? "error" : ""}`}
              placeholder="seu@empresa.com.br"
              value={form.email}
              onChange={e => handleChange("email", e.target.value)}
            />
            {errors.email && <span className="form-error">⚠ {errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Senha</label>
            <div style={{ position: "relative" }}>
              <input
                id="reg-password"
                type={showPass ? "text" : "password"}
                className={`form-input ${errors.password ? "error" : ""}`}
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={e => handleChange("password", e.target.value)}
                style={{ paddingRight: "44px" }}
              />
              <button
                type="button"
                id="toggle-reg-password"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--gray-400)", fontSize: "1.1rem"
                }}
              >{showPass ? "🙈" : "👁️"}</button>
            </div>
            {form.password && (
              <div style={{ marginTop: 6 }}>
                <div className="progress-bar" style={{ marginBottom: 4 }}>
                  <div className="progress-bar-fill" style={{ width: `${strength * 25}%`, background: strengthColors[strength] }} />
                </div>
                <span style={{ fontSize: ".72rem", color: strengthColors[strength] }}>
                  Força: {strengthLabels[strength]}
                </span>
              </div>
            )}
            {errors.password && <span className="form-error">⚠ {errors.password}</span>}
            <span className="form-hint">8+ caracteres, maiúscula, número e símbolo</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirmar senha</label>
            <input
              id="reg-confirm"
              type="password"
              className={`form-input ${errors.confirm ? "error" : ""}`}
              placeholder="Repita a senha"
              value={form.confirm}
              onChange={e => handleChange("confirm", e.target.value)}
            />
            {errors.confirm && <span className="form-error">⚠ {errors.confirm}</span>}
          </div>

          <button
            id="btn-register"
            type="submit"
            className={`btn btn-primary btn-full btn-lg ${loading ? "btn-loading" : ""}`}
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {!loading && "Criar minha conta"}
          </button>
        </form>

        <div className="auth-divider" style={{ marginTop: 24 }}>
          Já tem conta?{" "}
          <Link href="/login" className="auth-link" id="link-login">
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
