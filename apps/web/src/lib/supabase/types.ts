export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      checklists: {
        Row: {
          created_at: string | null
          id: string
          payload: Json
          project_id: string
          tenant_id: string
          tipo_etapa: Database["public"]["Enums"]["checklist_tipo_etapa"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload?: Json
          project_id: string
          tenant_id: string
          tipo_etapa: Database["public"]["Enums"]["checklist_tipo_etapa"]
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json
          project_id?: string
          tenant_id?: string
          tipo_etapa?: Database["public"]["Enums"]["checklist_tipo_etapa"]
        }
        Relationships: [
          {
            foreignKeyName: "checklists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cargo: string | null
          created_at: string | null
          id: string
          nome_completo: string | null
          role: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          cargo?: string | null
          created_at?: string | null
          id: string
          nome_completo?: string | null
          role?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          cargo?: string | null
          created_at?: string | null
          id?: string
          nome_completo?: string | null
          role?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          created_at: string | null
          data_prevista_instalacao: string | null
          id: string
          status: Database["public"]["Enums"]["project_status"] | null
          tenant_id: string
          titulo_ambiente: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          data_prevista_instalacao?: string | null
          id?: string
          status?: Database["public"]["Enums"]["project_status"] | null
          tenant_id: string
          titulo_ambiente: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          data_prevista_instalacao?: string | null
          id?: string
          status?: Database["public"]["Enums"]["project_status"] | null
          tenant_id?: string
          titulo_ambiente?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cnpj: string
          created_at: string | null
          id: string
          logo_url: string | null
          nome_fantasia: string
          telefone: string | null
        }
        Insert: {
          cnpj: string
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia: string
          telefone?: string | null
        }
        Update: {
          cnpj?: string
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string
          telefone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      salvar_briefing: {
        Args: {
          p_project_id: string | null
          p_cliente: Json
          p_projeto: Json
          p_payload: Json
        }
        Returns: string
      }
    }
    Enums: {
      checklist_tipo_etapa: "pre_producao" | "saida" | "instalacao"
      project_status:
        | "orcamento"
        | "pre_producao"
        | "producao"
        | "instalacao"
        | "concluido"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      checklist_tipo_etapa: ["pre_producao", "saida", "instalacao"],
      project_status: [
        "orcamento",
        "pre_producao",
        "producao",
        "instalacao",
        "concluido",
      ],
    },
  },
} as const
