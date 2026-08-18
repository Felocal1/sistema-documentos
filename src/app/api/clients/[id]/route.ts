import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeClientAccess } from "@/lib/api-auth";

// GET /api/clients/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const access = await authorizeClientAccess(req, id);
  if (!access) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const client = await prisma.client.findUnique({
    where: { id },
    select: { id: true, cnpj: true, name: true, email: true, phone: true, createdAt: true },
  });

  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  return NextResponse.json({ client });
}
