import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { validateFile } from "@/lib/validation";
import { authorizeClientAccess } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";

// GET /api/documents?clientId=xxx&dateFrom=2024-01-01&dateTo=2024-12-31
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (!clientId) return NextResponse.json({ error: "clientId é obrigatório" }, { status: 400 });

  const access = await authorizeClientAccess(req, clientId);
  if (!access) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const where: Prisma.DocumentWhereInput = { clientId };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const documents = await prisma.document.findMany({
    where,
    select: {
      id: true,
      originalName: true,
      filename: true,
      mimeType: true,
      size: true,
      description: true,
      createdAt: true,
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents });
}

// POST /api/documents — Upload de documento
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const clientId = formData.get("clientId") as string | null;
    const description = formData.get("description") as string | null;

    if (!file || !clientId) {
      return NextResponse.json({ error: "Arquivo e clientId são obrigatórios" }, { status: 400 });
    }

    const fileValidation = validateFile(file.name, file.type, file.size);
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.message }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { filename, path } = await saveFile(buffer, file.name, clientId);

    const document = await prisma.document.create({
      data: {
        originalName: file.name,
        filename,
        mimeType: file.type,
        size: file.size,
        path,
        description: description?.trim() || null,
        clientId,
        uploadedById: session.user.id,
      },
      select: {
        id: true,
        originalName: true,
        filename: true,
        mimeType: true,
        size: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Erro ao salvar documento" }, { status: 500 });
  }
}
