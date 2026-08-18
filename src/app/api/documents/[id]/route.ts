import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { deleteFile, readFileAsBuffer } from "@/lib/storage";
import { authorizeClientAccess } from "@/lib/api-auth";

// GET /api/documents/[id] — Download/visualização de documento
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    select: { path: true, originalName: true, mimeType: true, clientId: true },
  });

  if (!document) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  const access = await authorizeClientAccess(req, document.clientId);
  if (!access) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const buffer = await readFileAsBuffer(document.path);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.originalName)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado no servidor" }, { status: 404 });
  }
}

// DELETE /api/documents/[id] — Apenas ADMIN pode deletar
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas administradores podem excluir documentos" }, { status: 403 });
  }

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    select: { path: true },
  });

  if (!document) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  await deleteFile(document.path);
  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
