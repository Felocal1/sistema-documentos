"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { validatePassword } from "@/lib/validation";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = (session?.user as any)?.id;

  // Delete
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form cadastro
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [serverSuccess, setServerSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!isAdmin) { router.push("/dashboard"); return; }
    fetch("/api/users")
      .then(r => r.json())
      .then(d => setUsers(d.users || []))
      .finally(() => setLoading(false));
  }, [isAdmin, router]);

  const fetchUsers = () => {
    fetch("/api/users")
      .then(r => r.json())
      .then(d => setUsers(d.users || []));
  };

  const handleChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(""); setServerSuccess("");
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 3) errs.name = "Nome deve ter ao menos 3 caracteres";
    if (!form.email.includes("@")) errs.email = "E-mail inválido";
    const passCheck = validatePassword(form.password);
    if (!passCheck.valid) errs.password = passCheck.message;
    if (form.password !== form.confirm) errs.confirm = "As senhas não coincidem";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setFormLoading(true);
    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Erro ao cadastrar");
      } else {
        setServerSuccess(`Usuário "${data.user.name}" cadastrado com sucesso!`);
        setForm({ name: "", email: "", password: "", confirm: "" });
        fetchUsers();
        setTimeout(() => { setShowForm(false); setServerSuccess(""); }, 2000);
      }
    } catch {
      setServerError("Erro de conexão. Tente novamente.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers(u => u.filter(x => x.id !== deleteUser.id));
      }
    } catch {} finally {
      setDeleteLoading(false);
      setDeleteUser(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Usuários</div>
          <div className="topbar-sub">Gerenciar acessos ao sistema</div>
        </div>
        <button
          id="btn-novo-usuario"
          className="btn btn-primary"
          onClick={() => { setShowForm(true); setServerError(""); setServerSuccess(""); setForm({ name: "", email: "", password: "", confirm: "" }); setErrors({}); }}
        >
          + Novo Usuário
        </button>
      </header>

      <div className="page-container">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 72, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>Nenhum usuário cadastrado</h3>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {users.map(u => (
              <div key={u.id} className="card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "var(--radius)",
                    background: u.role === "ADMIN"
                      ? "linear-gradient(135deg, #f59e0b, #d97706)"
                      : "linear-gradient(135deg, var(--brand-500), var(--brand-700))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, flexShrink: 0, color: "#fff", fontWeight: 700
                  }}>
                    {u.role === "ADMIN" ? "👑" : "👤"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "var(--gray-100)" }}>{u.name}</div>
                    <div style={{ fontSize: ".8rem", color: "var(--gray-400)" }}>{u.email}</div>
                  </div>
                  <span style={{
                    padding: "4px 12px", borderRadius: 999, fontSize: ".72rem", fontWeight: 600,
                    background: u.role === "ADMIN" ? "rgba(245,158,11,.12)" : "rgba(59,130,246,.12)",
                    color: u.role === "ADMIN" ? "#f59e0b" : "#3b82f6",
                  }}>
                    {u.role}
                  </span>
                  {u.id !== currentUserId && (
                    <button
                      id={`btn-delete-user-${u.id}`}
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteUser(u)}
                      style={{ padding: "4px 10px", fontSize: ".75rem" }}
                    >
                      🗑 Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal cadastro de usuário */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>👤 Novo Usuário</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="modal-body">
              {serverError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {serverError}</div>}
              {serverSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>✅ {serverSuccess}</div>}

              <form onSubmit={handleSubmit} id="form-novo-usuario" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="admin-user-name">Nome completo *</label>
                  <input
                    id="admin-user-name"
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
                  <label className="form-label" htmlFor="admin-user-email">E-mail corporativo *</label>
                  <input
                    id="admin-user-email"
                    type="email"
                    className={`form-input ${errors.email ? "error" : ""}`}
                    placeholder="seu@empresa.com.br"
                    value={form.email}
                    onChange={e => handleChange("email", e.target.value)}
                  />
                  {errors.email && <span className="form-error">⚠ {errors.email}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="admin-user-password">Senha *</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="admin-user-password"
                      type={showPass ? "text" : "password"}
                      className={`form-input ${errors.password ? "error" : ""}`}
                      placeholder="Mínimo 8 caracteres"
                      value={form.password}
                      onChange={e => handleChange("password", e.target.value)}
                      style={{ paddingRight: "44px" }}
                    />
                    <button
                      type="button"
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
                  <label className="form-label" htmlFor="admin-user-confirm">Confirmar senha *</label>
                  <input
                    id="admin-user-confirm"
                    type="password"
                    className={`form-input ${errors.confirm ? "error" : ""}`}
                    placeholder="Repita a senha"
                    value={form.confirm}
                    onChange={e => handleChange("confirm", e.target.value)}
                  />
                  {errors.confirm && <span className="form-error">⚠ {errors.confirm}</span>}
                </div>

                <button
                  id="btn-salvar-usuario"
                  type="submit"
                  className={`btn btn-primary btn-lg ${formLoading ? "btn-loading" : ""}`}
                  disabled={formLoading}
                  style={{ marginTop: 8 }}
                >
                  {!formLoading && "✅ Cadastrar usuário"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação exclusão */}
      {deleteUser && (
        <div className="modal-overlay" onClick={() => setDeleteUser(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Excluir usuário</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteUser(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: "var(--gray-300)" }}>
                Tem certeza que deseja excluir o usuário <strong>{deleteUser.name}</strong> ({deleteUser.email})?
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteUser(null)}>Cancelar</button>
              <button
                id="btn-confirm-delete-user"
                className={`btn btn-danger btn-sm ${deleteLoading ? "btn-loading" : ""}`}
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {!deleteLoading && "Excluir usuário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
