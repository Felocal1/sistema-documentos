import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/documents/all — Uso total do store + documentos
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const usageOnly = searchParams.get("usage") === "1";

  // Modo leve: retorna só os totais do store
  if (usageOnly) {
    const agg = await prisma.document.aggregate({
      _sum: { size: true },
      _count: true,
    });
    const byType = await prisma.document.groupBy({
      by: ["mimeType"],
      _sum: { size: true },
      _count: true,
    });
    return NextResponse.json({
      totalSize: agg._sum.size || 0,
      totalCount: agg._count,
      byType: byType.map(t => ({
        mimeType: t.mimeType,
        size: t._sum.size || 0,
        count: t._count,
      })),
    });
  }

  // Listagem completa
  const where: any = {};
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
      mimeType: true,
      size: true,
      description: true,
      createdAt: true,
      client: { select: { id: true, name: true, cnpj: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ documents });
}
