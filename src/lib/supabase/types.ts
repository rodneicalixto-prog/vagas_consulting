export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          job_id: string
          origem: string | null
          respostas: Json
          status: Database["public"]["Enums"]["status_candidatura"]
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          job_id: string
          origem?: string | null
          respostas?: Json
          status?: Database["public"]["Enums"]["status_candidatura"]
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string
          origem?: string | null
          respostas?: Json
          status?: Database["public"]["Enums"]["status_candidatura"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acao: string
          antes: Json | null
          ator_id: string | null
          created_at: string
          depois: Json | null
          id: string
          ip: string | null
          objeto_id: string | null
          objeto_tipo: string
        }
        Insert: {
          acao: string
          antes?: Json | null
          ator_id?: string | null
          created_at?: string
          depois?: Json | null
          id?: string
          ip?: string | null
          objeto_id?: string | null
          objeto_tipo: string
        }
        Update: {
          acao?: string
          antes?: Json | null
          ator_id?: string | null
          created_at?: string
          depois?: Json | null
          id?: string
          ip?: string | null
          objeto_id?: string | null
          objeto_tipo?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          cnpj: string | null
          created_at: string
          endereco: string | null
          id: string
          nome_fantasia: string | null
          razao_social: string
          segmento: string | null
          site: string | null
          status: Database["public"]["Enums"]["status_empresa"]
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social: string
          segmento?: string | null
          site?: string | null
          status?: Database["public"]["Enums"]["status_empresa"]
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string
          segmento?: string | null
          site?: string | null
          status?: Database["public"]["Enums"]["status_empresa"]
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          papel: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          papel?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          papel?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          canal: string | null
          created_at: string
          estado: string
          finalidade: string
          id: string
          origem: string | null
          user_id: string
          versao_texto: string | null
        }
        Insert: {
          canal?: string | null
          created_at?: string
          estado?: string
          finalidade: string
          id?: string
          origem?: string | null
          user_id: string
          versao_texto?: string | null
        }
        Update: {
          canal?: string | null
          created_at?: string
          estado?: string
          finalidade?: string
          id?: string
          origem?: string | null
          user_id?: string
          versao_texto?: string | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          job_id: string
          motivo: string | null
          resposta_em: string | null
          status: Database["public"]["Enums"]["status_convite_temp"]
          updated_at: string
          validade: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          job_id: string
          motivo?: string | null
          resposta_em?: string | null
          status?: Database["public"]["Enums"]["status_convite_temp"]
          updated_at?: string
          validade?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string
          motivo?: string | null
          resposta_em?: string | null
          status?: Database["public"]["Enums"]["status_convite_temp"]
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_id: string
          created_at: string
          descricao: string | null
          id: string
          local: string | null
          modalidade: Database["public"]["Enums"]["modalidade_vaga"]
          modelo_trabalho: Database["public"]["Enums"]["modelo_trabalho"] | null
          publicada_em: string | null
          regras: Json
          remuneracao_texto: string | null
          requisitos: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["status_vaga"]
          titulo: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          local?: string | null
          modalidade: Database["public"]["Enums"]["modalidade_vaga"]
          modelo_trabalho?:
            | Database["public"]["Enums"]["modelo_trabalho"]
            | null
          publicada_em?: string | null
          regras?: Json
          remuneracao_texto?: string | null
          requisitos?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_vaga"]
          titulo: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          local?: string | null
          modalidade?: Database["public"]["Enums"]["modalidade_vaga"]
          modelo_trabalho?:
            | Database["public"]["Enums"]["modelo_trabalho"]
            | null
          publicada_em?: string | null
          regras?: Json
          remuneracao_texto?: string | null
          requisitos?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_vaga"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          application_id: string | null
          conteudo: string
          created_at: string
          destinatario_id: string
          id: string
          invite_id: string | null
          lida: boolean
          remetente_id: string
        }
        Insert: {
          application_id?: string | null
          conteudo: string
          created_at?: string
          destinatario_id: string
          id?: string
          invite_id?: string | null
          lida?: boolean
          remetente_id: string
        }
        Update: {
          application_id?: string | null
          conteudo?: string
          created_at?: string
          destinatario_id?: string
          id?: string
          invite_id?: string | null
          lida?: boolean
          remetente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cidade: string | null
          created_at: string
          curriculo_url: string | null
          disponibilidade: string | null
          historico_terceirizadoras: Json
          id: string
          modalidades_desejadas: Database["public"]["Enums"]["modalidade_vaga"][]
          modelo_trabalho: Database["public"]["Enums"]["modelo_trabalho"][]
          nome_completo: string
          perfil_completo_pct: number
          resumo: string | null
          telefone: string | null
          titulo_profissional: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          curriculo_url?: string | null
          disponibilidade?: string | null
          historico_terceirizadoras?: Json
          id: string
          modalidades_desejadas?: Database["public"]["Enums"]["modalidade_vaga"][]
          modelo_trabalho?: Database["public"]["Enums"]["modelo_trabalho"][]
          nome_completo: string
          perfil_completo_pct?: number
          resumo?: string | null
          telefone?: string | null
          titulo_profissional?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          curriculo_url?: string | null
          disponibilidade?: string | null
          historico_terceirizadoras?: Json
          id?: string
          modalidades_desejadas?: Database["public"]["Enums"]["modalidade_vaga"][]
          modelo_trabalho?: Database["public"]["Enums"]["modelo_trabalho"][]
          nome_completo?: string
          perfil_completo_pct?: number
          resumo?: string | null
          telefone?: string | null
          titulo_profissional?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      temp_work: {
        Row: {
          aprovado_por: string | null
          checkin_em: string | null
          checkout_em: string | null
          conclusao_em: string | null
          created_at: string
          escala: Json
          id: string
          invite_id: string
          ocorrencia: string | null
          updated_at: string
          valor_texto: string | null
        }
        Insert: {
          aprovado_por?: string | null
          checkin_em?: string | null
          checkout_em?: string | null
          conclusao_em?: string | null
          created_at?: string
          escala?: Json
          id?: string
          invite_id: string
          ocorrencia?: string | null
          updated_at?: string
          valor_texto?: string | null
        }
        Update: {
          aprovado_por?: string | null
          checkin_em?: string | null
          checkout_em?: string | null
          conclusao_em?: string | null
          created_at?: string
          escala?: Json
          id?: string
          invite_id?: string
          ocorrencia?: string | null
          updated_at?: string
          valor_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temp_work_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      modalidade_vaga: "efetiva" | "pj" | "temporaria"
      modelo_trabalho: "presencial" | "hibrido" | "remoto"
      status_candidatura:
        | "recebida"
        | "triagem"
        | "entrevista"
        | "teste"
        | "proposta"
        | "contratado"
        | "rejeitada"
        | "desistente"
        | "expirada"
      status_convite_temp:
        | "ofertado"
        | "visualizado"
        | "aceito"
        | "recusado"
        | "confirmado"
        | "em_execucao"
        | "concluido"
        | "cancelado"
        | "ocorrencia"
      status_empresa:
        | "rascunho"
        | "em_analise"
        | "ajustes"
        | "aprovada"
        | "suspensa"
        | "bloqueada"
      status_vaga:
        | "rascunho"
        | "revisao"
        | "publicada"
        | "pausada"
        | "preenchida"
        | "encerrada"
        | "rejeitada"
        | "suspensa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      modalidade_vaga: ["efetiva", "pj", "temporaria"],
      modelo_trabalho: ["presencial", "hibrido", "remoto"],
      status_candidatura: [
        "recebida",
        "triagem",
        "entrevista",
        "teste",
        "proposta",
        "contratado",
        "rejeitada",
        "desistente",
        "expirada",
      ],
      status_convite_temp: [
        "ofertado",
        "visualizado",
        "aceito",
        "recusado",
        "confirmado",
        "em_execucao",
        "concluido",
        "cancelado",
        "ocorrencia",
      ],
      status_empresa: [
        "rascunho",
        "em_analise",
        "ajustes",
        "aprovada",
        "suspensa",
        "bloqueada",
      ],
      status_vaga: [
        "rascunho",
        "revisao",
        "publicada",
        "pausada",
        "preenchida",
        "encerrada",
        "rejeitada",
        "suspensa",
      ],
    },
  },
} as const
