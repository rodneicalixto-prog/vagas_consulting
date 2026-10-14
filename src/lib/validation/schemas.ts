import { z } from "zod";
import { normalizarRemuneracao } from "@/lib/money";

// Empresas
export const CreateCompanySchema = z.object({
  razao_social: z.string().min(2, "Razão social deve ter ao menos 2 caracteres"),
  nome_fantasia: z.string().nullable().optional(),
  cnpj: z.string().refine((val) => !val || val.replace(/\D/g, "").length === 14, "CNPJ deve ter 14 dígitos"),
  endereco: z.string().nullable().optional(),
});

export const DecideCompanySchema = z.object({
  company_id: z.string().uuid("ID da empresa inválido"),
  acao: z.enum(["aprovar", "rejeitar", "corrigir"], { error: "Ação deve ser aprovar, rejeitar ou corrigir" }),
  motivo: z.string().nullable().optional(),
});

// Vagas
export const CreateJobSchema = z.object({
  company_id: z.string().uuid("ID da empresa inválido"),
  titulo: z.string().min(2, "Título deve ter ao menos 2 caracteres"),
  modalidade: z.enum(["efetiva", "pj", "temporaria"], { error: "Modalidade deve ser efetiva, pj ou temporaria" }),
  local: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
  requisitos: z.string().nullable().optional(),
  // Sempre em reais; gravado como "R$ 2.354,00".
  remuneracao_texto: z
    .string()
    .nullable()
    .optional()
    .superRefine((v, ctx) => {
      try {
        normalizarRemuneracao(v);
      } catch (e) {
        ctx.addIssue({ code: "custom", message: (e as Error).message });
      }
    })
    .transform((v) => {
      try {
        return normalizarRemuneracao(v);
      } catch {
        return null;
      }
    }),
});

export const DecideJobSchema = z.object({
  job_id: z.string().uuid("ID da vaga inválido"),
  acao: z.enum(["publicar", "encerrar", "corrigir", "pausar", "reativar"], {
    error: "Ação deve ser publicar, encerrar, corrigir, pausar ou reativar",
  }),
  motivo: z.string().nullable().optional(),
});

// Dados pessoais candidato
export const UpdateProfileSchema = z.object({
  nome_completo: z.string().min(2, "Nome deve ter ao menos 2 caracteres").nullable(),
  email: z.string().email("Email inválido").nullable(),
  telefone: z.string().nullable(),
  localizacao: z.string().nullable(),
  linkedin_url: z.string().url("URL do LinkedIn inválida").nullable(),
});

// Preferências de vaga
export const UpdateJobPreferencesSchema = z.object({
  modalidades_interesse: z.array(z.string()).nullable(),
  niveis_experiencia: z.array(z.string()).nullable(),
  salario_minimo: z.number().nullable(),
  localizacoes_preferidas: z.array(z.string()).nullable(),
  setores_interesse: z.array(z.string()).nullable(),
});

// Candidatura
export const ApplyJobSchema = z.object({
  job_id: z.string().uuid("ID da vaga inválido"),
  respostas: z.record(z.string(), z.boolean(), { error: "Respostas devem ser boolean" }),
});

// Consentimento
export const SetConsentSchema = z.object({
  finalidade: z.string().min(1, "Finalidade é obrigatória"),
  canal: z.string().nullable().optional(),
  concedido: z.boolean(),
});

// Admin: Acesso
export const InviteAdminSchema = z.object({
  email: z.string().email("Email inválido"),
  perfil: z.enum(["admin", "operador", "admin_empresa"], {
    error: "Perfil deve ser admin, operador ou admin da empresa",
  }),
  nome: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  // Obrigatório quando perfil = admin_empresa (conferido na action).
  company_id: z.string().uuid("Empresa inválida").optional().or(z.literal("")),
}).refine((v) => v.perfil !== "admin_empresa" || (v.company_id && v.company_id.length > 0), {
  error: "Selecione a empresa do admin da empresa",
  path: ["company_id"],
});

// Convites (vaga temporária)
export const RespondInviteSchema = z.object({
  invite_id: z.string().uuid("ID do convite inválido"),
  acao: z.enum(["aceitar", "recusar"], { error: "Ação deve ser aceitar ou recusar" }),
  motivo: z.string().max(200).nullable().optional(),
});

export const CreateInviteSchema = z.object({
  candidate_id: z.string().uuid("Candidato inválido"),
  job_id: z.string().uuid("Vaga inválida"),
  validade_horas: z.coerce.number().int().min(1, "Mínimo 1 hora").max(168, "Máximo 7 dias").default(24),
});

export const DecideInviteSchema = z.object({
  invite_id: z.string().uuid("ID do convite inválido"),
  acao: z.enum(["confirmar", "cancelar"], { error: "Ação deve ser confirmar ou cancelar" }),
});

// Auditoria: dados de entrada base
export const AuditLogQuerySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
  acao: z.string().optional(),
  objeto_tipo: z.string().optional(),
  ator_id: z.string().uuid().optional(),
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
});

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
export type DecideCompanyInput = z.infer<typeof DecideCompanySchema>;
export type CreateJobInput = z.infer<typeof CreateJobSchema>;
export type DecideJobInput = z.infer<typeof DecideJobSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateJobPreferencesInput = z.infer<typeof UpdateJobPreferencesSchema>;
export type ApplyJobInput = z.infer<typeof ApplyJobSchema>;
export type SetConsentInput = z.infer<typeof SetConsentSchema>;
export type InviteAdminInput = z.infer<typeof InviteAdminSchema>;
export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;
export type RespondInviteInput = z.infer<typeof RespondInviteSchema>;
export type CreateInviteInput = z.infer<typeof CreateInviteSchema>;
export type DecideInviteInput = z.infer<typeof DecideInviteSchema>;
