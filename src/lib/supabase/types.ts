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
      admin_users: {
        Row: {
          ativo: boolean
          created_at: string
          mfa_ativo: boolean
          nome_exibicao: string | null
          perfil: Database["public"]["Enums"]["admin_perfil"]
          telefone: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          mfa_ativo?: boolean
          nome_exibicao?: string | null
          perfil: Database["public"]["Enums"]["admin_perfil"]
          telefone?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          mfa_ativo?: boolean
          nome_exibicao?: string | null
          perfil?: Database["public"]["Enums"]["admin_perfil"]
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_install_events: {
        Row: {
          created_at: string
          id: string
          plataforma: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          plataforma?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          plataforma?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      application_notes: {
        Row: {
          application_id: string
          autor_id: string
          created_at: string
          id: string
          nota: string
        }
        Insert: {
          application_id: string
          autor_id: string
          created_at?: string
          id?: string
          nota: string
        }
        Update: {
          application_id?: string
          autor_id?: string
          created_at?: string
          id?: string
          nota?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
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
          decidido_em: string | null
          decidido_por: string | null
          endereco: string | null
          id: string
          motivo_decisao: string | null
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
          decidido_em?: string | null
          decidido_por?: string | null
          endereco?: string | null
          id?: string
          motivo_decisao?: string | null
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
          decidido_em?: string | null
          decidido_por?: string | null
          endereco?: string | null
          id?: string
          motivo_decisao?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          segmento?: string | null
          site?: string | null
          status?: Database["public"]["Enums"]["status_empresa"]
          updated_at?: string
        }
        Relationships: []
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
          decidido_em: string | null
          decidido_por: string | null
          descricao: string | null
          id: string
          local: string | null
          modalidade: Database["public"]["Enums"]["modalidade_vaga"]
          modelo_trabalho: Database["public"]["Enums"]["modelo_trabalho"] | null
          motivo_decisao: string | null
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
          decidido_em?: string | null
          decidido_por?: string | null
          descricao?: string | null
          id?: string
          local?: string | null
          modalidade: Database["public"]["Enums"]["modalidade_vaga"]
          modelo_trabalho?:
            | Database["public"]["Enums"]["modelo_trabalho"]
            | null
          motivo_decisao?: string | null
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
          decidido_em?: string | null
          decidido_por?: string | null
          descricao?: string | null
          id?: string
          local?: string | null
          modalidade?: Database["public"]["Enums"]["modalidade_vaga"]
          modelo_trabalho?:
            | Database["public"]["Enums"]["modelo_trabalho"]
            | null
          motivo_decisao?: string | null
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
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
          idade: number | null
          latitude: number | null
          longitude: number | null
          nome_completo: string
          origem: string
          telefone: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          idade?: number | null
          latitude?: number | null
          longitude?: number | null
          nome_completo: string
          origem?: string
          telefone: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          idade?: number | null
          latitude?: number | null
          longitude?: number | null
          nome_completo?: string
          origem?: string
          telefone?: string
          user_id?: string | null
        }
        Relationships: []
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
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      privacy_requests: {
        Row: {
          atendido_em: string | null
          atendido_por: string | null
          created_at: string
          id: string
          origem: string | null
          resposta: string | null
          status: Database["public"]["Enums"]["status_solicitacao_lgpd"]
          tipo: Database["public"]["Enums"]["tipo_solicitacao_lgpd"]
          user_id: string
        }
        Insert: {
          atendido_em?: string | null
          atendido_por?: string | null
          created_at?: string
          id?: string
          origem?: string | null
          resposta?: string | null
          status?: Database["public"]["Enums"]["status_solicitacao_lgpd"]
          tipo: Database["public"]["Enums"]["tipo_solicitacao_lgpd"]
          user_id: string
        }
        Update: {
          atendido_em?: string | null
          atendido_por?: string | null
          created_at?: string
          id?: string
          origem?: string | null
          resposta?: string | null
          status?: Database["public"]["Enums"]["status_solicitacao_lgpd"]
          tipo?: Database["public"]["Enums"]["tipo_solicitacao_lgpd"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cidade: string | null
          created_at: string
          curriculo_url: string | null
          disponibilidade: string | null
          endereco: string | null
          historico_terceirizadoras: Json
          id: string
          idade: number | null
          modalidades_desejadas: Database["public"]["Enums"]["modalidade_vaga"][]
          modelo_trabalho: Database["public"]["Enums"]["modelo_trabalho"][]
          nome_completo: string
          perfil_completo_pct: number
          resumo: string | null
          status_validacao: string
          telefone: string | null
          titulo_profissional: string | null
          updated_at: string
          validado_em: string | null
          validado_por: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          curriculo_url?: string | null
          disponibilidade?: string | null
          endereco?: string | null
          historico_terceirizadoras?: Json
          id: string
          idade?: number | null
          modalidades_desejadas?: Database["public"]["Enums"]["modalidade_vaga"][]
          modelo_trabalho?: Database["public"]["Enums"]["modelo_trabalho"][]
          nome_completo: string
          perfil_completo_pct?: number
          resumo?: string | null
          status_validacao?: string
          telefone?: string | null
          titulo_profissional?: string | null
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          curriculo_url?: string | null
          disponibilidade?: string | null
          endereco?: string | null
          historico_terceirizadoras?: Json
          id?: string
          idade?: number | null
          modalidades_desejadas?: Database["public"]["Enums"]["modalidade_vaga"][]
          modelo_trabalho?: Database["public"]["Enums"]["modelo_trabalho"][]
          nome_completo?: string
          perfil_completo_pct?: number
          resumo?: string | null
          status_validacao?: string
          telefone?: string | null
          titulo_profissional?: string | null
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          alvo_id: string | null
          alvo_tipo: string
          created_at: string
          denunciante_id: string | null
          descricao: string | null
          id: string
          resolucao: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          status: Database["public"]["Enums"]["status_denuncia"]
          tipo: Database["public"]["Enums"]["tipo_denuncia"]
        }
        Insert: {
          alvo_id?: string | null
          alvo_tipo: string
          created_at?: string
          denunciante_id?: string | null
          descricao?: string | null
          id?: string
          resolucao?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: Database["public"]["Enums"]["status_denuncia"]
          tipo: Database["public"]["Enums"]["tipo_denuncia"]
        }
        Update: {
          alvo_id?: string | null
          alvo_tipo?: string
          created_at?: string
          denunciante_id?: string | null
          descricao?: string | null
          id?: string
          resolucao?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: Database["public"]["Enums"]["status_denuncia"]
          tipo?: Database["public"]["Enums"]["tipo_denuncia"]
        }
        Relationships: []
      }
      service_engagements: {
        Row: {
          application_id: string | null
          candidate_id: string
          company_id: string
          created_at: string
          criado_por: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          job_id: string
          modalidade: Database["public"]["Enums"]["modalidade_vaga"]
          observacoes: string | null
          periodicidade: string | null
          status_pagamento: Database["public"]["Enums"]["status_pagamento_servico"]
          updated_at: string
          valor: number | null
        }
        Insert: {
          application_id?: string | null
          candidate_id: string
          company_id: string
          created_at?: string
          criado_por?: string | null
          data_fim?: string | null
          data_inicio: string
          id?: string
          job_id: string
          modalidade: Database["public"]["Enums"]["modalidade_vaga"]
          observacoes?: string | null
          periodicidade?: string | null
          status_pagamento?: Database["public"]["Enums"]["status_pagamento_servico"]
          updated_at?: string
          valor?: number | null
        }
        Update: {
          application_id?: string | null
          candidate_id?: string
          company_id?: string
          created_at?: string
          criado_por?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          job_id?: string
          modalidade?: Database["public"]["Enums"]["modalidade_vaga"]
          observacoes?: string | null
          periodicidade?: string | null
          status_pagamento?: Database["public"]["Enums"]["status_pagamento_servico"]
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_engagements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_engagements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_engagements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
      admin_perfil: "superadmin" | "admin" | "operador"
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
      status_denuncia: "aberta" | "em_analise" | "resolvida" | "improcedente"
      status_empresa:
        | "rascunho"
        | "em_analise"
        | "ajustes"
        | "aprovada"
        | "suspensa"
        | "bloqueada"
      status_pagamento_servico: "pendente" | "pago" | "parcial" | "atrasado"
      status_solicitacao_lgpd:
        | "aberta"
        | "em_atendimento"
        | "atendida"
        | "recusada"
      status_vaga:
        | "rascunho"
        | "revisao"
        | "publicada"
        | "pausada"
        | "preenchida"
        | "encerrada"
        | "rejeitada"
        | "suspensa"
      tipo_denuncia:
        | "cobranca_indevida"
        | "discriminacao"
        | "assedio"
        | "dado_falso"
        | "outro"
      tipo_solicitacao_lgpd:
        | "acesso"
        | "correcao"
        | "exportacao"
        | "revogacao"
        | "eliminacao"
        | "revisao_decisao"
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_perfil: ["superadmin", "admin", "operador"],
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
      status_denuncia: ["aberta", "em_analise", "resolvida", "improcedente"],
      status_empresa: [
        "rascunho",
        "em_analise",
        "ajustes",
        "aprovada",
        "suspensa",
        "bloqueada",
      ],
      status_pagamento_servico: ["pendente", "pago", "parcial", "atrasado"],
      status_solicitacao_lgpd: [
        "aberta",
        "em_atendimento",
        "atendida",
        "recusada",
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
      tipo_denuncia: [
        "cobranca_indevida",
        "discriminacao",
        "assedio",
        "dado_falso",
        "outro",
      ],
      tipo_solicitacao_lgpd: [
        "acesso",
        "correcao",
        "exportacao",
        "revogacao",
        "eliminacao",
        "revisao_decisao",
      ],
    },
  },
} as const
