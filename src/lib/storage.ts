import { put, del } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";
import path from "path";

// Salva arquivo no Vercel Blob
export async function saveFile(
  buffer: Buffer,
  originalName: string,
  clientId: string
): Promise<{ filename: string; path: string }> {
  const ext = path.extname(originalName).toLowerCase();
  const filename = `${clientId}/${uuidv4()}${ext}`;

  const blob = await put(filename, buffer, {
    access: "private",
    contentType: getContentType(ext),
  });

  return {
    filename,
    path: blob.url,
  };
}

// Deleta arquivo do Vercel Blob
export async function deleteFile(filePath: string): Promise<void> {
  await del(filePath);
}

// Gera URL assinada para ler o arquivo (para downloads)
export async function getFileUrl(filePath: string): Promise<string> {
  // Se já é uma URL do Blob, retorna direto
  if (filePath.startsWith("http")) {
    return filePath;
  }
  // Fallback para arquivos locais (dev)
  return filePath;
}

// Retorna o conteúdo do arquivo como buffer (para servir diretamente)
export async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  const headers: Record<string, string> = {};
  if (filePath.includes("blob.vercel-storage.com") && process.env.BLOB_READ_WRITE_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
  }
  const response = await fetch(filePath, { headers });
  if (!response.ok) throw new Error("Erro ao buscar arquivo");
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
  };
  return types[ext] || "application/octet-stream";
}
