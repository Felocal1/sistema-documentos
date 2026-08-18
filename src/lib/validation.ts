// Valida CNPJ via algoritmo oficial
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/[^\d]/g, "");
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  const calcDigit = (cnpj: string, len: number) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(cnpj.charAt(len - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result;
  };

  const d1 = calcDigit(cleaned, 12);
  if (d1 !== parseInt(cleaned.charAt(12))) return false;
  const d2 = calcDigit(cleaned, 13);
  return d2 === parseInt(cleaned.charAt(13));
}

// Formata CNPJ: 00.000.000/0000-00
export function formatCNPJ(value: string): string {
  const cleaned = value.replace(/[^\d]/g, "").slice(0, 14);
  return cleaned
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

// Sanitiza string removendo caracteres perigosos
export function sanitizeString(value: string): string {
  return value.trim().replace(/[<>]/g, "");
}

// Valida força de senha
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) return { valid: false, message: "Senha deve ter no mínimo 8 caracteres" };
  if (!/[A-Z]/.test(password)) return { valid: false, message: "Senha deve ter ao menos uma letra maiúscula" };
  if (!/[0-9]/.test(password)) return { valid: false, message: "Senha deve ter ao menos um número" };
  if (!/[^A-Za-z0-9]/.test(password)) return { valid: false, message: "Senha deve ter ao menos um caractere especial" };
  return { valid: true, message: "" };
}

// Valida extensão e tipo MIME de arquivo permitido
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
];

export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif"];

export function validateFile(filename: string, mimeType: string, sizeBytes: number): { valid: boolean; message: string } {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, message: `Tipo de arquivo não permitido. Use: ${ALLOWED_EXTENSIONS.join(", ")}` };
  }
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, message: "Tipo MIME inválido" };
  }
  const maxBytes = (parseInt(process.env.MAX_FILE_SIZE_MB || "20")) * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    return { valid: false, message: `Arquivo muito grande. Máximo: ${process.env.MAX_FILE_SIZE_MB || 20}MB` };
  }
  return { valid: true, message: "" };
}
