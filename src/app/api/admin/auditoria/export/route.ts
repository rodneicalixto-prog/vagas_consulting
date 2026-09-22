import { NextRequest, NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/auth/internal";
import { getAuditLogs, auditLogsToCSV } from "@/lib/security/audit";
import { AuditLogQuerySchema, AuditLogQueryInput } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireInternalUser("auditoria.view");

    const searchParams = req.nextUrl.searchParams;
    const query = {
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 1000,
      acao: searchParams.get("acao") || undefined,
      objeto_tipo: searchParams.get("objeto_tipo") || undefined,
      ator_id: searchParams.get("ator_id") || undefined,
      data_inicio: searchParams.get("data_inicio") || undefined,
      data_fim: searchParams.get("data_fim") || undefined,
    };

    const validated = AuditLogQuerySchema.parse(query);
    const { logs } = await getAuditLogs(validated);

    const csv = auditLogsToCSV(logs);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="auditoria-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao exportar auditoria" },
      { status: 500 }
    );
  }
}
