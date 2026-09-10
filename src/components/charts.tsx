"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

const GRID = "#e7e2d8";

/**
 * Paleta com peso de decisão de negócio, não estética neutra: verde vivo é
 * receita/sucesso, vermelho vivo é risco/atraso, âmbar é atenção/pendência.
 * Usada tanto pra semântica fixa (status de pagamento) quanto pra dar
 * contraste de leitura rápida em séries sem semântica de risco (modalidade).
 */
export const CHART_COLORS = {
  sucesso: "#16a34a",
  risco: "#dc2626",
  atencao: "#f59e0b",
  info: "#2563eb",
  destaque: "#7c3aed",
  neutro: "#0ea5e9",
};

export function FunnelBarChart({
  data,
}: {
  data: { etapa: string; valor: number; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 24, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="etapa" tick={{ fontSize: 11.5 }} width={120} />
        <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${GRID}`, fontSize: 12 }} />
        <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({
  data,
}: {
  data: { categoria: string; valor: number; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="categoria" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
        <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${GRID}`, fontSize: 12 }} />
        <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({
  data,
}: {
  data: { semana: string; leads: number; candidatos: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="semana" tick={{ fontSize: 10.5 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
        <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${GRID}`, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11.5 }} />
        <Line
          type="monotone"
          dataKey="leads"
          name="Leads"
          stroke={CHART_COLORS.atencao}
          strokeWidth={3}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="candidatos"
          name="Candidatos"
          stroke={CHART_COLORS.info}
          strokeWidth={3}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
