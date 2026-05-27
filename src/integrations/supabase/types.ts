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
      clientes: {
        Row: {
          aniversario: string | null
          created_at: string
          endereco: string | null
          id: string
          instagram: string | null
          nome: string
          observacoes: string | null
          origem_cliente: string | null
          preferencias: string | null
          telefone: string | null
          telefone_whatsapp: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          aniversario?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          instagram?: string | null
          nome: string
          observacoes?: string | null
          origem_cliente?: string | null
          preferencias?: string | null
          telefone?: string | null
          telefone_whatsapp?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          aniversario?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          instagram?: string | null
          nome?: string
          observacoes?: string | null
          origem_cliente?: string | null
          preferencias?: string | null
          telefone?: string | null
          telefone_whatsapp?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      despesas: {
        Row: {
          categoria: string | null
          created_at: string
          data_despesa: string
          descricao: string
          id: string
          observacoes: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_despesa?: string
          descricao: string
          id?: string
          observacoes?: string | null
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_despesa?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      itens_pedido: {
        Row: {
          created_at: string
          id: string
          imagem_produto_snapshot: string | null
          nome_produto_snapshot: string
          pedido_id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          total_item: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          imagem_produto_snapshot?: string | null
          nome_produto_snapshot: string
          pedido_id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          total_item: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          imagem_produto_snapshot?: string | null
          nome_produto_snapshot?: string
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          total_item?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_venda: {
        Row: {
          created_at: string
          custo_unitario: number
          id: string
          perfume_id: string
          preco_unitario: number
          quantidade: number
          total_item: number
          user_id: string
          venda_id: string
        }
        Insert: {
          created_at?: string
          custo_unitario: number
          id?: string
          perfume_id: string
          preco_unitario: number
          quantidade: number
          total_item: number
          user_id: string
          venda_id: string
        }
        Update: {
          created_at?: string
          custo_unitario?: number
          id?: string
          perfume_id?: string
          preco_unitario?: number
          quantidade?: number
          total_item?: number
          user_id?: string
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_perfume_id_fkey"
            columns: ["perfume_id"]
            isOneToOne: false
            referencedRelation: "perfumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          created_at: string
          id: string
          nome_loja: string | null
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_loja?: string | null
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_loja?: string | null
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          observacoes: string | null
          perfume_id: string
          quantidade: number
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          perfume_id: string
          quantidade: number
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          perfume_id?: string
          quantidade?: number
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_perfume_id_fkey"
            columns: ["perfume_id"]
            isOneToOne: false
            referencedRelation: "perfumes"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_venda: {
        Row: {
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          id: string
          numero_parcela: number
          observacoes: string | null
          status_parcela: string
          updated_at: string
          user_id: string
          valor_parcela: number
          venda_id: string
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          numero_parcela: number
          observacoes?: string | null
          status_parcela?: string
          updated_at?: string
          user_id: string
          valor_parcela: number
          venda_id: string
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          numero_parcela?: number
          observacoes?: string | null
          status_parcela?: string
          updated_at?: string
          user_id?: string
          valor_parcela?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string | null
          codigo_pedido: string
          created_at: string
          data_pedido: string
          desconto: number
          endereco: string | null
          id: string
          instagram: string | null
          nome_cliente: string
          observacoes_cliente: string | null
          observacoes_internas: string | null
          status_pedido: string
          subtotal: number
          telefone_whatsapp: string
          total: number
          updated_at: string
          user_id: string
          venda_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          codigo_pedido: string
          created_at?: string
          data_pedido?: string
          desconto?: number
          endereco?: string | null
          id?: string
          instagram?: string | null
          nome_cliente: string
          observacoes_cliente?: string | null
          observacoes_internas?: string | null
          status_pedido?: string
          subtotal?: number
          telefone_whatsapp: string
          total?: number
          updated_at?: string
          user_id: string
          venda_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          codigo_pedido?: string
          created_at?: string
          data_pedido?: string
          desconto?: number
          endereco?: string | null
          id?: string
          instagram?: string | null
          nome_cliente?: string
          observacoes_cliente?: string | null
          observacoes_internas?: string | null
          status_pedido?: string
          subtotal?: number
          telefone_whatsapp?: string
          total?: number
          updated_at?: string
          user_id?: string
          venda_id?: string | null
        }
        Relationships: []
      }
      perfumes: {
        Row: {
          categoria: string | null
          created_at: string
          descricao: string | null
          estoque_minimo: number
          familia_olfativa: string | null
          fornecedor: string | null
          id: string
          imagem_url: string | null
          marca: string | null
          no_catalogo: boolean
          nome: string
          preco_custo: number
          preco_venda: number
          quantidade_estoque: number
          status: string
          tamanho_volume: string | null
          tipo_produto: string
          updated_at: string
          user_id: string
          volume_ml: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number
          familia_olfativa?: string | null
          fornecedor?: string | null
          id?: string
          imagem_url?: string | null
          marca?: string | null
          no_catalogo?: boolean
          nome: string
          preco_custo?: number
          preco_venda?: number
          quantidade_estoque?: number
          status?: string
          tamanho_volume?: string | null
          tipo_produto?: string
          updated_at?: string
          user_id: string
          volume_ml?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number
          familia_olfativa?: string | null
          fornecedor?: string | null
          id?: string
          imagem_url?: string | null
          marca?: string | null
          no_catalogo?: boolean
          nome?: string
          preco_custo?: number
          preco_venda?: number
          quantidade_estoque?: number
          status?: string
          tamanho_volume?: string | null
          tipo_produto?: string
          updated_at?: string
          user_id?: string
          volume_ml?: number | null
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente_id: string | null
          created_at: string
          custo_total: number
          data_vencimento: string | null
          data_venda: string
          desconto: number
          forma_pagamento: string | null
          id: string
          lucro_total: number
          observacoes: string | null
          origem_venda: string
          pedido_id: string | null
          quantidade_parcelas: number
          status_pagamento: string
          subtotal: number
          tipo_venda: string
          total: number
          updated_at: string
          user_id: string
          valor_pago: number
          valor_pendente: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          custo_total?: number
          data_vencimento?: string | null
          data_venda?: string
          desconto?: number
          forma_pagamento?: string | null
          id?: string
          lucro_total?: number
          observacoes?: string | null
          origem_venda?: string
          pedido_id?: string | null
          quantidade_parcelas?: number
          status_pagamento?: string
          subtotal?: number
          tipo_venda?: string
          total?: number
          updated_at?: string
          user_id: string
          valor_pago?: number
          valor_pendente?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          custo_total?: number
          data_vencimento?: string | null
          data_venda?: string
          desconto?: number
          forma_pagamento?: string | null
          id?: string
          lucro_total?: number
          observacoes?: string | null
          origem_venda?: string
          pedido_id?: string | null
          quantidade_parcelas?: number
          status_pagamento?: string
          subtotal?: number
          tipo_venda?: string
          total?: number
          updated_at?: string
          user_id?: string
          valor_pago?: number
          valor_pendente?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
