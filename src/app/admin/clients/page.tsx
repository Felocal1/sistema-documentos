"use client";
import { useState } from "react";
import { validateCNPJ, formatCNPJ } from "@/lib/validation";
import { useRouter } from "next/navigation";

export default function AdminClientsPage() {
  const router = useRouter();
  const [form, setForm] = useState({ cnpj: "", name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");

  const handleChange = (field: string, value: string) => {
    const v = field === "cnpj" ? formatCNPJ(value) : value;
    setForm(f => ({ ...f, [field]: v }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const cleaned = form.cnpj.replace(/[^\d]/g, "");
    if (!validateCNPJ(cleaned)) e.cnpj = "CNPJ inválido";
    if (!form.name.trim() || form.name.trim().length < 3) e.name = "Nome deve ter ao menos 3 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(""); setSuccess("");
    if (!validate()) return;
    setLoading(true);

    const res = await fetch("/api/cnpj", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj: form.cnpj, name: form.name, email: form.email, phone: form.phone }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setServerError(data.error || "Erro ao cadastrar cliente");
    } else {
      setSuccess(`Cliente "${data.client.name}" cadastrado com sucesso!`);
      setForm({ cnpj: "", name: "", email: "", phone: "" });
      setTimeout(() => router.push(`/clients/${data.client.id}`), 1500);
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Cadastrar Cliente</div>
          <div className="topbar-sub">Adicionar novo CNPJ ao sistema</div>
        </div>
      </header>

      <div className="page-container" style={{ maxWidth: 600 }}>
        <div className="card" style={{ animation: "slideUp .4s ease" }}>
          <div className="card-header">
            <h2 style={{ margin: 0 }}>🏢 Novo cliente</h2>
          </div>

          {serverError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {serverError}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>✅ {success}</div>}

          <form onSubmit={handleSubmit} id="form-novo-cliente" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-client-cnpj">CNPJ *</label>
              <input
                id="new-client-cnpj"
                type="text"
                className={`form-input ${errors.cnpj ? "error" : ""}`}
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={e => handleChange("cnpj", e.target.value)}
                maxLength={18}
                autoFocus
              />
              {errors.cnpj && <span className="form-error">⚠ {errors.cnpj}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-client-name">Razão Social *</label>
              <input
                id="new-client-name"
                type="text"
                className={`form-input ${errors.name ? "error" : ""}`}
                placeholder="Nome da empresa"
                value={form.name}
                onChange={e => handleChange("name", e.target.value)}
              />
              {errors.name && <span className="form-error">⚠ {errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-client-email">E-mail</label>
              <input
                id="new-client-email"
                type="email"
                className="form-input"
                placeholder="contato@empresa.com.br"
                value={form.email}
                onChange={e => handleChange("email", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-client-phone">Telefone</label>
              <input
                id="new-client-phone"
                type="tel"
                className="form-input"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={e => handleChange("phone", e.target.value)}
              />
            </div>

            <button
              id="btn-salvar-cliente"
              type="submit"
              className={`btn btn-primary btn-lg ${loading ? "btn-loading" : ""}`}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {!loading && "✅ Cadastrar cliente"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
