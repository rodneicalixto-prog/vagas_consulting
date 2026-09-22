import { z } from "zod";

// Empresas
export const CreateCompanySchema = z.object({
  razao_social: z.string().min(2, "Razão social deve ter ao menos 2 caracteres"),
  nome_fantasia: z.string().nullable().optional(),
  cnpj: z.string().refine((val) => !val || val.replace(/\D/g, "").length === 14, "CNPJ deve ter 14 dígitos"),
  endereco: z.string().nullable().optional(),
});

export const DecideCompanySchema = z.object({
  company_id: z.string().uuid("ID da empresa inválido"),
  acao: z.enum(["aprovar", "rejeitar", "corrigir"], { errorMap: () => ({ message: "Ação deve ser aprovar, rejeitar ou corrigir" }) }),
  motivo: z.string().nullable().optional(),
});

// Vagas
export const CreateJobSchema = z.object({
  company_id: z.string().uuid("ID da empresa inválido"),
  titulo: z.string().min(3, "Título deve ter ao menos 3 caracteres"),
  descricao: z.string().min(10, "Descrição deve ter ao menos 10 caracteres"),
  modalidade: z.enum(["clt", "pj", "temporaria"], { errorMap: () => ({ message: "Modalidade inválida" }) }),
  localizacao: z.string().optional(),
  requisitos: z.array(z.string()).optional(),
  regras: z.record(z.any()).optional(),
});

export const PublishJobSchema = z.object({
  job_id: z.string().uuid("ID da vaga inválido"),
  status: z.enum(["publicada", "pausada", "encerrada"], { errorMap: () => ({ message: "Status inválido" }) }),
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
  carta_apresentacao: z.string().min(10, "Carta deve ter ao menos 10 caracteres").nullable(),
});

// Admin: Acesso
export const InviteAdminSchema = z.object({
  email: z.string().email("Email inválido"),
  perfil: z.enum(["admin", "operador"], { errorMap: () => ({ message: "Perfil inválido" }) }),
  permissoes: z.array(z.string()).optional(),
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
export type PublishJobInput = z.infer<typeof PublishJobSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateJobPreferencesInput = z.infer<typeof UpdateJobPreferencesSchema>;
export type ApplyJobInput = z.infer<typeof ApplyJobSchema>;
export type InviteAdminInput = z.infer<typeof InviteAdminSchema>;
export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;
