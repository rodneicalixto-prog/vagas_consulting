import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cronAutorizado } from '@/lib/cron-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Validar Vercel's Cron secret. Sem segredo configurado a rota fica fechada
  // (antes, "Bearer undefined" passava quando a variável não existia).
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Chamar a função Supabase pra arquivar vagas expiradas
    const { data, error } = await supabase.rpc('arquivo_automatico_vagas');

    if (error) {
      console.error('[CRON] erro ao arquivar vagas:', error);
      return NextResponse.json(
        { error: 'Erro ao executar arquivo automático' },
        { status: 500 }
      );
    }

    const archived = data || [];
    console.log(`[CRON] ${archived.length} vagas arquivadas`, archived);

    // Rastro: só quando algo foi arquivado (ids das vagas, sem dados pessoais).
    if (archived.length > 0) {
      await supabase.from('audit_log').insert({
        ator_id: null,
        acao: 'vagas_arquivadas_automaticamente',
        objeto_tipo: 'job',
        objeto_id: null,
        depois: { ids: archived.map((v: { id: string }) => v.id) },
      });
    }

    return NextResponse.json({
      success: true,
      archived_count: archived.length,
      archived: archived,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[CRON] erro geral:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
