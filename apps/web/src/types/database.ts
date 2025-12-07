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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_context_snapshots: {
        Row: {
          created_at: string | null
          embedding: string | null
          id: string
          key_metrics: Json
          project_id: string
          recent_activities: Json | null
          snapshot_date: string
          snapshot_type: string
          summary_data: Json
          text_summary: string | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          key_metrics: Json
          project_id: string
          recent_activities?: Json | null
          snapshot_date: string
          snapshot_type: string
          summary_data: Json
          text_summary?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          key_metrics?: Json
          project_id?: string
          recent_activities?: Json | null
          snapshot_date?: string
          snapshot_type?: string
          summary_data?: Json
          text_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_context_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_context_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_context_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_context_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_context_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_context_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          archived_at: string | null
          context_type: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_message_at: string | null
          model_version: string | null
          organization_id: string
          project_id: string | null
          started_at: string | null
          temperature: number | null
          title: string | null
          total_messages: number | null
          total_tokens_used: number | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          context_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          model_version?: string | null
          organization_id: string
          project_id?: string | null
          started_at?: string | null
          temperature?: number | null
          title?: string | null
          total_messages?: number | null
          total_tokens_used?: number | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          context_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_message_at?: string | null
          model_version?: string | null
          organization_id?: string
          project_id?: string | null
          started_at?: string | null
          temperature?: number | null
          title?: string | null
          total_messages?: number | null
          total_tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_data_access_rules: {
        Row: {
          access_level: string
          allowed_columns: string[] | null
          contains_pii: boolean | null
          excluded_columns: string[] | null
          id: string
          notes: string | null
          organization_id: string
          pii_handling: string | null
          row_filter_sql: string | null
          table_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          access_level?: string
          allowed_columns?: string[] | null
          contains_pii?: boolean | null
          excluded_columns?: string[] | null
          id?: string
          notes?: string | null
          organization_id: string
          pii_handling?: string | null
          row_filter_sql?: string | null
          table_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          access_level?: string
          allowed_columns?: string[] | null
          contains_pii?: boolean | null
          excluded_columns?: string[] | null
          id?: string
          notes?: string | null
          organization_id?: string
          pii_handling?: string | null
          row_filter_sql?: string | null
          table_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_data_access_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_data_access_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          completion_tokens: number | null
          confidence_score: number | null
          content: string
          conversation_id: string
          created_at: string | null
          generated_sql: string | null
          id: string
          prompt_tokens: number | null
          query_type: string | null
          referenced_records: Json | null
          referenced_tables: string[] | null
          role: string
          sql_executed: boolean | null
          sql_result: Json | null
          user_feedback: string | null
          user_rating: number | null
          visualization_data: Json | null
          visualization_type: string | null
        }
        Insert: {
          completion_tokens?: number | null
          confidence_score?: number | null
          content: string
          conversation_id: string
          created_at?: string | null
          generated_sql?: string | null
          id?: string
          prompt_tokens?: number | null
          query_type?: string | null
          referenced_records?: Json | null
          referenced_tables?: string[] | null
          role: string
          sql_executed?: boolean | null
          sql_result?: Json | null
          user_feedback?: string | null
          user_rating?: number | null
          visualization_data?: Json | null
          visualization_type?: string | null
        }
        Update: {
          completion_tokens?: number | null
          confidence_score?: number | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          generated_sql?: string | null
          id?: string
          prompt_tokens?: number | null
          query_type?: string | null
          referenced_records?: Json | null
          referenced_tables?: string[] | null
          role?: string
          sql_executed?: boolean | null
          sql_result?: Json | null
          user_feedback?: string | null
          user_rating?: number | null
          visualization_data?: Json | null
          visualization_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_query_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          example_query: string | null
          example_response: string | null
          id: string
          is_active: boolean | null
          is_system_template: boolean | null
          name: string
          organization_id: string | null
          parameters: Json | null
          query_template: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          example_query?: string | null
          example_response?: string | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name: string
          organization_id?: string | null
          parameters?: Json | null
          query_template: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          example_query?: string | null
          example_response?: string | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name?: string
          organization_id?: string | null
          parameters?: Json | null
          query_template?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_query_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_query_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_saved_reports: {
        Row: {
          created_at: string | null
          data_snapshot: Json | null
          description: string | null
          export_format: string | null
          export_url: string | null
          generated_content: string
          id: string
          is_scheduled: boolean | null
          is_shared: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          organization_id: string
          project_id: string | null
          report_type: string
          schedule_cron: string | null
          shared_with: string[] | null
          source_query: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_snapshot?: Json | null
          description?: string | null
          export_format?: string | null
          export_url?: string | null
          generated_content: string
          id?: string
          is_scheduled?: boolean | null
          is_shared?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          organization_id: string
          project_id?: string | null
          report_type: string
          schedule_cron?: string | null
          shared_with?: string[] | null
          source_query?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_snapshot?: Json | null
          description?: string | null
          export_format?: string | null
          export_url?: string | null
          generated_content?: string
          id?: string
          is_scheduled?: boolean | null
          is_shared?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          organization_id?: string
          project_id?: string | null
          report_type?: string
          schedule_cron?: string | null
          shared_with?: string[] | null
          source_query?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_saved_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_saved_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_saved_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_saved_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_saved_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_saved_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_saved_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_saved_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          completion_tokens: number
          conversation_id: string | null
          created_at: string | null
          estimated_cost_usd: number | null
          id: string
          latency_ms: number | null
          message_id: string | null
          model_used: string
          organization_id: string
          prompt_tokens: number
          total_tokens: number
          usage_type: string
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          conversation_id?: string | null
          created_at?: string | null
          estimated_cost_usd?: number | null
          id?: string
          latency_ms?: number | null
          message_id?: string | null
          model_used: string
          organization_id: string
          prompt_tokens?: number
          total_tokens?: number
          usage_type: string
          user_id: string
        }
        Update: {
          completion_tokens?: number
          conversation_id?: string | null
          created_at?: string | null
          estimated_cost_usd?: number | null
          id?: string
          latency_ms?: number | null
          message_id?: string | null
          model_used?: string
          organization_id?: string
          prompt_tokens?: number
          total_tokens?: number
          usage_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "v_recent_ai_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_access_logs: {
        Row: {
          created_at: string
          id: string
          ip_address: unknown
          method: string
          organization_id: string | null
          path: string
          query_params: Json | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: unknown
          method: string
          organization_id?: string | null
          path: string
          query_params?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: unknown
          method?: string
          organization_id?: string | null
          path?: string
          query_params?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_modules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          module_group: string | null
          module_icon: string | null
          module_key: string
          module_name: string
          module_path: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          module_group?: string | null
          module_icon?: string | null
          module_key: string
          module_name: string
          module_path: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          module_group?: string | null
          module_icon?: string | null
          module_key?: string
          module_name?: string
          module_path?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      assembly_template_lines: {
        Row: {
          cost_source: string | null
          default_unit_cost: number | null
          id: string
          internal_cost_code_id: string | null
          productivity_factor: number | null
          productivity_notes: string | null
          quantity_per_unit: number
          quantity_uom: string | null
          resource_description: string
          resource_type: Database["public"]["Enums"]["resource_type_enum"]
          sort_order: number | null
          template_id: string
          wage_classification: string | null
          waste_percentage: number | null
        }
        Insert: {
          cost_source?: string | null
          default_unit_cost?: number | null
          id?: string
          internal_cost_code_id?: string | null
          productivity_factor?: number | null
          productivity_notes?: string | null
          quantity_per_unit: number
          quantity_uom?: string | null
          resource_description: string
          resource_type: Database["public"]["Enums"]["resource_type_enum"]
          sort_order?: number | null
          template_id: string
          wage_classification?: string | null
          waste_percentage?: number | null
        }
        Update: {
          cost_source?: string | null
          default_unit_cost?: number | null
          id?: string
          internal_cost_code_id?: string | null
          productivity_factor?: number | null
          productivity_notes?: string | null
          quantity_per_unit?: number
          quantity_uom?: string | null
          resource_description?: string
          resource_type?: Database["public"]["Enums"]["resource_type_enum"]
          sort_order?: number | null
          template_id?: string
          wage_classification?: string | null
          waste_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assembly_template_lines_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "assembly_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_templates: {
        Row: {
          conditions: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          project_type: string | null
          region: string | null
          source_description: string | null
          source_project_id: string | null
          template_description: string | null
          template_name: string
          updated_at: string | null
          wvdoh_item_code: string
        }
        Insert: {
          conditions?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          project_type?: string | null
          region?: string | null
          source_description?: string | null
          source_project_id?: string | null
          template_description?: string | null
          template_name: string
          updated_at?: string | null
          wvdoh_item_code: string
        }
        Update: {
          conditions?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          project_type?: string | null
          region?: string | null
          source_description?: string | null
          source_project_id?: string | null
          template_description?: string | null
          template_name?: string
          updated_at?: string | null
          wvdoh_item_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_templates_wvdoh_item_code_fkey"
            columns: ["wvdoh_item_code"]
            isOneToOne: false
            referencedRelation: "master_wvdoh_items"
            referencedColumns: ["item_code"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          project_id: string | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          project_id?: string | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          project_id?: string | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_events: {
        Row: {
          created_at: string
          details: Json | null
          device_info: Json | null
          event_type: string
          id: string
          ip_address: unknown
          location_info: Json | null
          organization_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          device_info?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          location_info?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          device_info?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          location_info?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bid_ai_corrections: {
        Row: {
          ai_confidence: number | null
          ai_model_used: string | null
          ai_reasoning: string | null
          bid_project_id: string
          corrected_by: string | null
          corrected_value: string | null
          correction_reason: string | null
          correction_type: string | null
          created_at: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["correction_entity_enum"]
          field_name: string
          id: string
          learning_batch_id: string | null
          organization_id: string
          original_value: string | null
          processed_at: string | null
          processed_for_learning: boolean | null
          source_document_id: string | null
          source_excerpt: string | null
          source_page: string | null
          user_notes: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_model_used?: string | null
          ai_reasoning?: string | null
          bid_project_id: string
          corrected_by?: string | null
          corrected_value?: string | null
          correction_reason?: string | null
          correction_type?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["correction_entity_enum"]
          field_name: string
          id?: string
          learning_batch_id?: string | null
          organization_id: string
          original_value?: string | null
          processed_at?: string | null
          processed_for_learning?: boolean | null
          source_document_id?: string | null
          source_excerpt?: string | null
          source_page?: string | null
          user_notes?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_model_used?: string | null
          ai_reasoning?: string | null
          bid_project_id?: string
          corrected_by?: string | null
          corrected_value?: string | null
          correction_reason?: string | null
          correction_type?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["correction_entity_enum"]
          field_name?: string
          id?: string
          learning_batch_id?: string | null
          organization_id?: string
          original_value?: string | null
          processed_at?: string | null
          processed_for_learning?: boolean | null
          source_document_id?: string | null
          source_excerpt?: string | null
          source_page?: string | null
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_ai_corrections_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_ai_corrections_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_ai_corrections_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_ai_corrections_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_ai_corrections_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_ai_corrections_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_ai_corrections_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_ai_corrections_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_ai_corrections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_ai_corrections_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "bid_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_assembly_template_lines: {
        Row: {
          assembly_template_id: string
          created_at: string | null
          crew_role: string | null
          crew_size: number | null
          default_unit_rate: number | null
          description: string
          equipment_class: string | null
          equipment_size: string | null
          extended_cost_per_output: number | null
          id: string
          include_in_total: boolean | null
          is_optional: boolean | null
          is_subcontracted_default: boolean | null
          labor_class: string | null
          line_number: number
          material_spec: string | null
          notes: string | null
          quantity_per_unit_output: number
          rate_effective_date: string | null
          rate_source: string | null
          resource_code: string | null
          resource_type: Database["public"]["Enums"]["assembly_resource_type_enum"]
          sort_order: number | null
          unit_of_measure: string
          updated_at: string | null
          waste_factor_pct: number | null
        }
        Insert: {
          assembly_template_id: string
          created_at?: string | null
          crew_role?: string | null
          crew_size?: number | null
          default_unit_rate?: number | null
          description: string
          equipment_class?: string | null
          equipment_size?: string | null
          extended_cost_per_output?: number | null
          id?: string
          include_in_total?: boolean | null
          is_optional?: boolean | null
          is_subcontracted_default?: boolean | null
          labor_class?: string | null
          line_number: number
          material_spec?: string | null
          notes?: string | null
          quantity_per_unit_output: number
          rate_effective_date?: string | null
          rate_source?: string | null
          resource_code?: string | null
          resource_type: Database["public"]["Enums"]["assembly_resource_type_enum"]
          sort_order?: number | null
          unit_of_measure: string
          updated_at?: string | null
          waste_factor_pct?: number | null
        }
        Update: {
          assembly_template_id?: string
          created_at?: string | null
          crew_role?: string | null
          crew_size?: number | null
          default_unit_rate?: number | null
          description?: string
          equipment_class?: string | null
          equipment_size?: string | null
          extended_cost_per_output?: number | null
          id?: string
          include_in_total?: boolean | null
          is_optional?: boolean | null
          is_subcontracted_default?: boolean | null
          labor_class?: string | null
          line_number?: number
          material_spec?: string | null
          notes?: string | null
          quantity_per_unit_output?: number
          rate_effective_date?: string | null
          rate_source?: string | null
          resource_code?: string | null
          resource_type?: Database["public"]["Enums"]["assembly_resource_type_enum"]
          sort_order?: number | null
          unit_of_measure?: string
          updated_at?: string | null
          waste_factor_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_assembly_template_lines_assembly_template_id_fkey"
            columns: ["assembly_template_id"]
            isOneToOne: false
            referencedRelation: "bid_assembly_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_assembly_template_lines_assembly_template_id_fkey"
            columns: ["assembly_template_id"]
            isOneToOne: false
            referencedRelation: "v_bid_assembly_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_assembly_template_lines_assembly_template_id_fkey"
            columns: ["assembly_template_id"]
            isOneToOne: false
            referencedRelation: "v_bid_assembly_usage"
            referencedColumns: ["template_id"]
          },
        ]
      }
      bid_assembly_templates: {
        Row: {
          applicable_conditions: string | null
          code: string | null
          created_at: string | null
          created_by: string | null
          default_estimation_method:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          default_productivity_rate: number | null
          default_productivity_unit: string | null
          description: string | null
          design_assumptions: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          name: string
          organization_id: string | null
          output_description: string | null
          output_unit: string
          superseded_by_id: string | null
          times_used: number | null
          total_cost_per_unit: number | null
          total_equipment_cost_per_unit: number | null
          total_labor_cost_per_unit: number | null
          total_material_cost_per_unit: number | null
          total_sub_cost_per_unit: number | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
          work_category: Database["public"]["Enums"]["work_category_enum"]
          wvdoh_item_number: string | null
          wvdoh_item_pattern: string | null
        }
        Insert: {
          applicable_conditions?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          default_estimation_method?:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          default_productivity_rate?: number | null
          default_productivity_unit?: string | null
          description?: string | null
          design_assumptions?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name: string
          organization_id?: string | null
          output_description?: string | null
          output_unit: string
          superseded_by_id?: string | null
          times_used?: number | null
          total_cost_per_unit?: number | null
          total_equipment_cost_per_unit?: number | null
          total_labor_cost_per_unit?: number | null
          total_material_cost_per_unit?: number | null
          total_sub_cost_per_unit?: number | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
          work_category: Database["public"]["Enums"]["work_category_enum"]
          wvdoh_item_number?: string | null
          wvdoh_item_pattern?: string | null
        }
        Update: {
          applicable_conditions?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          default_estimation_method?:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          default_productivity_rate?: number | null
          default_productivity_unit?: string | null
          description?: string | null
          design_assumptions?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          name?: string
          organization_id?: string | null
          output_description?: string | null
          output_unit?: string
          superseded_by_id?: string | null
          times_used?: number | null
          total_cost_per_unit?: number | null
          total_equipment_cost_per_unit?: number | null
          total_labor_cost_per_unit?: number | null
          total_material_cost_per_unit?: number | null
          total_sub_cost_per_unit?: number | null
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
          work_category?: Database["public"]["Enums"]["work_category_enum"]
          wvdoh_item_number?: string | null
          wvdoh_item_pattern?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_assembly_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_assembly_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_assembly_templates_superseded_by_id_fkey"
            columns: ["superseded_by_id"]
            isOneToOne: false
            referencedRelation: "bid_assembly_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_assembly_templates_superseded_by_id_fkey"
            columns: ["superseded_by_id"]
            isOneToOne: false
            referencedRelation: "v_bid_assembly_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_assembly_templates_superseded_by_id_fkey"
            columns: ["superseded_by_id"]
            isOneToOne: false
            referencedRelation: "v_bid_assembly_usage"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "bid_assembly_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_bridge_structures: {
        Row: {
          bid_project_id: string
          construction_sequence: number | null
          created_at: string | null
          deck_area_sf: number | null
          deck_type: string | null
          existing_condition_rating: number | null
          feature_crossed: string | null
          foundation_type: string | null
          id: string
          is_new_construction: boolean | null
          is_rehabilitation: boolean | null
          is_replacement: boolean | null
          length_feet: number | null
          milepost: number | null
          number_of_spans: number | null
          route: string | null
          source_document_id: string | null
          source_page_numbers: string | null
          structure_name: string
          structure_number: string | null
          structure_type: string | null
          substructure_type: string | null
          superstructure_type: string | null
          updated_at: string | null
          width_feet: number | null
        }
        Insert: {
          bid_project_id: string
          construction_sequence?: number | null
          created_at?: string | null
          deck_area_sf?: number | null
          deck_type?: string | null
          existing_condition_rating?: number | null
          feature_crossed?: string | null
          foundation_type?: string | null
          id?: string
          is_new_construction?: boolean | null
          is_rehabilitation?: boolean | null
          is_replacement?: boolean | null
          length_feet?: number | null
          milepost?: number | null
          number_of_spans?: number | null
          route?: string | null
          source_document_id?: string | null
          source_page_numbers?: string | null
          structure_name: string
          structure_number?: string | null
          structure_type?: string | null
          substructure_type?: string | null
          superstructure_type?: string | null
          updated_at?: string | null
          width_feet?: number | null
        }
        Update: {
          bid_project_id?: string
          construction_sequence?: number | null
          created_at?: string | null
          deck_area_sf?: number | null
          deck_type?: string | null
          existing_condition_rating?: number | null
          feature_crossed?: string | null
          foundation_type?: string | null
          id?: string
          is_new_construction?: boolean | null
          is_rehabilitation?: boolean | null
          is_replacement?: boolean | null
          length_feet?: number | null
          milepost?: number | null
          number_of_spans?: number | null
          route?: string | null
          source_document_id?: string | null
          source_page_numbers?: string | null
          structure_name?: string
          structure_number?: string | null
          structure_type?: string | null
          substructure_type?: string | null
          superstructure_type?: string | null
          updated_at?: string | null
          width_feet?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_bridge_structures_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_bridge_structures_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_bridge_structures_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_bridge_structures_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_bridge_structures_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_bridge_structures_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_bridge_structures_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_bridge_structures_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "bid_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_competitors: {
        Row: {
          bid_amount: number | null
          bid_rank: number | null
          competitor_name: string
          created_at: string | null
          id: string
          notes: string | null
          proposal_id: string
          spread_from_low: number | null
          spread_from_our_bid: number | null
        }
        Insert: {
          bid_amount?: number | null
          bid_rank?: number | null
          competitor_name: string
          created_at?: string | null
          id?: string
          notes?: string | null
          proposal_id: string
          spread_from_low?: number | null
          spread_from_our_bid?: number | null
        }
        Update: {
          bid_amount?: number | null
          bid_rank?: number | null
          competitor_name?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          proposal_id?: string
          spread_from_low?: number | null
          spread_from_our_bid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_competitors_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "bid_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_competitors_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_construction_phases: {
        Row: {
          bid_project_id: string
          created_at: string | null
          description: string
          enables: string | null
          estimated_duration_days: number | null
          id: string
          phase_name: string
          phase_number: number
          prerequisites: string | null
          source_sheet_numbers: string | null
          structure_id: string | null
          summary_id: string
          traffic_configuration: string | null
          traffic_notes: string | null
          work_included: string | null
        }
        Insert: {
          bid_project_id: string
          created_at?: string | null
          description: string
          enables?: string | null
          estimated_duration_days?: number | null
          id?: string
          phase_name: string
          phase_number: number
          prerequisites?: string | null
          source_sheet_numbers?: string | null
          structure_id?: string | null
          summary_id: string
          traffic_configuration?: string | null
          traffic_notes?: string | null
          work_included?: string | null
        }
        Update: {
          bid_project_id?: string
          created_at?: string | null
          description?: string
          enables?: string | null
          estimated_duration_days?: number | null
          id?: string
          phase_name?: string
          phase_number?: number
          prerequisites?: string | null
          source_sheet_numbers?: string | null
          structure_id?: string | null
          summary_id?: string
          traffic_configuration?: string | null
          traffic_notes?: string | null
          work_included?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_construction_phases_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_construction_phases_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_construction_phases_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_construction_phases_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_construction_phases_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_construction_phases_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_construction_phases_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_construction_phases_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "bid_bridge_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_construction_phases_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "bid_construction_phases_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "bid_mot_phasing_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_documents: {
        Row: {
          bid_project_id: string
          created_at: string | null
          created_by: string | null
          document_author: string | null
          document_date: string | null
          document_title: string | null
          document_type: Database["public"]["Enums"]["document_type_enum"]
          extracted_text_path: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          is_ocr_required: boolean | null
          mime_type: string | null
          ocr_confidence: number | null
          page_count: number | null
          processing_completed_at: string | null
          processing_error: string | null
          processing_started_at: string | null
          processing_status:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
        }
        Insert: {
          bid_project_id: string
          created_at?: string | null
          created_by?: string | null
          document_author?: string | null
          document_date?: string | null
          document_title?: string | null
          document_type: Database["public"]["Enums"]["document_type_enum"]
          extracted_text_path?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          is_ocr_required?: boolean | null
          mime_type?: string | null
          ocr_confidence?: number | null
          page_count?: number | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
        }
        Update: {
          bid_project_id?: string
          created_at?: string | null
          created_by?: string | null
          document_author?: string | null
          document_date?: string | null
          document_title?: string | null
          document_type?: Database["public"]["Enums"]["document_type_enum"]
          extracted_text_path?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          is_ocr_required?: boolean | null
          mime_type?: string | null
          ocr_confidence?: number | null
          page_count?: number | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_documents_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_documents_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_documents_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_documents_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_documents_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_documents_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_documents_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_environmental_commitment_items: {
        Row: {
          ai_confidence: number | null
          ai_linked: boolean | null
          ai_reasoning: string | null
          allocated_cost: number | null
          allocation_notes: string | null
          coverage_assessment: string | null
          created_at: string | null
          created_by: string | null
          environmental_commitment_id: string
          id: string
          line_item_id: string | null
          notes: string | null
          relationship_type: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_linked?: boolean | null
          ai_reasoning?: string | null
          allocated_cost?: number | null
          allocation_notes?: string | null
          coverage_assessment?: string | null
          created_at?: string | null
          created_by?: string | null
          environmental_commitment_id: string
          id?: string
          line_item_id?: string | null
          notes?: string | null
          relationship_type?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_linked?: boolean | null
          ai_reasoning?: string | null
          allocated_cost?: number | null
          allocation_notes?: string | null
          coverage_assessment?: string | null
          created_at?: string | null
          created_by?: string | null
          environmental_commitment_id?: string
          id?: string
          line_item_id?: string | null
          notes?: string | null
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_environmental_commitment_i_environmental_commitment_id_fkey"
            columns: ["environmental_commitment_id"]
            isOneToOne: false
            referencedRelation: "bid_environmental_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_environmental_commitment_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_environmental_commitment_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_environmental_commitment_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_environmental_commitment_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_environmental_commitment_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_environmental_commitment_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
        ]
      }
      bid_environmental_commitments: {
        Row: {
          ai_confidence: number | null
          ai_generated: boolean | null
          bid_project_id: string
          commitment_type: string
          cost_impact_notes: string | null
          created_at: string | null
          description: string
          estimated_cost_impact: number | null
          estimated_schedule_impact_days: number | null
          has_cost_impact: boolean | null
          has_schedule_impact: boolean | null
          id: string
          monitoring_frequency: string | null
          monitoring_parameters: string | null
          permit_agency: string | null
          permit_expiration: string | null
          permit_number: string | null
          reporting_requirements: string | null
          restriction_end_date: string | null
          restriction_notes: string | null
          restriction_start_date: string | null
          restriction_type: string | null
          schedule_impact_notes: string | null
          source_document_id: string | null
          source_page_numbers: string | null
          source_text_excerpt: string | null
          title: string
          updated_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_generated?: boolean | null
          bid_project_id: string
          commitment_type: string
          cost_impact_notes?: string | null
          created_at?: string | null
          description: string
          estimated_cost_impact?: number | null
          estimated_schedule_impact_days?: number | null
          has_cost_impact?: boolean | null
          has_schedule_impact?: boolean | null
          id?: string
          monitoring_frequency?: string | null
          monitoring_parameters?: string | null
          permit_agency?: string | null
          permit_expiration?: string | null
          permit_number?: string | null
          reporting_requirements?: string | null
          restriction_end_date?: string | null
          restriction_notes?: string | null
          restriction_start_date?: string | null
          restriction_type?: string | null
          schedule_impact_notes?: string | null
          source_document_id?: string | null
          source_page_numbers?: string | null
          source_text_excerpt?: string | null
          title: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_generated?: boolean | null
          bid_project_id?: string
          commitment_type?: string
          cost_impact_notes?: string | null
          created_at?: string | null
          description?: string
          estimated_cost_impact?: number | null
          estimated_schedule_impact_days?: number | null
          has_cost_impact?: boolean | null
          has_schedule_impact?: boolean | null
          id?: string
          monitoring_frequency?: string | null
          monitoring_parameters?: string | null
          permit_agency?: string | null
          permit_expiration?: string | null
          permit_number?: string | null
          reporting_requirements?: string | null
          restriction_end_date?: string | null
          restriction_notes?: string | null
          restriction_start_date?: string | null
          restriction_type?: string | null
          schedule_impact_notes?: string | null
          source_document_id?: string | null
          source_page_numbers?: string | null
          source_text_excerpt?: string | null
          title?: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_environmental_commitments_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_environmental_commitments_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_environmental_commitments_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_environmental_commitments_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_environmental_commitments_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_environmental_commitments_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_environmental_commitments_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_environmental_commitments_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "bid_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_environmental_commitments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_estimate_version_items: {
        Row: {
          assembly_template_name: string | null
          base_unit_cost: number | null
          boe_comments: string | null
          contingency_pct: number | null
          created_at: string | null
          description: string
          equipment_cost: number | null
          estimate_version_id: string
          estimation_method:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          extended_price: number | null
          id: string
          item_number: string
          key_assumptions: string | null
          labor_cost: number | null
          line_item_id: string
          linked_risk_count: number | null
          material_cost: number | null
          overhead_pct: number | null
          price_source: Database["public"]["Enums"]["price_source_enum"] | null
          profit_pct: number | null
          quantity: number
          risk_level: Database["public"]["Enums"]["severity_enum"] | null
          risk_notes: string | null
          structure_name: string | null
          sub_cost: number | null
          unit: string
          unit_price: number | null
          work_category:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
          work_package_name: string | null
        }
        Insert: {
          assembly_template_name?: string | null
          base_unit_cost?: number | null
          boe_comments?: string | null
          contingency_pct?: number | null
          created_at?: string | null
          description: string
          equipment_cost?: number | null
          estimate_version_id: string
          estimation_method?:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          extended_price?: number | null
          id?: string
          item_number: string
          key_assumptions?: string | null
          labor_cost?: number | null
          line_item_id: string
          linked_risk_count?: number | null
          material_cost?: number | null
          overhead_pct?: number | null
          price_source?: Database["public"]["Enums"]["price_source_enum"] | null
          profit_pct?: number | null
          quantity: number
          risk_level?: Database["public"]["Enums"]["severity_enum"] | null
          risk_notes?: string | null
          structure_name?: string | null
          sub_cost?: number | null
          unit: string
          unit_price?: number | null
          work_category?:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
          work_package_name?: string | null
        }
        Update: {
          assembly_template_name?: string | null
          base_unit_cost?: number | null
          boe_comments?: string | null
          contingency_pct?: number | null
          created_at?: string | null
          description?: string
          equipment_cost?: number | null
          estimate_version_id?: string
          estimation_method?:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          extended_price?: number | null
          id?: string
          item_number?: string
          key_assumptions?: string | null
          labor_cost?: number | null
          line_item_id?: string
          linked_risk_count?: number | null
          material_cost?: number | null
          overhead_pct?: number | null
          price_source?: Database["public"]["Enums"]["price_source_enum"] | null
          profit_pct?: number | null
          quantity?: number
          risk_level?: Database["public"]["Enums"]["severity_enum"] | null
          risk_notes?: string | null
          structure_name?: string | null
          sub_cost?: number | null
          unit?: string
          unit_price?: number | null
          work_category?:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
          work_package_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_estimate_version_items_estimate_version_id_fkey"
            columns: ["estimate_version_id"]
            isOneToOne: false
            referencedRelation: "bid_estimate_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_estimate_version_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_estimate_version_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_estimate_version_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_estimate_version_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_estimate_version_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
        ]
      }
      bid_estimate_versions: {
        Row: {
          bid_project_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_margin_pct: number | null
          high_risk_items: number | null
          id: string
          is_current: boolean | null
          is_submitted: boolean | null
          items_manual_priced: number | null
          items_with_assembly: number | null
          items_with_subquote: number | null
          pricing_scenario_id: string | null
          scenario_name: string | null
          snapshot_data: Json | null
          submitted_at: string | null
          total_base_cost: number | null
          total_items: number | null
          total_with_markups: number | null
          trigger_event: string | null
          trigger_notes: string | null
          version_name: string
          version_number: number
        }
        Insert: {
          bid_project_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_margin_pct?: number | null
          high_risk_items?: number | null
          id?: string
          is_current?: boolean | null
          is_submitted?: boolean | null
          items_manual_priced?: number | null
          items_with_assembly?: number | null
          items_with_subquote?: number | null
          pricing_scenario_id?: string | null
          scenario_name?: string | null
          snapshot_data?: Json | null
          submitted_at?: string | null
          total_base_cost?: number | null
          total_items?: number | null
          total_with_markups?: number | null
          trigger_event?: string | null
          trigger_notes?: string | null
          version_name: string
          version_number: number
        }
        Update: {
          bid_project_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_margin_pct?: number | null
          high_risk_items?: number | null
          id?: string
          is_current?: boolean | null
          is_submitted?: boolean | null
          items_manual_priced?: number | null
          items_with_assembly?: number | null
          items_with_subquote?: number | null
          pricing_scenario_id?: string | null
          scenario_name?: string | null
          snapshot_data?: Json | null
          submitted_at?: string | null
          total_base_cost?: number | null
          total_items?: number | null
          total_with_markups?: number | null
          trigger_event?: string | null
          trigger_notes?: string | null
          version_name?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_pricing_scenario_id_fkey"
            columns: ["pricing_scenario_id"]
            isOneToOne: false
            referencedRelation: "bid_pricing_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_pricing_scenario_id_fkey"
            columns: ["pricing_scenario_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["scenario_id"]
          },
        ]
      }
      bid_executive_snapshots: {
        Row: {
          ai_model_used: string | null
          ai_prompt_version: string | null
          bid_project_id: string
          cost_considerations: string | null
          created_at: string | null
          critical_risks_count: number | null
          environmental_commitments_count: number | null
          environmental_summary: string | null
          generation_duration_ms: number | null
          hazmat_findings_count: number | null
          high_risks_count: number | null
          id: string
          is_current: boolean | null
          key_quantities_summary: string | null
          prebid_questions_count: number | null
          project_overview: string | null
          recommendations: string | null
          review_notes: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_summary: string | null
          schedule_summary: string | null
          snapshot_date: string
          superseded_at: string | null
          superseded_by: string | null
          tokens_used: number | null
          total_estimated_value: number | null
          total_line_items: number | null
          updated_at: string | null
          version_number: number
          work_packages_count: number | null
        }
        Insert: {
          ai_model_used?: string | null
          ai_prompt_version?: string | null
          bid_project_id: string
          cost_considerations?: string | null
          created_at?: string | null
          critical_risks_count?: number | null
          environmental_commitments_count?: number | null
          environmental_summary?: string | null
          generation_duration_ms?: number | null
          hazmat_findings_count?: number | null
          high_risks_count?: number | null
          id?: string
          is_current?: boolean | null
          key_quantities_summary?: string | null
          prebid_questions_count?: number | null
          project_overview?: string | null
          recommendations?: string | null
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_summary?: string | null
          schedule_summary?: string | null
          snapshot_date?: string
          superseded_at?: string | null
          superseded_by?: string | null
          tokens_used?: number | null
          total_estimated_value?: number | null
          total_line_items?: number | null
          updated_at?: string | null
          version_number?: number
          work_packages_count?: number | null
        }
        Update: {
          ai_model_used?: string | null
          ai_prompt_version?: string | null
          bid_project_id?: string
          cost_considerations?: string | null
          created_at?: string | null
          critical_risks_count?: number | null
          environmental_commitments_count?: number | null
          environmental_summary?: string | null
          generation_duration_ms?: number | null
          hazmat_findings_count?: number | null
          high_risks_count?: number | null
          id?: string
          is_current?: boolean | null
          key_quantities_summary?: string | null
          prebid_questions_count?: number | null
          project_overview?: string | null
          recommendations?: string | null
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_summary?: string | null
          schedule_summary?: string | null
          snapshot_date?: string
          superseded_at?: string | null
          superseded_by?: string | null
          tokens_used?: number | null
          total_estimated_value?: number | null
          total_line_items?: number | null
          updated_at?: string | null
          version_number?: number
          work_packages_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_executive_snapshots_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_executive_snapshots_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_executive_snapshots_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_executive_snapshots_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_executive_snapshots_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_executive_snapshots_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_executive_snapshots_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_executive_snapshots_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_executive_snapshots_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "bid_executive_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_export_packages: {
        Row: {
          bid_project_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          download_count: number | null
          error_message: string | null
          expires_at: string | null
          export_name: string
          export_type: Database["public"]["Enums"]["export_type_enum"]
          file_checksum: string | null
          file_mime_type: string | null
          file_path: string | null
          file_size_bytes: number | null
          generation_params: Json | null
          id: string
          included_sections: string[] | null
          last_downloaded_at: string | null
          snapshot_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["export_status_enum"] | null
          updated_at: string | null
        }
        Insert: {
          bid_project_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          error_message?: string | null
          expires_at?: string | null
          export_name: string
          export_type: Database["public"]["Enums"]["export_type_enum"]
          file_checksum?: string | null
          file_mime_type?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          generation_params?: Json | null
          id?: string
          included_sections?: string[] | null
          last_downloaded_at?: string | null
          snapshot_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["export_status_enum"] | null
          updated_at?: string | null
        }
        Update: {
          bid_project_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          error_message?: string | null
          expires_at?: string | null
          export_name?: string
          export_type?: Database["public"]["Enums"]["export_type_enum"]
          file_checksum?: string | null
          file_mime_type?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          generation_params?: Json | null
          id?: string
          included_sections?: string[] | null
          last_downloaded_at?: string | null
          snapshot_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["export_status_enum"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_export_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_export_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_export_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_export_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_export_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_export_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_export_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_export_packages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_export_packages_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "bid_executive_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_hazmat_findings: {
        Row: {
          action_description: string | null
          ai_confidence: number | null
          ai_generated: boolean | null
          bid_project_id: string
          concentration: string | null
          created_at: string | null
          disposal_requirements: string | null
          estimated_abatement_cost: number | null
          estimated_quantity: number | null
          friability: string | null
          has_bid_item: boolean | null
          hazmat_type: string
          id: string
          is_risk_flagged: boolean | null
          linked_line_item_id: string | null
          linked_risk_id: string | null
          location_description: string
          material_condition: string | null
          material_description: string | null
          notification_agency: string | null
          quantity_unit: string | null
          recommended_action: string | null
          requires_licensed_contractor: boolean | null
          requires_notification: boolean | null
          sample_date: string | null
          sample_id: string | null
          source_document_id: string | null
          source_page_numbers: string | null
          structure_id: string | null
          test_result: string | null
          updated_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          action_description?: string | null
          ai_confidence?: number | null
          ai_generated?: boolean | null
          bid_project_id: string
          concentration?: string | null
          created_at?: string | null
          disposal_requirements?: string | null
          estimated_abatement_cost?: number | null
          estimated_quantity?: number | null
          friability?: string | null
          has_bid_item?: boolean | null
          hazmat_type: string
          id?: string
          is_risk_flagged?: boolean | null
          linked_line_item_id?: string | null
          linked_risk_id?: string | null
          location_description: string
          material_condition?: string | null
          material_description?: string | null
          notification_agency?: string | null
          quantity_unit?: string | null
          recommended_action?: string | null
          requires_licensed_contractor?: boolean | null
          requires_notification?: boolean | null
          sample_date?: string | null
          sample_id?: string | null
          source_document_id?: string | null
          source_page_numbers?: string | null
          structure_id?: string | null
          test_result?: string | null
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          action_description?: string | null
          ai_confidence?: number | null
          ai_generated?: boolean | null
          bid_project_id?: string
          concentration?: string | null
          created_at?: string | null
          disposal_requirements?: string | null
          estimated_abatement_cost?: number | null
          estimated_quantity?: number | null
          friability?: string | null
          has_bid_item?: boolean | null
          hazmat_type?: string
          id?: string
          is_risk_flagged?: boolean | null
          linked_line_item_id?: string | null
          linked_risk_id?: string | null
          location_description?: string
          material_condition?: string | null
          material_description?: string | null
          notification_agency?: string | null
          quantity_unit?: string | null
          recommended_action?: string | null
          requires_licensed_contractor?: boolean | null
          requires_notification?: boolean | null
          sample_date?: string | null
          sample_id?: string | null
          source_document_id?: string | null
          source_page_numbers?: string | null
          structure_id?: string | null
          test_result?: string | null
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_hazmat_findings_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_linked_line_item_id_fkey"
            columns: ["linked_line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_linked_line_item_id_fkey"
            columns: ["linked_line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_linked_line_item_id_fkey"
            columns: ["linked_line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_linked_line_item_id_fkey"
            columns: ["linked_line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_linked_line_item_id_fkey"
            columns: ["linked_line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_linked_risk_id_fkey"
            columns: ["linked_risk_id"]
            isOneToOne: false
            referencedRelation: "bid_project_risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "bid_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "bid_bridge_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["structure_id"]
          },
          {
            foreignKeyName: "bid_hazmat_findings_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_hazmat_items: {
        Row: {
          ai_confidence: number | null
          ai_linked: boolean | null
          allocated_cost: number | null
          allocation_notes: string | null
          coverage_assessment: string | null
          created_at: string | null
          created_by: string | null
          hazmat_finding_id: string
          id: string
          line_item_id: string | null
          relationship_type: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_linked?: boolean | null
          allocated_cost?: number | null
          allocation_notes?: string | null
          coverage_assessment?: string | null
          created_at?: string | null
          created_by?: string | null
          hazmat_finding_id: string
          id?: string
          line_item_id?: string | null
          relationship_type?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_linked?: boolean | null
          allocated_cost?: number | null
          allocation_notes?: string | null
          coverage_assessment?: string | null
          created_at?: string | null
          created_by?: string | null
          hazmat_finding_id?: string
          id?: string
          line_item_id?: string | null
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_hazmat_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_items_hazmat_finding_id_fkey"
            columns: ["hazmat_finding_id"]
            isOneToOne: false
            referencedRelation: "bid_hazmat_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_hazmat_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_hazmat_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
        ]
      }
      bid_item_assemblies: {
        Row: {
          adjusted_productivity_rate: number | null
          ai_confidence_score: number | null
          ai_template_match_reason: string | null
          assembly_template_id: string
          calculated_at: string | null
          calculated_base_unit_cost: number | null
          calculated_equipment_cost: number | null
          calculated_labor_cost: number | null
          calculated_material_cost: number | null
          calculated_sub_cost: number | null
          cost_breakdown: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          is_ai_suggested: boolean | null
          is_manually_adjusted: boolean | null
          line_item_id: string
          notes: string | null
          original_ai_template_id: string | null
          overridden_at: string | null
          overridden_by: string | null
          override_reason: string | null
          productivity_adjustment_reason: string | null
          productivity_factor: number | null
          template_overridden: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          adjusted_productivity_rate?: number | null
          ai_confidence_score?: number | null
          ai_template_match_reason?: string | null
          assembly_template_id: string
          calculated_at?: string | null
          calculated_base_unit_cost?: number | null
          calculated_equipment_cost?: number | null
          calculated_labor_cost?: number | null
          calculated_material_cost?: number | null
          calculated_sub_cost?: number | null
          cost_breakdown?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_ai_suggested?: boolean | null
          is_manually_adjusted?: boolean | null
          line_item_id: string
          notes?: string | null
          original_ai_template_id?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          productivity_adjustment_reason?: string | null
          productivity_factor?: number | null
          template_overridden?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          adjusted_productivity_rate?: number | null
          ai_confidence_score?: number | null
          ai_template_match_reason?: string | null
          assembly_template_id?: string
          calculated_at?: string | null
          calculated_base_unit_cost?: number | null
          calculated_equipment_cost?: number | null
          calculated_labor_cost?: number | null
          calculated_material_cost?: number | null
          calculated_sub_cost?: number | null
          cost_breakdown?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_ai_suggested?: boolean | null
          is_manually_adjusted?: boolean | null
          line_item_id?: string
          notes?: string | null
          original_ai_template_id?: string | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          productivity_adjustment_reason?: string | null
          productivity_factor?: number | null
          template_overridden?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_item_assemblies_assembly_template_id_fkey"
            columns: ["assembly_template_id"]
            isOneToOne: false
            referencedRelation: "bid_assembly_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_assembly_template_id_fkey"
            columns: ["assembly_template_id"]
            isOneToOne: false
            referencedRelation: "v_bid_assembly_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_assembly_template_id_fkey"
            columns: ["assembly_template_id"]
            isOneToOne: false
            referencedRelation: "v_bid_assembly_usage"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: true
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: true
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: true
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: true
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: true
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_original_ai_template_id_fkey"
            columns: ["original_ai_template_id"]
            isOneToOne: false
            referencedRelation: "bid_assembly_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_original_ai_template_id_fkey"
            columns: ["original_ai_template_id"]
            isOneToOne: false
            referencedRelation: "v_bid_assembly_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_original_ai_template_id_fkey"
            columns: ["original_ai_template_id"]
            isOneToOne: false
            referencedRelation: "v_bid_assembly_usage"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_assemblies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_item_assembly_lines: {
        Row: {
          adjustment_reason: string | null
          created_at: string | null
          crew_role: string | null
          crew_size: number | null
          description: string
          equipment_class: string | null
          equipment_size: string | null
          extended_cost: number | null
          id: string
          is_added: boolean | null
          is_adjusted: boolean | null
          is_excluded: boolean | null
          item_assembly_id: string
          labor_class: string | null
          line_number: number
          material_spec: string | null
          quantity_per_unit_output: number
          rate_source: string | null
          resource_code: string | null
          resource_type: Database["public"]["Enums"]["assembly_resource_type_enum"]
          sort_order: number | null
          template_line_id: string | null
          unit_of_measure: string
          unit_rate: number | null
          updated_at: string | null
          waste_factor_pct: number | null
        }
        Insert: {
          adjustment_reason?: string | null
          created_at?: string | null
          crew_role?: string | null
          crew_size?: number | null
          description: string
          equipment_class?: string | null
          equipment_size?: string | null
          extended_cost?: number | null
          id?: string
          is_added?: boolean | null
          is_adjusted?: boolean | null
          is_excluded?: boolean | null
          item_assembly_id: string
          labor_class?: string | null
          line_number: number
          material_spec?: string | null
          quantity_per_unit_output: number
          rate_source?: string | null
          resource_code?: string | null
          resource_type: Database["public"]["Enums"]["assembly_resource_type_enum"]
          sort_order?: number | null
          template_line_id?: string | null
          unit_of_measure: string
          unit_rate?: number | null
          updated_at?: string | null
          waste_factor_pct?: number | null
        }
        Update: {
          adjustment_reason?: string | null
          created_at?: string | null
          crew_role?: string | null
          crew_size?: number | null
          description?: string
          equipment_class?: string | null
          equipment_size?: string | null
          extended_cost?: number | null
          id?: string
          is_added?: boolean | null
          is_adjusted?: boolean | null
          is_excluded?: boolean | null
          item_assembly_id?: string
          labor_class?: string | null
          line_number?: number
          material_spec?: string | null
          quantity_per_unit_output?: number
          rate_source?: string | null
          resource_code?: string | null
          resource_type?: Database["public"]["Enums"]["assembly_resource_type_enum"]
          sort_order?: number | null
          template_line_id?: string | null
          unit_of_measure?: string
          unit_rate?: number | null
          updated_at?: string | null
          waste_factor_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_item_assembly_lines_item_assembly_id_fkey"
            columns: ["item_assembly_id"]
            isOneToOne: false
            referencedRelation: "bid_item_assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_assembly_lines_item_assembly_id_fkey"
            columns: ["item_assembly_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["assembly_id"]
          },
          {
            foreignKeyName: "bid_item_assembly_lines_template_line_id_fkey"
            columns: ["template_line_id"]
            isOneToOne: false
            referencedRelation: "bid_assembly_template_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_item_document_refs: {
        Row: {
          ai_confidence: number | null
          ai_extracted: boolean | null
          created_at: string | null
          document_id: string
          document_type: Database["public"]["Enums"]["document_type_enum"]
          id: string
          line_item_id: string
          page_numbers: string | null
          reference_type: string | null
          section_reference: string | null
          sheet_numbers: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_extracted?: boolean | null
          created_at?: string | null
          document_id: string
          document_type: Database["public"]["Enums"]["document_type_enum"]
          id?: string
          line_item_id: string
          page_numbers?: string | null
          reference_type?: string | null
          section_reference?: string | null
          sheet_numbers?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_extracted?: boolean | null
          created_at?: string | null
          document_id?: string
          document_type?: Database["public"]["Enums"]["document_type_enum"]
          id?: string
          line_item_id?: string
          page_numbers?: string | null
          reference_type?: string | null
          section_reference?: string | null
          sheet_numbers?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_item_document_refs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "bid_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_document_refs_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_document_refs_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_document_refs_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_document_refs_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_item_document_refs_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_item_document_refs_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_item_pricing_scenarios: {
        Row: {
          base_unit_cost_override: number | null
          contingency_pct: number | null
          created_at: string | null
          id: string
          line_item_id: string
          notes: string | null
          overhead_pct: number | null
          pricing_scenario_id: string
          productivity_factor_override: number | null
          profit_pct: number | null
          risk_load_pct: number | null
          scenario_extended_price: number | null
          scenario_unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          base_unit_cost_override?: number | null
          contingency_pct?: number | null
          created_at?: string | null
          id?: string
          line_item_id: string
          notes?: string | null
          overhead_pct?: number | null
          pricing_scenario_id: string
          productivity_factor_override?: number | null
          profit_pct?: number | null
          risk_load_pct?: number | null
          scenario_extended_price?: number | null
          scenario_unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          base_unit_cost_override?: number | null
          contingency_pct?: number | null
          created_at?: string | null
          id?: string
          line_item_id?: string
          notes?: string | null
          overhead_pct?: number | null
          pricing_scenario_id?: string
          productivity_factor_override?: number | null
          profit_pct?: number | null
          risk_load_pct?: number | null
          scenario_extended_price?: number | null
          scenario_unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_item_pricing_scenarios_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_pricing_scenarios_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_pricing_scenarios_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_pricing_scenarios_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_item_pricing_scenarios_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_item_pricing_scenarios_pricing_scenario_id_fkey"
            columns: ["pricing_scenario_id"]
            isOneToOne: false
            referencedRelation: "bid_pricing_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_item_pricing_scenarios_pricing_scenario_id_fkey"
            columns: ["pricing_scenario_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["scenario_id"]
          },
        ]
      }
      bid_learning_feedback: {
        Row: {
          bid_project_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type:
            | Database["public"]["Enums"]["correction_entity_enum"]
            | null
          estimated_time_saved_minutes: number | null
          feedback_text: string | null
          feedback_type: string
          id: string
          organization_id: string
          processed_at: string | null
          processed_for_learning: boolean | null
          rating: Database["public"]["Enums"]["feedback_rating_enum"]
          rating_numeric: number | null
          submitted_by: string | null
          suggestions: string | null
          what_needs_improvement: string | null
          what_was_good: string | null
          would_use_again: boolean | null
        }
        Insert: {
          bid_project_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?:
            | Database["public"]["Enums"]["correction_entity_enum"]
            | null
          estimated_time_saved_minutes?: number | null
          feedback_text?: string | null
          feedback_type: string
          id?: string
          organization_id: string
          processed_at?: string | null
          processed_for_learning?: boolean | null
          rating: Database["public"]["Enums"]["feedback_rating_enum"]
          rating_numeric?: number | null
          submitted_by?: string | null
          suggestions?: string | null
          what_needs_improvement?: string | null
          what_was_good?: string | null
          would_use_again?: boolean | null
        }
        Update: {
          bid_project_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?:
            | Database["public"]["Enums"]["correction_entity_enum"]
            | null
          estimated_time_saved_minutes?: number | null
          feedback_text?: string | null
          feedback_type?: string
          id?: string
          organization_id?: string
          processed_at?: string | null
          processed_for_learning?: boolean | null
          rating?: Database["public"]["Enums"]["feedback_rating_enum"]
          rating_numeric?: number | null
          submitted_by?: string | null
          suggestions?: string | null
          what_needs_improvement?: string | null
          what_was_good?: string | null
          would_use_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_learning_feedback_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_learning_feedback_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_learning_feedback_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_learning_feedback_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_learning_feedback_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_learning_feedback_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_learning_feedback_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_learning_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_learning_feedback_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_line_item_price_changes: {
        Row: {
          batch_description: string | null
          batch_id: string | null
          change_origin: string | null
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          line_item_id: string
          new_base_unit_cost: number | null
          new_estimation_method:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          new_extended: number | null
          new_markups: Json | null
          new_price_source:
            | Database["public"]["Enums"]["price_source_enum"]
            | null
          new_quantity: number | null
          new_unit_price: number | null
          old_base_unit_cost: number | null
          old_estimation_method:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          old_extended: number | null
          old_markups: Json | null
          old_price_source:
            | Database["public"]["Enums"]["price_source_enum"]
            | null
          old_quantity: number | null
          old_unit_price: number | null
          pricing_scenario_id: string | null
        }
        Insert: {
          batch_description?: string | null
          batch_id?: string | null
          change_origin?: string | null
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          line_item_id: string
          new_base_unit_cost?: number | null
          new_estimation_method?:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          new_extended?: number | null
          new_markups?: Json | null
          new_price_source?:
            | Database["public"]["Enums"]["price_source_enum"]
            | null
          new_quantity?: number | null
          new_unit_price?: number | null
          old_base_unit_cost?: number | null
          old_estimation_method?:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          old_extended?: number | null
          old_markups?: Json | null
          old_price_source?:
            | Database["public"]["Enums"]["price_source_enum"]
            | null
          old_quantity?: number | null
          old_unit_price?: number | null
          pricing_scenario_id?: string | null
        }
        Update: {
          batch_description?: string | null
          batch_id?: string | null
          change_origin?: string | null
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          line_item_id?: string
          new_base_unit_cost?: number | null
          new_estimation_method?:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          new_extended?: number | null
          new_markups?: Json | null
          new_price_source?:
            | Database["public"]["Enums"]["price_source_enum"]
            | null
          new_quantity?: number | null
          new_unit_price?: number | null
          old_base_unit_cost?: number | null
          old_estimation_method?:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          old_extended?: number | null
          old_markups?: Json | null
          old_price_source?:
            | Database["public"]["Enums"]["price_source_enum"]
            | null
          old_quantity?: number | null
          old_unit_price?: number | null
          pricing_scenario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_line_item_price_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_item_price_changes_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_item_price_changes_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_item_price_changes_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_item_price_changes_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_line_item_price_changes_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_line_item_price_changes_pricing_scenario_id_fkey"
            columns: ["pricing_scenario_id"]
            isOneToOne: false
            referencedRelation: "bid_pricing_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_item_price_changes_pricing_scenario_id_fkey"
            columns: ["pricing_scenario_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["scenario_id"]
          },
        ]
      }
      bid_line_items: {
        Row: {
          ai_categorization_confidence: number | null
          ai_confidence_score: number | null
          ai_suggested_unit_price: number | null
          alt_item_number: string | null
          base_extended_cost: number | null
          base_unit_cost: number | null
          bid_project_id: string
          calculation_method: string | null
          calculation_percentage: number | null
          category_overridden: boolean | null
          contingency_pct: number | null
          created_at: string | null
          depends_on_items: string[] | null
          description: string
          estimation_method:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          estimator_notes: string | null
          final_extended_price: number | null
          final_unit_price: number | null
          governing_plan_sheets: string[] | null
          governing_spec_sections: string[] | null
          governing_special_provisions: string[] | null
          historical_item_id: string | null
          historical_project_id: string | null
          historical_unit_price: number | null
          id: string
          item_number: string
          line_number: number
          opportunity_explanation: string | null
          opportunity_flag:
            | Database["public"]["Enums"]["opportunity_type_enum"]
            | null
          original_ai_category:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
          overhead_pct: number | null
          overridden_at: string | null
          overridden_by: string | null
          override_reason: string | null
          price_source: Database["public"]["Enums"]["price_source_enum"] | null
          pricing_assumptions: string | null
          pricing_reviewed: boolean | null
          pricing_reviewed_at: string | null
          pricing_reviewed_by: string | null
          profit_pct: number | null
          quantity: number
          required_by_items: string[] | null
          review_priority_score: number | null
          risk_explanation: string | null
          risk_level: Database["public"]["Enums"]["severity_enum"] | null
          short_description: string | null
          structure_id: string | null
          structure_or_area: string | null
          subcontractor_name: string | null
          subcontractor_quote_id: string | null
          unit: string
          unit_cost_breakdown: Json | null
          updated_at: string | null
          work_category:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
        }
        Insert: {
          ai_categorization_confidence?: number | null
          ai_confidence_score?: number | null
          ai_suggested_unit_price?: number | null
          alt_item_number?: string | null
          base_extended_cost?: number | null
          base_unit_cost?: number | null
          bid_project_id: string
          calculation_method?: string | null
          calculation_percentage?: number | null
          category_overridden?: boolean | null
          contingency_pct?: number | null
          created_at?: string | null
          depends_on_items?: string[] | null
          description: string
          estimation_method?:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          estimator_notes?: string | null
          final_extended_price?: number | null
          final_unit_price?: number | null
          governing_plan_sheets?: string[] | null
          governing_spec_sections?: string[] | null
          governing_special_provisions?: string[] | null
          historical_item_id?: string | null
          historical_project_id?: string | null
          historical_unit_price?: number | null
          id?: string
          item_number: string
          line_number: number
          opportunity_explanation?: string | null
          opportunity_flag?:
            | Database["public"]["Enums"]["opportunity_type_enum"]
            | null
          original_ai_category?:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
          overhead_pct?: number | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          price_source?: Database["public"]["Enums"]["price_source_enum"] | null
          pricing_assumptions?: string | null
          pricing_reviewed?: boolean | null
          pricing_reviewed_at?: string | null
          pricing_reviewed_by?: string | null
          profit_pct?: number | null
          quantity: number
          required_by_items?: string[] | null
          review_priority_score?: number | null
          risk_explanation?: string | null
          risk_level?: Database["public"]["Enums"]["severity_enum"] | null
          short_description?: string | null
          structure_id?: string | null
          structure_or_area?: string | null
          subcontractor_name?: string | null
          subcontractor_quote_id?: string | null
          unit: string
          unit_cost_breakdown?: Json | null
          updated_at?: string | null
          work_category?:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
        }
        Update: {
          ai_categorization_confidence?: number | null
          ai_confidence_score?: number | null
          ai_suggested_unit_price?: number | null
          alt_item_number?: string | null
          base_extended_cost?: number | null
          base_unit_cost?: number | null
          bid_project_id?: string
          calculation_method?: string | null
          calculation_percentage?: number | null
          category_overridden?: boolean | null
          contingency_pct?: number | null
          created_at?: string | null
          depends_on_items?: string[] | null
          description?: string
          estimation_method?:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          estimator_notes?: string | null
          final_extended_price?: number | null
          final_unit_price?: number | null
          governing_plan_sheets?: string[] | null
          governing_spec_sections?: string[] | null
          governing_special_provisions?: string[] | null
          historical_item_id?: string | null
          historical_project_id?: string | null
          historical_unit_price?: number | null
          id?: string
          item_number?: string
          line_number?: number
          opportunity_explanation?: string | null
          opportunity_flag?:
            | Database["public"]["Enums"]["opportunity_type_enum"]
            | null
          original_ai_category?:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
          overhead_pct?: number | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          price_source?: Database["public"]["Enums"]["price_source_enum"] | null
          pricing_assumptions?: string | null
          pricing_reviewed?: boolean | null
          pricing_reviewed_at?: string | null
          pricing_reviewed_by?: string | null
          profit_pct?: number | null
          quantity?: number
          required_by_items?: string[] | null
          review_priority_score?: number | null
          risk_explanation?: string | null
          risk_level?: Database["public"]["Enums"]["severity_enum"] | null
          short_description?: string | null
          structure_id?: string | null
          structure_or_area?: string | null
          subcontractor_name?: string | null
          subcontractor_quote_id?: string | null
          unit?: string
          unit_cost_breakdown?: Json | null
          updated_at?: string | null
          work_category?:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_pricing_reviewed_by_fkey"
            columns: ["pricing_reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "bid_bridge_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      bid_mot_phasing_summaries: {
        Row: {
          access_summary: string | null
          ai_confidence: number | null
          ai_generated: boolean | null
          bid_project_id: string
          crane_setup_notes: string | null
          created_at: string | null
          day_of_week_restrictions: string | null
          equipment_constraints: string | null
          holiday_restrictions: string | null
          id: string
          material_delivery_constraints: string | null
          mot_strategy_summary: string
          review_notes: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          seasonal_restrictions: string | null
          source_document_ids: string[] | null
          source_sheet_numbers: string | null
          staging_area_notes: string | null
          temporary_drainage_required: string | null
          temporary_pavement_required: string | null
          temporary_structures_required: string | null
          time_of_day_restrictions: string | null
          total_phases: number | null
          traffic_control_type: string | null
          updated_at: string | null
        }
        Insert: {
          access_summary?: string | null
          ai_confidence?: number | null
          ai_generated?: boolean | null
          bid_project_id: string
          crane_setup_notes?: string | null
          created_at?: string | null
          day_of_week_restrictions?: string | null
          equipment_constraints?: string | null
          holiday_restrictions?: string | null
          id?: string
          material_delivery_constraints?: string | null
          mot_strategy_summary: string
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seasonal_restrictions?: string | null
          source_document_ids?: string[] | null
          source_sheet_numbers?: string | null
          staging_area_notes?: string | null
          temporary_drainage_required?: string | null
          temporary_pavement_required?: string | null
          temporary_structures_required?: string | null
          time_of_day_restrictions?: string | null
          total_phases?: number | null
          traffic_control_type?: string | null
          updated_at?: string | null
        }
        Update: {
          access_summary?: string | null
          ai_confidence?: number | null
          ai_generated?: boolean | null
          bid_project_id?: string
          crane_setup_notes?: string | null
          created_at?: string | null
          day_of_week_restrictions?: string | null
          equipment_constraints?: string | null
          holiday_restrictions?: string | null
          id?: string
          material_delivery_constraints?: string | null
          mot_strategy_summary?: string
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seasonal_restrictions?: string | null
          source_document_ids?: string[] | null
          source_sheet_numbers?: string | null
          staging_area_notes?: string | null
          temporary_drainage_required?: string | null
          temporary_pavement_required?: string | null
          temporary_structures_required?: string | null
          time_of_day_restrictions?: string | null
          total_phases?: number | null
          traffic_control_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_mot_phasing_summaries_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_mot_phasing_summaries_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_mot_phasing_summaries_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_mot_phasing_summaries_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_mot_phasing_summaries_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_mot_phasing_summaries_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_mot_phasing_summaries_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_mot_phasing_summaries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_outcomes: {
        Row: {
          actual_profit_margin: number | null
          ai_predicted_win_probability: number | null
          ai_predicted_winning_amount: number | null
          bid_project_id: string
          created_at: string | null
          final_contract_value: number | null
          id: string
          learning_insights: Json | null
          lessons_learned: string | null
          loss_reason: string | null
          our_bid_amount: number | null
          our_bid_rank: number | null
          prediction_accuracy_score: number | null
          processed_for_learning: boolean | null
          project_completion_date: string | null
          project_success_rating: number | null
          recorded_by: string | null
          result: Database["public"]["Enums"]["bid_result_enum"]
          result_date: string | null
          risks_that_materialized: string[] | null
          spread_percentage: number | null
          total_bidders: number | null
          unforeseen_issues: string | null
          updated_at: string | null
          winning_bid_amount: number | null
          winning_bidder_name: string | null
        }
        Insert: {
          actual_profit_margin?: number | null
          ai_predicted_win_probability?: number | null
          ai_predicted_winning_amount?: number | null
          bid_project_id: string
          created_at?: string | null
          final_contract_value?: number | null
          id?: string
          learning_insights?: Json | null
          lessons_learned?: string | null
          loss_reason?: string | null
          our_bid_amount?: number | null
          our_bid_rank?: number | null
          prediction_accuracy_score?: number | null
          processed_for_learning?: boolean | null
          project_completion_date?: string | null
          project_success_rating?: number | null
          recorded_by?: string | null
          result: Database["public"]["Enums"]["bid_result_enum"]
          result_date?: string | null
          risks_that_materialized?: string[] | null
          spread_percentage?: number | null
          total_bidders?: number | null
          unforeseen_issues?: string | null
          updated_at?: string | null
          winning_bid_amount?: number | null
          winning_bidder_name?: string | null
        }
        Update: {
          actual_profit_margin?: number | null
          ai_predicted_win_probability?: number | null
          ai_predicted_winning_amount?: number | null
          bid_project_id?: string
          created_at?: string | null
          final_contract_value?: number | null
          id?: string
          learning_insights?: Json | null
          lessons_learned?: string | null
          loss_reason?: string | null
          our_bid_amount?: number | null
          our_bid_rank?: number | null
          prediction_accuracy_score?: number | null
          processed_for_learning?: boolean | null
          project_completion_date?: string | null
          project_success_rating?: number | null
          recorded_by?: string | null
          result?: Database["public"]["Enums"]["bid_result_enum"]
          result_date?: string | null
          risks_that_materialized?: string[] | null
          spread_percentage?: number | null
          total_bidders?: number | null
          unforeseen_issues?: string | null
          updated_at?: string | null
          winning_bid_amount?: number | null
          winning_bidder_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_outcomes_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_outcomes_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_outcomes_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_outcomes_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_outcomes_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_outcomes_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_outcomes_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_outcomes_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_prebid_question_items: {
        Row: {
          ai_confidence: number | null
          ai_linked: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          impact_description: string | null
          impact_type: string | null
          line_item_id: string
          potential_cost_impact: number | null
          prebid_question_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_linked?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          impact_description?: string | null
          impact_type?: string | null
          line_item_id: string
          potential_cost_impact?: number | null
          prebid_question_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_linked?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          impact_description?: string | null
          impact_type?: string | null
          line_item_id?: string
          potential_cost_impact?: number | null
          prebid_question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_prebid_question_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_question_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_question_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_question_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_question_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_prebid_question_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_prebid_question_items_prebid_question_id_fkey"
            columns: ["prebid_question_id"]
            isOneToOne: false
            referencedRelation: "bid_prebid_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_prebid_questions: {
        Row: {
          ai_confidence: number | null
          ai_generated: boolean | null
          bid_project_id: string
          category: Database["public"]["Enums"]["risk_category_enum"] | null
          created_at: string | null
          edit_reason: string | null
          edited_at: string | null
          edited_by: string | null
          id: string
          justification: string | null
          linked_line_item_id: string | null
          linked_risk_id: string | null
          original_ai_text: string | null
          question_number: string | null
          question_text: string
          response_document_id: string | null
          response_received_at: string | null
          response_text: string | null
          source_document_id: string | null
          source_page_numbers: string | null
          source_text: string | null
          status: Database["public"]["Enums"]["question_status_enum"] | null
          submission_method: string | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_generated?: boolean | null
          bid_project_id: string
          category?: Database["public"]["Enums"]["risk_category_enum"] | null
          created_at?: string | null
          edit_reason?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          justification?: string | null
          linked_line_item_id?: string | null
          linked_risk_id?: string | null
          original_ai_text?: string | null
          question_number?: string | null
          question_text: string
          response_document_id?: string | null
          response_received_at?: string | null
          response_text?: string | null
          source_document_id?: string | null
          source_page_numbers?: string | null
          source_text?: string | null
          status?: Database["public"]["Enums"]["question_status_enum"] | null
          submission_method?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_generated?: boolean | null
          bid_project_id?: string
          category?: Database["public"]["Enums"]["risk_category_enum"] | null
          created_at?: string | null
          edit_reason?: string | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          justification?: string | null
          linked_line_item_id?: string | null
          linked_risk_id?: string | null
          original_ai_text?: string | null
          question_number?: string | null
          question_text?: string
          response_document_id?: string | null
          response_received_at?: string | null
          response_text?: string | null
          source_document_id?: string | null
          source_page_numbers?: string | null
          source_text?: string | null
          status?: Database["public"]["Enums"]["question_status_enum"] | null
          submission_method?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_prebid_questions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_linked_line_item_id_fkey"
            columns: ["linked_line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_linked_line_item_id_fkey"
            columns: ["linked_line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_linked_line_item_id_fkey"
            columns: ["linked_line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_linked_line_item_id_fkey"
            columns: ["linked_line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_linked_line_item_id_fkey"
            columns: ["linked_line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_linked_risk_id_fkey"
            columns: ["linked_risk_id"]
            isOneToOne: false
            referencedRelation: "bid_project_risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_response_document_id_fkey"
            columns: ["response_document_id"]
            isOneToOne: false
            referencedRelation: "bid_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "bid_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_prebid_questions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_pricing_scenarios: {
        Row: {
          assumptions: string | null
          bid_project_id: string
          created_at: string | null
          created_by: string | null
          default_contingency_pct: number | null
          default_overhead_pct: number | null
          default_profit_pct: number | null
          default_risk_load_pct: number | null
          description: string | null
          effective_margin_pct: number | null
          id: string
          is_locked: boolean | null
          is_primary: boolean | null
          name: string
          scenario_type: Database["public"]["Enums"]["pricing_scenario_type_enum"]
          strategy_notes: string | null
          total_base_cost: number | null
          total_with_markups: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          assumptions?: string | null
          bid_project_id: string
          created_at?: string | null
          created_by?: string | null
          default_contingency_pct?: number | null
          default_overhead_pct?: number | null
          default_profit_pct?: number | null
          default_risk_load_pct?: number | null
          description?: string | null
          effective_margin_pct?: number | null
          id?: string
          is_locked?: boolean | null
          is_primary?: boolean | null
          name: string
          scenario_type: Database["public"]["Enums"]["pricing_scenario_type_enum"]
          strategy_notes?: string | null
          total_base_cost?: number | null
          total_with_markups?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          assumptions?: string | null
          bid_project_id?: string
          created_at?: string | null
          created_by?: string | null
          default_contingency_pct?: number | null
          default_overhead_pct?: number | null
          default_profit_pct?: number | null
          default_risk_load_pct?: number | null
          description?: string | null
          effective_margin_pct?: number | null
          id?: string
          is_locked?: boolean | null
          is_primary?: boolean | null
          name?: string
          scenario_type?: Database["public"]["Enums"]["pricing_scenario_type_enum"]
          strategy_notes?: string | null
          total_base_cost?: number | null
          total_with_markups?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_pricing_scenarios_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_pricing_scenarios_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_pricing_scenarios_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_pricing_scenarios_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_pricing_scenarios_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_pricing_scenarios_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_pricing_scenarios_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_pricing_scenarios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_pricing_scenarios_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_project_conditions: {
        Row: {
          aadt: number | null
          access_notes: string | null
          ai_confidence_score: number | null
          bid_project_id: string
          created_at: string | null
          cultural_resources: boolean | null
          detour_length_miles: number | null
          detour_required: boolean | null
          endangered_species: boolean | null
          environmental_notes: string | null
          floodplain_notes: string | null
          id: string
          in_floodplain: boolean | null
          in_water_notes: string | null
          in_water_work: boolean | null
          in_water_work_window_end: string | null
          in_water_work_window_start: string | null
          limited_access: boolean | null
          night_work_notes: string | null
          night_work_required: boolean | null
          railroad_company: string | null
          railroad_involvement: boolean | null
          railroad_notes: string | null
          seasonal_notes: string | null
          seasonal_restriction_end: string | null
          seasonal_restriction_start: string | null
          seasonal_restrictions: boolean | null
          source_document_id: string | null
          source_page_numbers: string | null
          steep_terrain: boolean | null
          terrain_notes: string | null
          traffic_regime: string | null
          updated_at: string | null
          urban_area: boolean | null
          urban_notes: string | null
          utility_companies: string[] | null
          utility_notes: string | null
          utility_relocations_required: boolean | null
          weekend_notes: string | null
          weekend_work_restricted: boolean | null
          wetlands_present: boolean | null
        }
        Insert: {
          aadt?: number | null
          access_notes?: string | null
          ai_confidence_score?: number | null
          bid_project_id: string
          created_at?: string | null
          cultural_resources?: boolean | null
          detour_length_miles?: number | null
          detour_required?: boolean | null
          endangered_species?: boolean | null
          environmental_notes?: string | null
          floodplain_notes?: string | null
          id?: string
          in_floodplain?: boolean | null
          in_water_notes?: string | null
          in_water_work?: boolean | null
          in_water_work_window_end?: string | null
          in_water_work_window_start?: string | null
          limited_access?: boolean | null
          night_work_notes?: string | null
          night_work_required?: boolean | null
          railroad_company?: string | null
          railroad_involvement?: boolean | null
          railroad_notes?: string | null
          seasonal_notes?: string | null
          seasonal_restriction_end?: string | null
          seasonal_restriction_start?: string | null
          seasonal_restrictions?: boolean | null
          source_document_id?: string | null
          source_page_numbers?: string | null
          steep_terrain?: boolean | null
          terrain_notes?: string | null
          traffic_regime?: string | null
          updated_at?: string | null
          urban_area?: boolean | null
          urban_notes?: string | null
          utility_companies?: string[] | null
          utility_notes?: string | null
          utility_relocations_required?: boolean | null
          weekend_notes?: string | null
          weekend_work_restricted?: boolean | null
          wetlands_present?: boolean | null
        }
        Update: {
          aadt?: number | null
          access_notes?: string | null
          ai_confidence_score?: number | null
          bid_project_id?: string
          created_at?: string | null
          cultural_resources?: boolean | null
          detour_length_miles?: number | null
          detour_required?: boolean | null
          endangered_species?: boolean | null
          environmental_notes?: string | null
          floodplain_notes?: string | null
          id?: string
          in_floodplain?: boolean | null
          in_water_notes?: string | null
          in_water_work?: boolean | null
          in_water_work_window_end?: string | null
          in_water_work_window_start?: string | null
          limited_access?: boolean | null
          night_work_notes?: string | null
          night_work_required?: boolean | null
          railroad_company?: string | null
          railroad_involvement?: boolean | null
          railroad_notes?: string | null
          seasonal_notes?: string | null
          seasonal_restriction_end?: string | null
          seasonal_restriction_start?: string | null
          seasonal_restrictions?: boolean | null
          source_document_id?: string | null
          source_page_numbers?: string | null
          steep_terrain?: boolean | null
          terrain_notes?: string | null
          traffic_regime?: string | null
          updated_at?: string | null
          urban_area?: boolean | null
          urban_notes?: string | null
          utility_companies?: string[] | null
          utility_notes?: string | null
          utility_relocations_required?: boolean | null
          weekend_notes?: string | null
          weekend_work_restricted?: boolean | null
          wetlands_present?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_project_conditions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_project_conditions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_conditions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_conditions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_conditions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_project_conditions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_conditions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: true
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_conditions_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "bid_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_project_opportunities: {
        Row: {
          action_notes: string | null
          ai_confidence: number | null
          ai_generated: boolean | null
          bid_project_id: string
          created_at: string | null
          description: string
          id: string
          implementation_difficulty:
            | Database["public"]["Enums"]["severity_enum"]
            | null
          opportunity_number: string | null
          opportunity_type: Database["public"]["Enums"]["opportunity_type_enum"]
          potential_savings_high: number | null
          potential_savings_low: number | null
          requires_prebid_question: boolean | null
          requires_ve_proposal: boolean | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_document_id: string | null
          source_page_numbers: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_notes?: string | null
          ai_confidence?: number | null
          ai_generated?: boolean | null
          bid_project_id: string
          created_at?: string | null
          description: string
          id?: string
          implementation_difficulty?:
            | Database["public"]["Enums"]["severity_enum"]
            | null
          opportunity_number?: string | null
          opportunity_type: Database["public"]["Enums"]["opportunity_type_enum"]
          potential_savings_high?: number | null
          potential_savings_low?: number | null
          requires_prebid_question?: boolean | null
          requires_ve_proposal?: boolean | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_document_id?: string | null
          source_page_numbers?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_notes?: string | null
          ai_confidence?: number | null
          ai_generated?: boolean | null
          bid_project_id?: string
          created_at?: string | null
          description?: string
          id?: string
          implementation_difficulty?:
            | Database["public"]["Enums"]["severity_enum"]
            | null
          opportunity_number?: string | null
          opportunity_type?: Database["public"]["Enums"]["opportunity_type_enum"]
          potential_savings_high?: number | null
          potential_savings_low?: number | null
          requires_prebid_question?: boolean | null
          requires_ve_proposal?: boolean | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_document_id?: string | null
          source_page_numbers?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_project_opportunities_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_project_opportunities_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_opportunities_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_opportunities_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_opportunities_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_project_opportunities_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_opportunities_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_opportunities_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_project_opportunities_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "bid_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_project_risks: {
        Row: {
          action_notes: string | null
          ai_confidence: number | null
          ai_generated: boolean | null
          ai_reasoning: string | null
          bid_project_id: string
          category: Database["public"]["Enums"]["risk_category_enum"]
          contingency_percentage: number | null
          contingency_recommended: boolean | null
          cost_impact: Database["public"]["Enums"]["severity_enum"]
          created_at: string | null
          description: string
          estimated_cost_impact_high: number | null
          estimated_cost_impact_low: number | null
          estimated_schedule_impact_days: number | null
          estimated_value_high: number | null
          estimated_value_low: number | null
          id: string
          implementation_difficulty:
            | Database["public"]["Enums"]["severity_enum"]
            | null
          mitigation_owner: string | null
          mitigation_strategy: string | null
          overall_severity: Database["public"]["Enums"]["severity_enum"]
          owner_vs_contractor:
            | Database["public"]["Enums"]["risk_ownership_enum"]
            | null
          prebid_question_recommended: boolean | null
          probability: Database["public"]["Enums"]["severity_enum"]
          recommended_mitigation: string | null
          requires_prebid_question: boolean | null
          requires_ve_proposal: boolean | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_number: string | null
          schedule_impact: Database["public"]["Enums"]["severity_enum"]
          source_document_id: string | null
          source_page_numbers: string | null
          source_text_excerpt: string | null
          suggested_question: string | null
          title: string
          type: Database["public"]["Enums"]["risk_type_enum"]
          updated_at: string | null
        }
        Insert: {
          action_notes?: string | null
          ai_confidence?: number | null
          ai_generated?: boolean | null
          ai_reasoning?: string | null
          bid_project_id: string
          category: Database["public"]["Enums"]["risk_category_enum"]
          contingency_percentage?: number | null
          contingency_recommended?: boolean | null
          cost_impact: Database["public"]["Enums"]["severity_enum"]
          created_at?: string | null
          description: string
          estimated_cost_impact_high?: number | null
          estimated_cost_impact_low?: number | null
          estimated_schedule_impact_days?: number | null
          estimated_value_high?: number | null
          estimated_value_low?: number | null
          id?: string
          implementation_difficulty?:
            | Database["public"]["Enums"]["severity_enum"]
            | null
          mitigation_owner?: string | null
          mitigation_strategy?: string | null
          overall_severity: Database["public"]["Enums"]["severity_enum"]
          owner_vs_contractor?:
            | Database["public"]["Enums"]["risk_ownership_enum"]
            | null
          prebid_question_recommended?: boolean | null
          probability: Database["public"]["Enums"]["severity_enum"]
          recommended_mitigation?: string | null
          requires_prebid_question?: boolean | null
          requires_ve_proposal?: boolean | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_number?: string | null
          schedule_impact: Database["public"]["Enums"]["severity_enum"]
          source_document_id?: string | null
          source_page_numbers?: string | null
          source_text_excerpt?: string | null
          suggested_question?: string | null
          title: string
          type?: Database["public"]["Enums"]["risk_type_enum"]
          updated_at?: string | null
        }
        Update: {
          action_notes?: string | null
          ai_confidence?: number | null
          ai_generated?: boolean | null
          ai_reasoning?: string | null
          bid_project_id?: string
          category?: Database["public"]["Enums"]["risk_category_enum"]
          contingency_percentage?: number | null
          contingency_recommended?: boolean | null
          cost_impact?: Database["public"]["Enums"]["severity_enum"]
          created_at?: string | null
          description?: string
          estimated_cost_impact_high?: number | null
          estimated_cost_impact_low?: number | null
          estimated_schedule_impact_days?: number | null
          estimated_value_high?: number | null
          estimated_value_low?: number | null
          id?: string
          implementation_difficulty?:
            | Database["public"]["Enums"]["severity_enum"]
            | null
          mitigation_owner?: string | null
          mitigation_strategy?: string | null
          overall_severity?: Database["public"]["Enums"]["severity_enum"]
          owner_vs_contractor?:
            | Database["public"]["Enums"]["risk_ownership_enum"]
            | null
          prebid_question_recommended?: boolean | null
          probability?: Database["public"]["Enums"]["severity_enum"]
          recommended_mitigation?: string | null
          requires_prebid_question?: boolean | null
          requires_ve_proposal?: boolean | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_number?: string | null
          schedule_impact?: Database["public"]["Enums"]["severity_enum"]
          source_document_id?: string | null
          source_page_numbers?: string | null
          source_text_excerpt?: string | null
          suggested_question?: string | null
          title?: string
          type?: Database["public"]["Enums"]["risk_type_enum"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_project_risks_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_project_risks_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_risks_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_risks_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_risks_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_project_risks_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_risks_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_project_risks_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_project_risks_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "bid_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_projects: {
        Row: {
          active_project_id: string | null
          ai_analysis_completed_at: string | null
          ai_analysis_started_at: string | null
          ai_analysis_version: string | null
          assigned_estimator_id: string | null
          assigned_pm_id: string | null
          bid_amount: number | null
          bid_due_date: string | null
          completion_date: string | null
          contract_id: string | null
          contract_time_days: number | null
          contract_time_type: string | null
          county: string | null
          created_at: string | null
          created_by: string | null
          dbe_goal_percentage: number | null
          engineers_estimate: number | null
          environmental_sensitivity:
            | Database["public"]["Enums"]["complexity_enum"]
            | null
          environmental_sensitivity_reason: string | null
          federal_project_number: string | null
          id: string
          is_federal_aid: boolean | null
          latitude: number | null
          letting_date: string | null
          liquidated_damages_per_day: number | null
          location_description: string | null
          longitude: number | null
          organization_id: string
          overall_complexity:
            | Database["public"]["Enums"]["complexity_enum"]
            | null
          owner: string | null
          owner_contact: string | null
          owner_email: string | null
          owner_phone: string | null
          prebid_meeting_date: string | null
          project_name: string
          question_deadline: string | null
          route: string | null
          state_project_number: string | null
          status: Database["public"]["Enums"]["bid_status_enum"] | null
          traffic_control_complexity:
            | Database["public"]["Enums"]["complexity_enum"]
            | null
          traffic_control_complexity_reason: string | null
          updated_at: string | null
          updated_by: string | null
          winner_name: string | null
          winning_bid_amount: number | null
        }
        Insert: {
          active_project_id?: string | null
          ai_analysis_completed_at?: string | null
          ai_analysis_started_at?: string | null
          ai_analysis_version?: string | null
          assigned_estimator_id?: string | null
          assigned_pm_id?: string | null
          bid_amount?: number | null
          bid_due_date?: string | null
          completion_date?: string | null
          contract_id?: string | null
          contract_time_days?: number | null
          contract_time_type?: string | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          dbe_goal_percentage?: number | null
          engineers_estimate?: number | null
          environmental_sensitivity?:
            | Database["public"]["Enums"]["complexity_enum"]
            | null
          environmental_sensitivity_reason?: string | null
          federal_project_number?: string | null
          id?: string
          is_federal_aid?: boolean | null
          latitude?: number | null
          letting_date?: string | null
          liquidated_damages_per_day?: number | null
          location_description?: string | null
          longitude?: number | null
          organization_id: string
          overall_complexity?:
            | Database["public"]["Enums"]["complexity_enum"]
            | null
          owner?: string | null
          owner_contact?: string | null
          owner_email?: string | null
          owner_phone?: string | null
          prebid_meeting_date?: string | null
          project_name: string
          question_deadline?: string | null
          route?: string | null
          state_project_number?: string | null
          status?: Database["public"]["Enums"]["bid_status_enum"] | null
          traffic_control_complexity?:
            | Database["public"]["Enums"]["complexity_enum"]
            | null
          traffic_control_complexity_reason?: string | null
          updated_at?: string | null
          updated_by?: string | null
          winner_name?: string | null
          winning_bid_amount?: number | null
        }
        Update: {
          active_project_id?: string | null
          ai_analysis_completed_at?: string | null
          ai_analysis_started_at?: string | null
          ai_analysis_version?: string | null
          assigned_estimator_id?: string | null
          assigned_pm_id?: string | null
          bid_amount?: number | null
          bid_due_date?: string | null
          completion_date?: string | null
          contract_id?: string | null
          contract_time_days?: number | null
          contract_time_type?: string | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          dbe_goal_percentage?: number | null
          engineers_estimate?: number | null
          environmental_sensitivity?:
            | Database["public"]["Enums"]["complexity_enum"]
            | null
          environmental_sensitivity_reason?: string | null
          federal_project_number?: string | null
          id?: string
          is_federal_aid?: boolean | null
          latitude?: number | null
          letting_date?: string | null
          liquidated_damages_per_day?: number | null
          location_description?: string | null
          longitude?: number | null
          organization_id?: string
          overall_complexity?:
            | Database["public"]["Enums"]["complexity_enum"]
            | null
          owner?: string | null
          owner_contact?: string | null
          owner_email?: string | null
          owner_phone?: string | null
          prebid_meeting_date?: string | null
          project_name?: string
          question_deadline?: string | null
          route?: string | null
          state_project_number?: string | null
          status?: Database["public"]["Enums"]["bid_status_enum"] | null
          traffic_control_complexity?:
            | Database["public"]["Enums"]["complexity_enum"]
            | null
          traffic_control_complexity_reason?: string | null
          updated_at?: string | null
          updated_by?: string | null
          winner_name?: string | null
          winning_bid_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_projects_active_project_id_fkey"
            columns: ["active_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_projects_active_project_id_fkey"
            columns: ["active_project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_projects_active_project_id_fkey"
            columns: ["active_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "bid_projects_active_project_id_fkey"
            columns: ["active_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "bid_projects_active_project_id_fkey"
            columns: ["active_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "bid_projects_active_project_id_fkey"
            columns: ["active_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "bid_projects_assigned_estimator_id_fkey"
            columns: ["assigned_estimator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_projects_assigned_pm_id_fkey"
            columns: ["assigned_pm_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_projects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_proposals: {
        Row: {
          ai_competitive_analysis: Json | null
          ai_recommendations: Json | null
          ai_risk_analysis: Json | null
          bid_due_date: string | null
          bid_no_bid_by: string | null
          bid_no_bid_date: string | null
          bid_no_bid_decision: string | null
          bid_no_bid_reason: string | null
          bid_opening_date: string | null
          call_number: string | null
          composite_risk_score: number | null
          contract_days: number | null
          contract_id: string | null
          contract_months: number | null
          coordinates_lat: number | null
          coordinates_lng: number | null
          county: string | null
          created_at: string | null
          created_by: string | null
          engineer_estimate: number | null
          federal_project_num: string | null
          final_completion_date: string | null
          id: string
          interim_completion_date: string | null
          liquidated_damages_per_day: number | null
          our_rank: number | null
          plans_document_path: string | null
          project_id: string | null
          project_name: string
          proposal_document_path: string | null
          recommended_contingency_pct: number | null
          route_number: string | null
          specifications_document_path: string | null
          state_project_num: string | null
          status: Database["public"]["Enums"]["bid_status_enum"] | null
          submitted_at: string | null
          submitted_by: string | null
          total_bid_amount: number | null
          total_bidders: number | null
          total_direct_cost: number | null
          total_indirect_cost: number | null
          updated_at: string | null
          updated_by: string | null
          winning_bid_price: number | null
          winning_contractor: string | null
        }
        Insert: {
          ai_competitive_analysis?: Json | null
          ai_recommendations?: Json | null
          ai_risk_analysis?: Json | null
          bid_due_date?: string | null
          bid_no_bid_by?: string | null
          bid_no_bid_date?: string | null
          bid_no_bid_decision?: string | null
          bid_no_bid_reason?: string | null
          bid_opening_date?: string | null
          call_number?: string | null
          composite_risk_score?: number | null
          contract_days?: number | null
          contract_id?: string | null
          contract_months?: number | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          engineer_estimate?: number | null
          federal_project_num?: string | null
          final_completion_date?: string | null
          id?: string
          interim_completion_date?: string | null
          liquidated_damages_per_day?: number | null
          our_rank?: number | null
          plans_document_path?: string | null
          project_id?: string | null
          project_name: string
          proposal_document_path?: string | null
          recommended_contingency_pct?: number | null
          route_number?: string | null
          specifications_document_path?: string | null
          state_project_num?: string | null
          status?: Database["public"]["Enums"]["bid_status_enum"] | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_bid_amount?: number | null
          total_bidders?: number | null
          total_direct_cost?: number | null
          total_indirect_cost?: number | null
          updated_at?: string | null
          updated_by?: string | null
          winning_bid_price?: number | null
          winning_contractor?: string | null
        }
        Update: {
          ai_competitive_analysis?: Json | null
          ai_recommendations?: Json | null
          ai_risk_analysis?: Json | null
          bid_due_date?: string | null
          bid_no_bid_by?: string | null
          bid_no_bid_date?: string | null
          bid_no_bid_decision?: string | null
          bid_no_bid_reason?: string | null
          bid_opening_date?: string | null
          call_number?: string | null
          composite_risk_score?: number | null
          contract_days?: number | null
          contract_id?: string | null
          contract_months?: number | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          engineer_estimate?: number | null
          federal_project_num?: string | null
          final_completion_date?: string | null
          id?: string
          interim_completion_date?: string | null
          liquidated_damages_per_day?: number | null
          our_rank?: number | null
          plans_document_path?: string | null
          project_id?: string | null
          project_name?: string
          proposal_document_path?: string | null
          recommended_contingency_pct?: number | null
          route_number?: string | null
          specifications_document_path?: string | null
          state_project_num?: string | null
          status?: Database["public"]["Enums"]["bid_status_enum"] | null
          submitted_at?: string | null
          submitted_by?: string | null
          total_bid_amount?: number | null
          total_bidders?: number | null
          total_direct_cost?: number | null
          total_indirect_cost?: number | null
          updated_at?: string | null
          updated_by?: string | null
          winning_bid_price?: number | null
          winning_contractor?: string | null
        }
        Relationships: []
      }
      bid_risk_item_links: {
        Row: {
          created_at: string | null
          id: string
          line_item_id: string
          notes: string | null
          relationship_type: string | null
          risk_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          line_item_id: string
          notes?: string | null
          relationship_type?: string | null
          risk_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          line_item_id?: string
          notes?: string | null
          relationship_type?: string | null
          risk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_risk_item_links_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_risk_item_links_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_risk_item_links_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_risk_item_links_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_risk_item_links_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_risk_item_links_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "bid_project_risks"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_structure_items: {
        Row: {
          ai_confidence: number | null
          ai_reasoning: string | null
          allocated_quantity: number | null
          allocation_notes: string | null
          allocation_percentage: number | null
          assignment_source: string | null
          created_at: string | null
          created_by: string | null
          id: string
          line_item_id: string
          structure_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          allocated_quantity?: number | null
          allocation_notes?: string | null
          allocation_percentage?: number | null
          assignment_source?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          line_item_id: string
          structure_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_reasoning?: string | null
          allocated_quantity?: number | null
          allocation_notes?: string | null
          allocation_percentage?: number | null
          assignment_source?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          line_item_id?: string
          structure_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_structure_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_structure_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_structure_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_structure_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_structure_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_structure_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_structure_items_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "bid_bridge_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_structure_items_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      bid_work_package_items: {
        Row: {
          ai_suggested_package_id: string | null
          created_at: string | null
          id: string
          line_item_id: string
          manually_assigned: boolean | null
          sort_order: number | null
          work_package_id: string
        }
        Insert: {
          ai_suggested_package_id?: string | null
          created_at?: string | null
          id?: string
          line_item_id: string
          manually_assigned?: boolean | null
          sort_order?: number | null
          work_package_id: string
        }
        Update: {
          ai_suggested_package_id?: string | null
          created_at?: string | null
          id?: string
          line_item_id?: string
          manually_assigned?: boolean | null
          sort_order?: number | null
          work_package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_work_package_items_ai_suggested_package_id_fkey"
            columns: ["ai_suggested_package_id"]
            isOneToOne: false
            referencedRelation: "bid_work_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_package_items_ai_suggested_package_id_fkey"
            columns: ["ai_suggested_package_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["work_package_id"]
          },
          {
            foreignKeyName: "bid_work_package_items_ai_suggested_package_id_fkey"
            columns: ["ai_suggested_package_id"]
            isOneToOne: false
            referencedRelation: "v_bid_work_packages_with_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_package_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: true
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_package_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: true
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_package_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: true
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_package_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: true
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_work_package_items_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: true
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_work_package_items_work_package_id_fkey"
            columns: ["work_package_id"]
            isOneToOne: false
            referencedRelation: "bid_work_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_package_items_work_package_id_fkey"
            columns: ["work_package_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["work_package_id"]
          },
          {
            foreignKeyName: "bid_work_package_items_work_package_id_fkey"
            columns: ["work_package_id"]
            isOneToOne: false
            referencedRelation: "v_bid_work_packages_with_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_work_package_templates: {
        Row: {
          assignment_rules: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          organization_id: string | null
          package_structure: Json
          project_type: string
          template_name: string
          updated_at: string | null
        }
        Insert: {
          assignment_rules?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          organization_id?: string | null
          package_structure: Json
          project_type: string
          template_name: string
          updated_at?: string | null
        }
        Update: {
          assignment_rules?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          organization_id?: string | null
          package_structure?: Json
          project_type?: string
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_work_package_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_work_packages: {
        Row: {
          ai_generated: boolean | null
          assigned_estimator_id: string | null
          bid_project_id: string
          created_at: string | null
          description: string | null
          id: string
          package_code: string | null
          package_name: string
          package_number: number
          sort_order: number | null
          status: string | null
          structure_id: string | null
          total_items: number | null
          updated_at: string | null
          work_category:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
        }
        Insert: {
          ai_generated?: boolean | null
          assigned_estimator_id?: string | null
          bid_project_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          package_code?: string | null
          package_name: string
          package_number: number
          sort_order?: number | null
          status?: string | null
          structure_id?: string | null
          total_items?: number | null
          updated_at?: string | null
          work_category?:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
        }
        Update: {
          ai_generated?: boolean | null
          assigned_estimator_id?: string | null
          bid_project_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          package_code?: string | null
          package_name?: string
          package_number?: number
          sort_order?: number | null
          status?: string | null
          structure_id?: string | null
          total_items?: number | null
          updated_at?: string | null
          work_category?:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_work_packages_assigned_estimator_id_fkey"
            columns: ["assigned_estimator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_work_packages_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "bid_bridge_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_packages_structure_id_fkey"
            columns: ["structure_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["structure_id"]
          },
        ]
      }
      cash_flow_projections: {
        Row: {
          actual_collections: number | null
          actual_net: number | null
          actual_outflows: number | null
          created_at: string | null
          id: string
          organization_id: string
          period_end: string
          period_start: string
          period_type: string
          project_id: string | null
          projected_billings: number | null
          projected_collections: number | null
          projected_ending_balance: number | null
          projected_equipment: number | null
          projected_labor: number | null
          projected_materials: number | null
          projected_net_cash_flow: number | null
          projected_overhead: number | null
          projected_subcontracts: number | null
          projection_date: string
          total_projected_outflows: number | null
          variance_amount: number | null
          variance_percentage: number | null
        }
        Insert: {
          actual_collections?: number | null
          actual_net?: number | null
          actual_outflows?: number | null
          created_at?: string | null
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          period_type: string
          project_id?: string | null
          projected_billings?: number | null
          projected_collections?: number | null
          projected_ending_balance?: number | null
          projected_equipment?: number | null
          projected_labor?: number | null
          projected_materials?: number | null
          projected_net_cash_flow?: number | null
          projected_overhead?: number | null
          projected_subcontracts?: number | null
          projection_date: string
          total_projected_outflows?: number | null
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Update: {
          actual_collections?: number | null
          actual_net?: number | null
          actual_outflows?: number | null
          created_at?: string | null
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          project_id?: string | null
          projected_billings?: number | null
          projected_collections?: number | null
          projected_ending_balance?: number | null
          projected_equipment?: number | null
          projected_labor?: number | null
          projected_materials?: number | null
          projected_net_cash_flow?: number | null
          projected_overhead?: number | null
          projected_subcontracts?: number | null
          projection_date?: string
          total_projected_outflows?: number | null
          variance_amount?: number | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_projections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_projections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_projections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_projections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cash_flow_projections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cash_flow_projections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cash_flow_projections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      certified_payroll_lines: {
        Row: {
          base_hourly_rate: number
          certified_payroll_id: string
          created_at: string
          crew_member_id: string
          deduction_description: string | null
          employee_address: string | null
          employee_last_4_ssn: string | null
          employee_name: string
          federal_tax_deduction: number | null
          fica_deduction: number | null
          fringe_pay: number | null
          fringe_rate: number | null
          gross_pay: number
          hours_day_1: number | null
          hours_day_2: number | null
          hours_day_3: number | null
          hours_day_4: number | null
          hours_day_5: number | null
          hours_day_6: number | null
          hours_day_7: number | null
          id: string
          line_number: number
          net_pay: number
          other_deductions: number | null
          overtime_rate: number | null
          state_tax_deduction: number | null
          time_entry_ids: string[] | null
          total_deductions: number | null
          total_hours: number | null
          total_overtime_hours: number | null
          total_regular_hours: number | null
          trade_classification: string
          work_location: string | null
        }
        Insert: {
          base_hourly_rate: number
          certified_payroll_id: string
          created_at?: string
          crew_member_id: string
          deduction_description?: string | null
          employee_address?: string | null
          employee_last_4_ssn?: string | null
          employee_name: string
          federal_tax_deduction?: number | null
          fica_deduction?: number | null
          fringe_pay?: number | null
          fringe_rate?: number | null
          gross_pay: number
          hours_day_1?: number | null
          hours_day_2?: number | null
          hours_day_3?: number | null
          hours_day_4?: number | null
          hours_day_5?: number | null
          hours_day_6?: number | null
          hours_day_7?: number | null
          id?: string
          line_number: number
          net_pay: number
          other_deductions?: number | null
          overtime_rate?: number | null
          state_tax_deduction?: number | null
          time_entry_ids?: string[] | null
          total_deductions?: number | null
          total_hours?: number | null
          total_overtime_hours?: number | null
          total_regular_hours?: number | null
          trade_classification: string
          work_location?: string | null
        }
        Update: {
          base_hourly_rate?: number
          certified_payroll_id?: string
          created_at?: string
          crew_member_id?: string
          deduction_description?: string | null
          employee_address?: string | null
          employee_last_4_ssn?: string | null
          employee_name?: string
          federal_tax_deduction?: number | null
          fica_deduction?: number | null
          fringe_pay?: number | null
          fringe_rate?: number | null
          gross_pay?: number
          hours_day_1?: number | null
          hours_day_2?: number | null
          hours_day_3?: number | null
          hours_day_4?: number | null
          hours_day_5?: number | null
          hours_day_6?: number | null
          hours_day_7?: number | null
          id?: string
          line_number?: number
          net_pay?: number
          other_deductions?: number | null
          overtime_rate?: number | null
          state_tax_deduction?: number | null
          time_entry_ids?: string[] | null
          total_deductions?: number | null
          total_hours?: number | null
          total_overtime_hours?: number | null
          total_regular_hours?: number | null
          trade_classification?: string
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certified_payroll_lines_certified_payroll_id_fkey"
            columns: ["certified_payroll_id"]
            isOneToOne: false
            referencedRelation: "certified_payrolls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certified_payroll_lines_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certified_payroll_lines_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "v_active_crew"
            referencedColumns: ["id"]
          },
        ]
      }
      certified_payrolls: {
        Row: {
          accepted_at: string | null
          certified_at: string | null
          certified_by: string | null
          certifier_name: string | null
          certifier_title: string | null
          compliance_statement: string | null
          contract_number: string | null
          created_at: string
          created_by: string | null
          federal_aid_number: string | null
          generated_at: string | null
          id: string
          notes: string | null
          organization_id: string
          pay_period_id: string
          payroll_number: number
          pdf_url: string | null
          project_id: string
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          submitted_by: string | null
          submitted_to_wvdoh_at: string | null
          total_deductions: number | null
          total_employees: number | null
          total_gross_pay: number | null
          total_hours: number | null
          total_net_pay: number | null
          updated_at: string
          updated_by: string | null
          week_ending_date: string
          wvdoh_confirmation_number: string | null
        }
        Insert: {
          accepted_at?: string | null
          certified_at?: string | null
          certified_by?: string | null
          certifier_name?: string | null
          certifier_title?: string | null
          compliance_statement?: string | null
          contract_number?: string | null
          created_at?: string
          created_by?: string | null
          federal_aid_number?: string | null
          generated_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          pay_period_id: string
          payroll_number: number
          pdf_url?: string | null
          project_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_by?: string | null
          submitted_to_wvdoh_at?: string | null
          total_deductions?: number | null
          total_employees?: number | null
          total_gross_pay?: number | null
          total_hours?: number | null
          total_net_pay?: number | null
          updated_at?: string
          updated_by?: string | null
          week_ending_date: string
          wvdoh_confirmation_number?: string | null
        }
        Update: {
          accepted_at?: string | null
          certified_at?: string | null
          certified_by?: string | null
          certifier_name?: string | null
          certifier_title?: string | null
          compliance_statement?: string | null
          contract_number?: string | null
          created_at?: string
          created_by?: string | null
          federal_aid_number?: string | null
          generated_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          pay_period_id?: string
          payroll_number?: number
          pdf_url?: string | null
          project_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_by?: string | null
          submitted_to_wvdoh_at?: string | null
          total_deductions?: number | null
          total_employees?: number | null
          total_gross_pay?: number | null
          total_hours?: number | null
          total_net_pay?: number | null
          updated_at?: string
          updated_by?: string | null
          week_ending_date?: string
          wvdoh_confirmation_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certified_payrolls_certified_by_fkey"
            columns: ["certified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certified_payrolls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certified_payrolls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certified_payrolls_pay_period_id_fkey"
            columns: ["pay_period_id"]
            isOneToOne: false
            referencedRelation: "pay_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certified_payrolls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certified_payrolls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certified_payrolls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "certified_payrolls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "certified_payrolls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "certified_payrolls_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "certified_payrolls_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certified_payrolls_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_items: {
        Row: {
          amount: number
          change_order_id: string
          cor_id: string | null
          cost_code: string | null
          created_at: string | null
          description: string
          id: string
          item_number: number
          notes: string | null
          quantity: number | null
          sort_order: number | null
          time_impact_days: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          amount: number
          change_order_id: string
          cor_id?: string | null
          cost_code?: string | null
          created_at?: string | null
          description: string
          id?: string
          item_number: number
          notes?: string | null
          quantity?: number | null
          sort_order?: number | null
          time_impact_days?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          amount?: number
          change_order_id?: string
          cor_id?: string | null
          cost_code?: string | null
          created_at?: string | null
          description?: string
          id?: string
          item_number?: number
          notes?: string | null
          quantity?: number | null
          sort_order?: number | null
          time_impact_days?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_items_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_items_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "v_change_order_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_items_cor_id_fkey"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "change_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_items_cor_id_fkey"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "v_pending_cors"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_pricing_history: {
        Row: {
          change_order_id: string | null
          cor_id: string | null
          counter_amount: number | null
          counter_time_days: number | null
          created_at: string | null
          id: string
          proposed_amount: number
          proposed_time_days: number | null
          responded_at: string | null
          response: string | null
          response_notes: string | null
          round_number: number
          submitted_at: string | null
          submitted_by: string | null
        }
        Insert: {
          change_order_id?: string | null
          cor_id?: string | null
          counter_amount?: number | null
          counter_time_days?: number | null
          created_at?: string | null
          id?: string
          proposed_amount: number
          proposed_time_days?: number | null
          responded_at?: string | null
          response?: string | null
          response_notes?: string | null
          round_number: number
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Update: {
          change_order_id?: string | null
          cor_id?: string | null
          counter_amount?: number | null
          counter_time_days?: number | null
          created_at?: string | null
          id?: string
          proposed_amount?: number
          proposed_time_days?: number | null
          responded_at?: string | null
          response?: string | null
          response_notes?: string | null
          round_number?: number
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_pricing_history_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_pricing_history_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "v_change_order_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_pricing_history_cor_id_fkey"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "change_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_pricing_history_cor_id_fkey"
            columns: ["cor_id"]
            isOneToOne: false
            referencedRelation: "v_pending_cors"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_requests: {
        Row: {
          backup_documents: Json | null
          change_order_id: string | null
          change_type: Database["public"]["Enums"]["change_order_type"]
          cor_number: string
          created_at: string | null
          created_by: string | null
          description: string
          drawing_reference: string | null
          estimated_cost: number | null
          estimated_time_impact_days: number | null
          id: string
          internal_notes: string | null
          organization_id: string
          originated_by: string | null
          origination_date: string
          owner_comments: string | null
          priced_cost: number | null
          priced_time_days: number | null
          pricing_expires_at: string | null
          pricing_submitted_at: string | null
          project_id: string
          reason: string | null
          related_rfi_id: string | null
          spec_section: string | null
          status: Database["public"]["Enums"]["pco_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          backup_documents?: Json | null
          change_order_id?: string | null
          change_type: Database["public"]["Enums"]["change_order_type"]
          cor_number: string
          created_at?: string | null
          created_by?: string | null
          description: string
          drawing_reference?: string | null
          estimated_cost?: number | null
          estimated_time_impact_days?: number | null
          id?: string
          internal_notes?: string | null
          organization_id: string
          originated_by?: string | null
          origination_date: string
          owner_comments?: string | null
          priced_cost?: number | null
          priced_time_days?: number | null
          pricing_expires_at?: string | null
          pricing_submitted_at?: string | null
          project_id: string
          reason?: string | null
          related_rfi_id?: string | null
          spec_section?: string | null
          status?: Database["public"]["Enums"]["pco_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          backup_documents?: Json | null
          change_order_id?: string | null
          change_type?: Database["public"]["Enums"]["change_order_type"]
          cor_number?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          drawing_reference?: string | null
          estimated_cost?: number | null
          estimated_time_impact_days?: number | null
          id?: string
          internal_notes?: string | null
          organization_id?: string
          originated_by?: string | null
          origination_date?: string
          owner_comments?: string | null
          priced_cost?: number | null
          priced_time_days?: number | null
          pricing_expires_at?: string | null
          pricing_submitted_at?: string | null
          project_id?: string
          reason?: string | null
          related_rfi_id?: string | null
          spec_section?: string | null
          status?: Database["public"]["Enums"]["pco_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_order_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_order_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_order_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      change_orders: {
        Row: {
          bond_cost: number | null
          change_order_number: string
          change_type: Database["public"]["Enums"]["change_order_type"]
          created_at: string | null
          created_by: string | null
          description: string
          document_id: string | null
          equipment_cost: number | null
          executed_at: string | null
          id: string
          internal_approved_at: string | null
          internal_approved_by: string | null
          labor_cost: number | null
          material_cost: number | null
          new_completion_date: string | null
          new_contract_value: number
          organization_id: string
          original_completion_date: string | null
          original_contract_value: number
          overhead_amount: number | null
          overhead_percentage: number | null
          owner_approved_at: string | null
          owner_signature_name: string | null
          previous_changes_total: number | null
          previous_time_extensions: number | null
          profit_amount: number | null
          profit_percentage: number | null
          project_id: string
          signed_document_url: string | null
          status: Database["public"]["Enums"]["change_order_status"]
          subcontractor_cost: number | null
          submitted_to_owner_at: string | null
          this_change_amount: number
          this_time_extension: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          bond_cost?: number | null
          change_order_number: string
          change_type: Database["public"]["Enums"]["change_order_type"]
          created_at?: string | null
          created_by?: string | null
          description: string
          document_id?: string | null
          equipment_cost?: number | null
          executed_at?: string | null
          id?: string
          internal_approved_at?: string | null
          internal_approved_by?: string | null
          labor_cost?: number | null
          material_cost?: number | null
          new_completion_date?: string | null
          new_contract_value: number
          organization_id: string
          original_completion_date?: string | null
          original_contract_value: number
          overhead_amount?: number | null
          overhead_percentage?: number | null
          owner_approved_at?: string | null
          owner_signature_name?: string | null
          previous_changes_total?: number | null
          previous_time_extensions?: number | null
          profit_amount?: number | null
          profit_percentage?: number | null
          project_id: string
          signed_document_url?: string | null
          status?: Database["public"]["Enums"]["change_order_status"]
          subcontractor_cost?: number | null
          submitted_to_owner_at?: string | null
          this_change_amount: number
          this_time_extension?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          bond_cost?: number | null
          change_order_number?: string
          change_type?: Database["public"]["Enums"]["change_order_type"]
          created_at?: string | null
          created_by?: string | null
          description?: string
          document_id?: string | null
          equipment_cost?: number | null
          executed_at?: string | null
          id?: string
          internal_approved_at?: string | null
          internal_approved_by?: string | null
          labor_cost?: number | null
          material_cost?: number | null
          new_completion_date?: string | null
          new_contract_value?: number
          organization_id?: string
          original_completion_date?: string | null
          original_contract_value?: number
          overhead_amount?: number | null
          overhead_percentage?: number | null
          owner_approved_at?: string | null
          owner_signature_name?: string | null
          previous_changes_total?: number | null
          previous_time_extensions?: number | null
          profit_amount?: number | null
          profit_percentage?: number | null
          project_id?: string
          signed_document_url?: string | null
          status?: Database["public"]["Enums"]["change_order_status"]
          subcontractor_cost?: number | null
          submitted_to_owner_at?: string | null
          this_change_amount?: number
          this_time_extension?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_internal_approved_by_fkey"
            columns: ["internal_approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          acceptance_criteria: string | null
          checklist_id: string
          created_at: string | null
          description: string
          id: string
          is_required: boolean | null
          item_number: number
          max_value: number | null
          min_value: number | null
          requires_measurement: boolean | null
          requires_photo: boolean | null
          requires_signature: boolean | null
          response_type: string | null
          section: string | null
          sort_order: number | null
          specification_reference: string | null
          unit_of_measure: string | null
        }
        Insert: {
          acceptance_criteria?: string | null
          checklist_id: string
          created_at?: string | null
          description: string
          id?: string
          is_required?: boolean | null
          item_number: number
          max_value?: number | null
          min_value?: number | null
          requires_measurement?: boolean | null
          requires_photo?: boolean | null
          requires_signature?: boolean | null
          response_type?: string | null
          section?: string | null
          sort_order?: number | null
          specification_reference?: string | null
          unit_of_measure?: string | null
        }
        Update: {
          acceptance_criteria?: string | null
          checklist_id?: string
          created_at?: string | null
          description?: string
          id?: string
          is_required?: boolean | null
          item_number?: number
          max_value?: number | null
          min_value?: number | null
          requires_measurement?: boolean | null
          requires_photo?: boolean | null
          requires_signature?: boolean | null
          response_type?: string | null
          section?: string | null
          sort_order?: number | null
          specification_reference?: string | null
          unit_of_measure?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "inspection_checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      competent_person_designations: {
        Row: {
          competent_person_type: string
          created_at: string | null
          designated_by: string | null
          designation_date: string
          employee_id: string | null
          expiration_date: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          organization_id: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          subcontractor_worker_id: string | null
          training_documentation_url: string | null
          updated_at: string | null
        }
        Insert: {
          competent_person_type: string
          created_at?: string | null
          designated_by?: string | null
          designation_date: string
          employee_id?: string | null
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          subcontractor_worker_id?: string | null
          training_documentation_url?: string | null
          updated_at?: string | null
        }
        Update: {
          competent_person_type?: string
          created_at?: string | null
          designated_by?: string | null
          designation_date?: string
          employee_id?: string | null
          expiration_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          subcontractor_worker_id?: string | null
          training_documentation_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competent_person_designations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competent_person_designations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competent_person_designations_subcontractor_worker_id_fkey"
            columns: ["subcontractor_worker_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_overrides: {
        Row: {
          approved_by: string | null
          created_at: string | null
          digital_signature: string
          entity_id: string
          entity_type: string
          expires_at: string
          id: string
          is_active: boolean | null
          justification: string
          notification_sent_at: string | null
          organization_id: string
          override_type: string
          project_id: string | null
          reason: string
          requested_by: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          safety_director_notified: boolean | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          digital_signature: string
          entity_id: string
          entity_type: string
          expires_at: string
          id?: string
          is_active?: boolean | null
          justification: string
          notification_sent_at?: string | null
          organization_id: string
          override_type: string
          project_id?: string | null
          reason: string
          requested_by: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          safety_director_notified?: boolean | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          digital_signature?: string
          entity_id?: string
          entity_type?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          justification?: string
          notification_sent_at?: string | null
          organization_id?: string
          override_type?: string
          project_id?: string | null
          reason?: string
          requested_by?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          safety_director_notified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compliance_overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compliance_overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "compliance_overrides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      contract_value_history: {
        Row: {
          change_amount: number
          change_order_id: string | null
          change_reason: string | null
          created_at: string | null
          effective_date: string
          id: string
          new_completion_date: string | null
          new_value: number
          previous_completion_date: string | null
          previous_value: number
          project_id: string
          time_change_days: number | null
        }
        Insert: {
          change_amount: number
          change_order_id?: string | null
          change_reason?: string | null
          created_at?: string | null
          effective_date: string
          id?: string
          new_completion_date?: string | null
          new_value: number
          previous_completion_date?: string | null
          previous_value: number
          project_id: string
          time_change_days?: number | null
        }
        Update: {
          change_amount?: number
          change_order_id?: string | null
          change_reason?: string | null
          created_at?: string | null
          effective_date?: string
          id?: string
          new_completion_date?: string | null
          new_value?: number
          previous_completion_date?: string | null
          previous_value?: number
          project_id?: string
          time_change_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_value_history_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_value_history_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "v_change_order_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_value_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_value_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_value_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contract_value_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contract_value_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "contract_value_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      cost_codes: {
        Row: {
          billing_rate: number | null
          budgeted_amount: number | null
          budgeted_hours: number | null
          budgeted_quantity: number | null
          category: string | null
          code: string
          cost_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_billable: boolean | null
          name: string
          organization_id: string
          parent_id: string | null
          project_id: string | null
          unit_of_measure: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billing_rate?: number | null
          budgeted_amount?: number | null
          budgeted_hours?: number | null
          budgeted_quantity?: number | null
          category?: string | null
          code: string
          cost_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_billable?: boolean | null
          name: string
          organization_id: string
          parent_id?: string | null
          project_id?: string | null
          unit_of_measure?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billing_rate?: number | null
          budgeted_amount?: number | null
          budgeted_hours?: number | null
          budgeted_quantity?: number | null
          category?: string | null
          code?: string
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_billable?: boolean | null
          name?: string
          organization_id?: string
          parent_id?: string | null
          project_id?: string | null
          unit_of_measure?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "cost_codes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_assignment_members: {
        Row: {
          certifications_verified: string[] | null
          checked_in_at: string | null
          checked_out_at: string | null
          compliance_status_at_assignment:
            | Database["public"]["Enums"]["compliance_status"]
            | null
          created_at: string | null
          crew_assignment_id: string
          employee_id: string | null
          hours_worked: number | null
          id: string
          notes: string | null
          role_on_crew: string | null
          subcontractor_worker_id: string | null
          work_classification:
            | Database["public"]["Enums"]["work_classification"]
            | null
        }
        Insert: {
          certifications_verified?: string[] | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          compliance_status_at_assignment?:
            | Database["public"]["Enums"]["compliance_status"]
            | null
          created_at?: string | null
          crew_assignment_id: string
          employee_id?: string | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          role_on_crew?: string | null
          subcontractor_worker_id?: string | null
          work_classification?:
            | Database["public"]["Enums"]["work_classification"]
            | null
        }
        Update: {
          certifications_verified?: string[] | null
          checked_in_at?: string | null
          checked_out_at?: string | null
          compliance_status_at_assignment?:
            | Database["public"]["Enums"]["compliance_status"]
            | null
          created_at?: string | null
          crew_assignment_id?: string
          employee_id?: string | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          role_on_crew?: string | null
          subcontractor_worker_id?: string | null
          work_classification?:
            | Database["public"]["Enums"]["work_classification"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_assignment_members_crew_assignment_id_fkey"
            columns: ["crew_assignment_id"]
            isOneToOne: false
            referencedRelation: "crew_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignment_members_crew_assignment_id_fkey"
            columns: ["crew_assignment_id"]
            isOneToOne: false
            referencedRelation: "v_daily_crew_schedule"
            referencedColumns: ["assignment_id"]
          },
          {
            foreignKeyName: "crew_assignment_members_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignment_members_subcontractor_worker_id_fkey"
            columns: ["subcontractor_worker_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_assignments: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          assignment_date: string
          compliance_checked_at: string | null
          compliance_issues: string[] | null
          compliance_passed: boolean | null
          cost_code: string | null
          created_at: string | null
          created_by: string | null
          crew_name: string | null
          foreman_employee_id: string | null
          id: string
          notes: string | null
          organization_id: string
          project_id: string
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          shift: string | null
          status: Database["public"]["Enums"]["crew_assignment_status"] | null
          supervisor_notes: string | null
          template_id: string | null
          updated_at: string | null
          weather_conditions: string | null
          weather_delayed: boolean | null
          work_description: string | null
          work_location: string | null
          work_type: string | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assignment_date: string
          compliance_checked_at?: string | null
          compliance_issues?: string[] | null
          compliance_passed?: boolean | null
          cost_code?: string | null
          created_at?: string | null
          created_by?: string | null
          crew_name?: string | null
          foreman_employee_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          project_id: string
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          shift?: string | null
          status?: Database["public"]["Enums"]["crew_assignment_status"] | null
          supervisor_notes?: string | null
          template_id?: string | null
          updated_at?: string | null
          weather_conditions?: string | null
          weather_delayed?: boolean | null
          work_description?: string | null
          work_location?: string | null
          work_type?: string | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          assignment_date?: string
          compliance_checked_at?: string | null
          compliance_issues?: string[] | null
          compliance_passed?: boolean | null
          cost_code?: string | null
          created_at?: string | null
          created_by?: string | null
          crew_name?: string | null
          foreman_employee_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          project_id?: string
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          shift?: string | null
          status?: Database["public"]["Enums"]["crew_assignment_status"] | null
          supervisor_notes?: string | null
          template_id?: string | null
          updated_at?: string | null
          weather_conditions?: string | null
          weather_delayed?: boolean | null
          work_description?: string | null
          work_location?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_assignments_foreman_employee_id_fkey"
            columns: ["foreman_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "crew_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_certifications: {
        Row: {
          certificate_number: string | null
          certification_name: string | null
          certification_type: string
          created_at: string
          created_by: string | null
          crew_member_id: string
          document_url: string | null
          expiration_date: string | null
          id: string
          is_verified: boolean | null
          issued_date: string
          issuing_organization: string | null
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          certificate_number?: string | null
          certification_name?: string | null
          certification_type: string
          created_at?: string
          created_by?: string | null
          crew_member_id: string
          document_url?: string | null
          expiration_date?: string | null
          id?: string
          is_verified?: boolean | null
          issued_date: string
          issuing_organization?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          certificate_number?: string | null
          certification_name?: string | null
          certification_type?: string
          created_at?: string
          created_by?: string | null
          crew_member_id?: string
          document_url?: string | null
          expiration_date?: string | null
          id?: string
          is_verified?: boolean | null
          issued_date?: string
          issuing_organization?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_certifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_certifications_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_certifications_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "v_active_crew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_certifications_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_certifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_members: {
        Row: {
          base_hourly_rate: number | null
          certifications: Json | null
          created_at: string
          created_by: string | null
          default_cost_code_id: string | null
          default_project_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          display_name: string | null
          double_time_rate: number | null
          drug_test_status: string | null
          eeo_disability_status: boolean | null
          eeo_ethnicity: string | null
          eeo_gender: string | null
          eeo_veteran_status: boolean | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string
          employment_type: string
          first_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          last_drug_test_date: string | null
          last_name: string
          organization_id: string
          overtime_rate: number | null
          per_diem_rate: number | null
          phone: string | null
          termination_date: string | null
          trade_classification: string
          trade_classification_detail: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          base_hourly_rate?: number | null
          certifications?: Json | null
          created_at?: string
          created_by?: string | null
          default_cost_code_id?: string | null
          default_project_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string | null
          double_time_rate?: number | null
          drug_test_status?: string | null
          eeo_disability_status?: boolean | null
          eeo_ethnicity?: string | null
          eeo_gender?: string | null
          eeo_veteran_status?: boolean | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id: string
          employment_type?: string
          first_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_drug_test_date?: string | null
          last_name: string
          organization_id: string
          overtime_rate?: number | null
          per_diem_rate?: number | null
          phone?: string | null
          termination_date?: string | null
          trade_classification: string
          trade_classification_detail?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          base_hourly_rate?: number | null
          certifications?: Json | null
          created_at?: string
          created_by?: string | null
          default_cost_code_id?: string | null
          default_project_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string | null
          double_time_rate?: number | null
          drug_test_status?: string | null
          eeo_disability_status?: boolean | null
          eeo_ethnicity?: string | null
          eeo_gender?: string | null
          eeo_veteran_status?: boolean | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string
          employment_type?: string
          first_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_drug_test_date?: string | null
          last_name?: string
          organization_id?: string
          overtime_rate?: number | null
          per_diem_rate?: number | null
          phone?: string | null
          termination_date?: string | null
          trade_classification?: string
          trade_classification_detail?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_default_cost_code_id_fkey"
            columns: ["default_cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_members_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_members_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_members_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_members_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crew_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          default_size: number | null
          description: string | null
          id: string
          is_active: boolean | null
          minimum_certifications: string[] | null
          name: string
          organization_id: string
          required_equipment_types: string[] | null
          required_roles: Json | null
          requires_competent_person:
            | Database["public"]["Enums"]["competent_person_type"][]
            | null
          updated_at: string | null
          work_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          default_size?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_certifications?: string[] | null
          name: string
          organization_id: string
          required_equipment_types?: string[] | null
          required_roles?: Json | null
          requires_competent_person?:
            | Database["public"]["Enums"]["competent_person_type"][]
            | null
          updated_at?: string | null
          work_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          default_size?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          minimum_certifications?: string[] | null
          name?: string
          organization_id?: string
          required_equipment_types?: string[] | null
          required_roles?: Json | null
          requires_competent_person?:
            | Database["public"]["Enums"]["competent_person_type"][]
            | null
          updated_at?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_equipment_log: {
        Row: {
          cost_code: string | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          daily_report_id: string
          end_hours: number | null
          end_miles: number | null
          equipment_id: string | null
          equipment_name: string
          equipment_number: string
          equipment_status: string | null
          equipment_type: string | null
          fuel_cost: number | null
          fuel_gallons: number | null
          hours_operated: number | null
          id: string
          idle_hours: number | null
          is_rented: boolean | null
          issues_notes: string | null
          operator_name: string | null
          rental_company: string | null
          start_hours: number | null
          start_miles: number | null
          updated_at: string
          updated_by: string | null
          work_description: string | null
        }
        Insert: {
          cost_code?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          daily_report_id: string
          end_hours?: number | null
          end_miles?: number | null
          equipment_id?: string | null
          equipment_name: string
          equipment_number: string
          equipment_status?: string | null
          equipment_type?: string | null
          fuel_cost?: number | null
          fuel_gallons?: number | null
          hours_operated?: number | null
          id?: string
          idle_hours?: number | null
          is_rented?: boolean | null
          issues_notes?: string | null
          operator_name?: string | null
          rental_company?: string | null
          start_hours?: number | null
          start_miles?: number | null
          updated_at?: string
          updated_by?: string | null
          work_description?: string | null
        }
        Update: {
          cost_code?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          daily_report_id?: string
          end_hours?: number | null
          end_miles?: number | null
          equipment_id?: string | null
          equipment_name?: string
          equipment_number?: string
          equipment_status?: string | null
          equipment_type?: string | null
          fuel_cost?: number | null
          fuel_gallons?: number | null
          hours_operated?: number | null
          id?: string
          idle_hours?: number | null
          is_rented?: boolean | null
          issues_notes?: string | null
          operator_name?: string | null
          rental_company?: string | null
          start_hours?: number | null
          start_miles?: number | null
          updated_at?: string
          updated_by?: string | null
          work_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_equipment_log_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_equipment_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_equipment_log_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_equipment_log_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_pending_report_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_equipment_log_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_recent_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_equipment_log_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_equipment_log_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment_health_overview"
            referencedColumns: ["equipment_id"]
          },
          {
            foreignKeyName: "daily_equipment_log_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_equipment_log_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_manpower: {
        Row: {
          company_name: string | null
          cost_code: string | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          crew_member_id: string | null
          daily_report_id: string
          double_time_hours: number | null
          id: string
          overtime_hours: number | null
          regular_hours: number | null
          subcontractor_id: string | null
          total_hours: number | null
          trade_classification: string
          updated_at: string
          updated_by: string | null
          work_description: string | null
          worker_name: string
        }
        Insert: {
          company_name?: string | null
          cost_code?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          crew_member_id?: string | null
          daily_report_id: string
          double_time_hours?: number | null
          id?: string
          overtime_hours?: number | null
          regular_hours?: number | null
          subcontractor_id?: string | null
          total_hours?: number | null
          trade_classification: string
          updated_at?: string
          updated_by?: string | null
          work_description?: string | null
          worker_name: string
        }
        Update: {
          company_name?: string | null
          cost_code?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          crew_member_id?: string | null
          daily_report_id?: string
          double_time_hours?: number | null
          id?: string
          overtime_hours?: number | null
          regular_hours?: number | null
          subcontractor_id?: string | null
          total_hours?: number | null
          trade_classification?: string
          updated_at?: string
          updated_by?: string | null
          work_description?: string | null
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_manpower_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_manpower_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_manpower_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_manpower_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "v_active_crew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_manpower_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_manpower_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_pending_report_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_manpower_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_recent_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_manpower_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_manpower_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_material_summary: {
        Row: {
          category_totals: Json | null
          computed_at: string | null
          id: string
          organization_id: string
          project_id: string
          summary_date: string
          tickets_verified: number | null
          tickets_with_variance: number | null
          total_cost: number | null
          total_quantity: number | null
          total_tickets: number | null
          total_variance_amount: number | null
        }
        Insert: {
          category_totals?: Json | null
          computed_at?: string | null
          id?: string
          organization_id: string
          project_id: string
          summary_date: string
          tickets_verified?: number | null
          tickets_with_variance?: number | null
          total_cost?: number | null
          total_quantity?: number | null
          total_tickets?: number | null
          total_variance_amount?: number | null
        }
        Update: {
          category_totals?: Json | null
          computed_at?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          summary_date?: string
          tickets_verified?: number | null
          tickets_with_variance?: number | null
          total_cost?: number | null
          total_quantity?: number | null
          total_tickets?: number | null
          total_variance_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_material_summary_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_material_summary_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_material_summary_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_material_summary_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_material_summary_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_material_summary_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_material_summary_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      daily_report_entries: {
        Row: {
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          daily_report_id: string
          delay_hours: number | null
          delay_is_compensable: boolean | null
          delay_is_excusable: boolean | null
          delay_responsible_party: string | null
          delay_type: string | null
          description: string
          duration_hours: number | null
          end_time: string | null
          entry_type: string
          id: string
          inspection_notes: string | null
          inspection_result: string | null
          inspection_type: string | null
          inspector_name: string | null
          location_description: string | null
          quantity: number | null
          sort_order: number | null
          source: string | null
          start_time: string | null
          station_end: string | null
          station_start: string | null
          unit_of_measure: string | null
          updated_at: string
          updated_by: string | null
          visitor_arrival_time: string | null
          visitor_company: string | null
          visitor_departure_time: string | null
          visitor_name: string | null
          visitor_purpose: string | null
          voice_segment_end: number | null
          voice_segment_start: number | null
        }
        Insert: {
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          daily_report_id: string
          delay_hours?: number | null
          delay_is_compensable?: boolean | null
          delay_is_excusable?: boolean | null
          delay_responsible_party?: string | null
          delay_type?: string | null
          description: string
          duration_hours?: number | null
          end_time?: string | null
          entry_type: string
          id?: string
          inspection_notes?: string | null
          inspection_result?: string | null
          inspection_type?: string | null
          inspector_name?: string | null
          location_description?: string | null
          quantity?: number | null
          sort_order?: number | null
          source?: string | null
          start_time?: string | null
          station_end?: string | null
          station_start?: string | null
          unit_of_measure?: string | null
          updated_at?: string
          updated_by?: string | null
          visitor_arrival_time?: string | null
          visitor_company?: string | null
          visitor_departure_time?: string | null
          visitor_name?: string | null
          visitor_purpose?: string | null
          voice_segment_end?: number | null
          voice_segment_start?: number | null
        }
        Update: {
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          daily_report_id?: string
          delay_hours?: number | null
          delay_is_compensable?: boolean | null
          delay_is_excusable?: boolean | null
          delay_responsible_party?: string | null
          delay_type?: string | null
          description?: string
          duration_hours?: number | null
          end_time?: string | null
          entry_type?: string
          id?: string
          inspection_notes?: string | null
          inspection_result?: string | null
          inspection_type?: string | null
          inspector_name?: string | null
          location_description?: string | null
          quantity?: number | null
          sort_order?: number | null
          source?: string | null
          start_time?: string | null
          station_end?: string | null
          station_start?: string | null
          unit_of_measure?: string | null
          updated_at?: string
          updated_by?: string | null
          visitor_arrival_time?: string | null
          visitor_company?: string | null
          visitor_departure_time?: string | null
          visitor_name?: string | null
          visitor_purpose?: string | null
          voice_segment_end?: number | null
          voice_segment_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_entries_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_entries_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_entries_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_pending_report_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_entries_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_recent_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_report_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by_name: string
          created_by_user_id: string
          deleted_at: string | null
          deleted_by: string | null
          equipment_count: number | null
          equipment_hours: number | null
          executive_summary: string | null
          has_voice_recording: boolean | null
          humidity_percent: number | null
          id: string
          is_working_day: boolean | null
          issues_summary: string | null
          location_accuracy_meters: number | null
          location_latitude: number | null
          location_longitude: number | null
          location_verified: boolean | null
          no_work_reason: string | null
          no_work_reason_detail: string | null
          organization_id: string
          precipitation_inches: number | null
          previous_version_id: string | null
          project_id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          report_date: string
          report_number: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shared_with_wvdoh: boolean | null
          shared_with_wvdoh_at: string | null
          shift_end_time: string | null
          shift_start_time: string | null
          shift_type: string
          status: string
          sub_man_hours: number | null
          sub_workers: number | null
          submitted_at: string | null
          submitted_by: string | null
          temperature_current_f: number | null
          temperature_high_f: number | null
          temperature_low_f: number | null
          tomorrow_plan: string | null
          total_man_hours: number | null
          total_workers: number | null
          triton_man_hours: number | null
          triton_workers: number | null
          updated_at: string
          updated_by: string | null
          version: number | null
          voice_processed_at: string | null
          voice_transcript: string | null
          weather_condition: string | null
          weather_fetched_at: string | null
          weather_raw_data: Json | null
          weather_source: string | null
          wind_direction: string | null
          wind_speed_mph: number | null
          work_performed: boolean | null
          work_performed_summary: string | null
          working_day_number: number | null
          wvdoh_comments: string | null
          wvdoh_inspector_name: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by_name: string
          created_by_user_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          equipment_count?: number | null
          equipment_hours?: number | null
          executive_summary?: string | null
          has_voice_recording?: boolean | null
          humidity_percent?: number | null
          id?: string
          is_working_day?: boolean | null
          issues_summary?: string | null
          location_accuracy_meters?: number | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_verified?: boolean | null
          no_work_reason?: string | null
          no_work_reason_detail?: string | null
          organization_id: string
          precipitation_inches?: number | null
          previous_version_id?: string | null
          project_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          report_date: string
          report_number: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shared_with_wvdoh?: boolean | null
          shared_with_wvdoh_at?: string | null
          shift_end_time?: string | null
          shift_start_time?: string | null
          shift_type?: string
          status?: string
          sub_man_hours?: number | null
          sub_workers?: number | null
          submitted_at?: string | null
          submitted_by?: string | null
          temperature_current_f?: number | null
          temperature_high_f?: number | null
          temperature_low_f?: number | null
          tomorrow_plan?: string | null
          total_man_hours?: number | null
          total_workers?: number | null
          triton_man_hours?: number | null
          triton_workers?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number | null
          voice_processed_at?: string | null
          voice_transcript?: string | null
          weather_condition?: string | null
          weather_fetched_at?: string | null
          weather_raw_data?: Json | null
          weather_source?: string | null
          wind_direction?: string | null
          wind_speed_mph?: number | null
          work_performed?: boolean | null
          work_performed_summary?: string | null
          working_day_number?: number | null
          wvdoh_comments?: string | null
          wvdoh_inspector_name?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by_name?: string
          created_by_user_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          equipment_count?: number | null
          equipment_hours?: number | null
          executive_summary?: string | null
          has_voice_recording?: boolean | null
          humidity_percent?: number | null
          id?: string
          is_working_day?: boolean | null
          issues_summary?: string | null
          location_accuracy_meters?: number | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_verified?: boolean | null
          no_work_reason?: string | null
          no_work_reason_detail?: string | null
          organization_id?: string
          precipitation_inches?: number | null
          previous_version_id?: string | null
          project_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          report_date?: string
          report_number?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shared_with_wvdoh?: boolean | null
          shared_with_wvdoh_at?: string | null
          shift_end_time?: string | null
          shift_start_time?: string | null
          shift_type?: string
          status?: string
          sub_man_hours?: number | null
          sub_workers?: number | null
          submitted_at?: string | null
          submitted_by?: string | null
          temperature_current_f?: number | null
          temperature_high_f?: number | null
          temperature_low_f?: number | null
          tomorrow_plan?: string | null
          total_man_hours?: number | null
          total_workers?: number | null
          triton_man_hours?: number | null
          triton_workers?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: number | null
          voice_processed_at?: string | null
          voice_transcript?: string | null
          weather_condition?: string | null
          weather_fetched_at?: string | null
          weather_raw_data?: Json | null
          weather_source?: string | null
          wind_direction?: string | null
          wind_speed_mph?: number | null
          work_performed?: boolean | null
          work_performed_summary?: string | null
          working_day_number?: number | null
          wvdoh_comments?: string | null
          wvdoh_inspector_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "v_pending_report_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "v_recent_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dbe_participation: {
        Row: {
          actual_dbe_percent: number | null
          created_at: string
          created_by: string | null
          dbe_certification_number: string | null
          dbe_firm_name: string
          id: string
          naics_code: string | null
          organization_id: string
          project_dbe_goal_percent: number | null
          project_id: string
          report_month: number | null
          report_year: number | null
          status: string | null
          subcontract_amount: number
          subcontractor_id: string | null
          total_paid_to_date: number | null
          updated_at: string
          updated_by: string | null
          work_description: string
        }
        Insert: {
          actual_dbe_percent?: number | null
          created_at?: string
          created_by?: string | null
          dbe_certification_number?: string | null
          dbe_firm_name: string
          id?: string
          naics_code?: string | null
          organization_id: string
          project_dbe_goal_percent?: number | null
          project_id: string
          report_month?: number | null
          report_year?: number | null
          status?: string | null
          subcontract_amount: number
          subcontractor_id?: string | null
          total_paid_to_date?: number | null
          updated_at?: string
          updated_by?: string | null
          work_description: string
        }
        Update: {
          actual_dbe_percent?: number | null
          created_at?: string
          created_by?: string | null
          dbe_certification_number?: string | null
          dbe_firm_name?: string
          id?: string
          naics_code?: string | null
          organization_id?: string
          project_dbe_goal_percent?: number | null
          project_id?: string
          report_month?: number | null
          report_year?: number | null
          status?: string | null
          subcontract_amount?: number
          subcontractor_id?: string | null
          total_paid_to_date?: number | null
          updated_at?: string
          updated_by?: string | null
          work_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "dbe_participation_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_participation_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_participation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_participation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_participation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dbe_participation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dbe_participation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dbe_participation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dbe_participation_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_participation_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dbe_utilization_records: {
        Row: {
          certification_expiry: string | null
          certification_verified: boolean | null
          committed_amount: number
          created_at: string | null
          created_by: string | null
          current_period_amount: number | null
          dbe_type: string
          id: string
          naics_codes: string[] | null
          notes: string | null
          organization_id: string
          paid_to_date: number | null
          period_end: string
          period_start: string
          project_id: string
          subcontract_id: string | null
          subcontractor_id: string
          updated_at: string | null
        }
        Insert: {
          certification_expiry?: string | null
          certification_verified?: boolean | null
          committed_amount: number
          created_at?: string | null
          created_by?: string | null
          current_period_amount?: number | null
          dbe_type: string
          id?: string
          naics_codes?: string[] | null
          notes?: string | null
          organization_id: string
          paid_to_date?: number | null
          period_end: string
          period_start: string
          project_id: string
          subcontract_id?: string | null
          subcontractor_id: string
          updated_at?: string | null
        }
        Update: {
          certification_expiry?: string | null
          certification_verified?: boolean | null
          committed_amount?: number
          created_at?: string | null
          created_by?: string | null
          current_period_amount?: number | null
          dbe_type?: string
          id?: string
          naics_codes?: string[] | null
          notes?: string | null
          organization_id?: string
          paid_to_date?: number | null
          period_end?: string
          period_start?: string
          project_id?: string
          subcontract_id?: string | null
          subcontractor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dbe_utilization_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_utilization_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_utilization_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_utilization_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_utilization_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dbe_utilization_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dbe_utilization_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dbe_utilization_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "dbe_utilization_records_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontract_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_utilization_records_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "v_active_subcontracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dbe_utilization_records_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_log: {
        Row: {
          access_type: string
          accessed_at: string | null
          document_id: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          document_id: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          document_id?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          allowed_roles: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          folder_type: string | null
          id: string
          is_system_folder: boolean | null
          name: string
          organization_id: string
          parent_folder_id: string | null
          path: string
          project_id: string | null
          restricted: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_roles?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          folder_type?: string | null
          id?: string
          is_system_folder?: boolean | null
          name: string
          organization_id: string
          parent_folder_id?: string | null
          path: string
          project_id?: string | null
          restricted?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_roles?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          folder_type?: string | null
          id?: string
          is_system_folder?: boolean | null
          name?: string
          organization_id?: string
          parent_folder_id?: string | null
          path?: string
          project_id?: string | null
          restricted?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "document_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      document_reviews: {
        Row: {
          comments: string | null
          created_at: string | null
          document_id: string
          due_date: string | null
          id: string
          requested_at: string | null
          requested_by: string | null
          responded_at: string | null
          response: string | null
          review_order: number | null
          reviewer_id: string
          status: string
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          document_id: string
          due_date?: string | null
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          responded_at?: string | null
          response?: string | null
          review_order?: number | null
          reviewer_id: string
          status?: string
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          document_id?: string
          due_date?: string | null
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          responded_at?: string | null
          response?: string | null
          review_order?: number | null
          reviewer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reviews_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_date: string | null
          document_number: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          drawing_number: string | null
          due_date: string | null
          file_extension: string
          file_name: string
          file_size_bytes: number | null
          folder_id: string | null
          id: string
          is_current_version: boolean | null
          mime_type: string | null
          organization_id: string
          previous_version_id: string | null
          project_id: string | null
          received_date: string | null
          related_change_order_id: string | null
          related_rfi_id: string | null
          related_submittal_id: string | null
          review_notes: string | null
          spec_section: string | null
          status: Database["public"]["Enums"]["document_status"]
          storage_bucket: string
          storage_path: string
          tags: string[] | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_date?: string | null
          document_number?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          drawing_number?: string | null
          due_date?: string | null
          file_extension: string
          file_name: string
          file_size_bytes?: number | null
          folder_id?: string | null
          id?: string
          is_current_version?: boolean | null
          mime_type?: string | null
          organization_id: string
          previous_version_id?: string | null
          project_id?: string | null
          received_date?: string | null
          related_change_order_id?: string | null
          related_rfi_id?: string | null
          related_submittal_id?: string | null
          review_notes?: string | null
          spec_section?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_bucket?: string
          storage_path: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_date?: string | null
          document_number?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          drawing_number?: string | null
          due_date?: string | null
          file_extension?: string
          file_name?: string
          file_size_bytes?: number | null
          folder_id?: string | null
          id?: string
          is_current_version?: boolean | null
          mime_type?: string | null
          organization_id?: string
          previous_version_id?: string | null
          project_id?: string | null
          received_date?: string | null
          related_change_order_id?: string | null
          related_rfi_id?: string | null
          related_submittal_id?: string | null
          review_notes?: string | null
          spec_section?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_bucket?: string
          storage_path?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      driver_licenses: {
        Row: {
          cdl_self_certification_type: string | null
          created_at: string | null
          document_url: string | null
          eligibility_status: string | null
          employee_id: string
          endorsements: string[] | null
          id: string
          is_cdl: boolean | null
          last_mvr_date: string | null
          license_class: string
          license_expiration: string
          license_number: string
          license_state: string
          medical_card_expiration: string | null
          points_total: number | null
          restrictions: string[] | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
          violation_count: number | null
        }
        Insert: {
          cdl_self_certification_type?: string | null
          created_at?: string | null
          document_url?: string | null
          eligibility_status?: string | null
          employee_id: string
          endorsements?: string[] | null
          id?: string
          is_cdl?: boolean | null
          last_mvr_date?: string | null
          license_class: string
          license_expiration: string
          license_number: string
          license_state?: string
          medical_card_expiration?: string | null
          points_total?: number | null
          restrictions?: string[] | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          violation_count?: number | null
        }
        Update: {
          cdl_self_certification_type?: string | null
          created_at?: string | null
          document_url?: string | null
          eligibility_status?: string | null
          employee_id?: string
          endorsements?: string[] | null
          id?: string
          is_cdl?: boolean | null
          last_mvr_date?: string | null
          license_class?: string
          license_expiration?: string
          license_number?: string
          license_state?: string
          medical_card_expiration?: string | null
          points_total?: number | null
          restrictions?: string[] | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          violation_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_licenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_tests: {
        Row: {
          chain_of_custody_number: string | null
          collection_site: string | null
          created_at: string | null
          created_by: string | null
          document_url: string | null
          employee_id: string
          id: string
          is_dot_test: boolean | null
          lab_name: string | null
          mro_name: string | null
          notes: string | null
          result: string
          result_date: string | null
          test_date: string
          test_type: string
        }
        Insert: {
          chain_of_custody_number?: string | null
          collection_site?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          employee_id: string
          id?: string
          is_dot_test?: boolean | null
          lab_name?: string | null
          mro_name?: string | null
          notes?: string | null
          result: string
          result_date?: string | null
          test_date: string
          test_type: string
        }
        Update: {
          chain_of_custody_number?: string | null
          collection_site?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          employee_id?: string
          id?: string
          is_dot_test?: boolean | null
          lab_name?: string | null
          mro_name?: string | null
          notes?: string | null
          result?: string
          result_date?: string | null
          test_date?: string
          test_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_tests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          bcc_addresses: string[] | null
          bounce_type: string | null
          bounced_at: string | null
          category: string
          cc_addresses: string[] | null
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          from_address: string
          id: string
          opened_at: string | null
          organization_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          reply_to: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          subject: string
          tags: Json | null
          to_addresses: string[]
          user_id: string | null
        }
        Insert: {
          bcc_addresses?: string[] | null
          bounce_type?: string | null
          bounced_at?: string | null
          category?: string
          cc_addresses?: string[] | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          from_address: string
          id?: string
          opened_at?: string | null
          organization_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reply_to?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          tags?: Json | null
          to_addresses: string[]
          user_id?: string | null
        }
        Update: {
          bcc_addresses?: string[] | null
          bounce_type?: string | null
          bounced_at?: string | null
          category?: string
          cc_addresses?: string[] | null
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          from_address?: string
          id?: string
          opened_at?: string | null
          organization_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reply_to?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          tags?: Json | null
          to_addresses?: string[]
          user_id?: string | null
        }
        Relationships: []
      }
      employee_certifications: {
        Row: {
          certificate_number: string | null
          certification_name: string
          certification_type: string
          created_at: string | null
          document_url: string | null
          employee_id: string
          expiration_date: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          notes: string | null
          status: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          certificate_number?: string | null
          certification_name: string
          certification_type: string
          created_at?: string | null
          document_url?: string | null
          employee_id: string
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          certificate_number?: string | null
          certification_name?: string
          certification_type?: string
          created_at?: string | null
          document_url?: string | null
          employee_id?: string
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_certifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          can_drive_company_vehicle: boolean | null
          can_operate_heavy_equipment: boolean | null
          competent_person_types: string[] | null
          compliance_issues: string[] | null
          compliance_status: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_number: string | null
          first_name: string
          fringe_rate: number | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_competent_person: boolean | null
          is_union_member: boolean | null
          last_name: string
          metadata: Json | null
          middle_name: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          preferred_name: string | null
          profile_photo_url: string | null
          ssn_encrypted: string | null
          status: string | null
          suffix: string | null
          termination_date: string | null
          trade_classification: string | null
          union_card_number: string | null
          union_local: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          can_drive_company_vehicle?: boolean | null
          can_operate_heavy_equipment?: boolean | null
          competent_person_types?: string[] | null
          compliance_issues?: string[] | null
          compliance_status?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string | null
          first_name: string
          fringe_rate?: number | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_competent_person?: boolean | null
          is_union_member?: boolean | null
          last_name: string
          metadata?: Json | null
          middle_name?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          preferred_name?: string | null
          profile_photo_url?: string | null
          ssn_encrypted?: string | null
          status?: string | null
          suffix?: string | null
          termination_date?: string | null
          trade_classification?: string | null
          union_card_number?: string | null
          union_local?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          can_drive_company_vehicle?: boolean | null
          can_operate_heavy_equipment?: boolean | null
          competent_person_types?: string[] | null
          compliance_issues?: string[] | null
          compliance_status?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string | null
          first_name?: string
          fringe_rate?: number | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_competent_person?: boolean | null
          is_union_member?: boolean | null
          last_name?: string
          metadata?: Json | null
          middle_name?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          preferred_name?: string | null
          profile_photo_url?: string | null
          ssn_encrypted?: string | null
          status?: string | null
          suffix?: string | null
          termination_date?: string | null
          trade_classification?: string | null
          union_card_number?: string | null
          union_local?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          capacity: string | null
          created_at: string
          created_by: string | null
          current_hours: number | null
          current_latitude: number | null
          current_location_updated_at: string | null
          current_longitude: number | null
          current_miles: number | null
          current_project_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          depreciation_method: string | null
          description: string | null
          equipment_category: string
          equipment_number: string
          equipment_type: string
          horsepower: number | null
          hours_updated_at: string | null
          id: string
          insurance_expiration: string | null
          insurance_policy_number: string | null
          insured: boolean | null
          internal_daily_rate: number | null
          internal_hourly_rate: number | null
          internal_monthly_rate: number | null
          internal_weekly_rate: number | null
          is_active: boolean | null
          last_service_date: string | null
          last_service_hours: number | null
          license_plate: string | null
          maintenance_interval_days: number | null
          maintenance_interval_hours: number | null
          make: string | null
          miles_updated_at: string | null
          model: string | null
          name: string
          next_service_due_date: string | null
          next_service_due_hours: number | null
          notes: string | null
          organization_id: string
          ownership_type: string
          purchase_date: string | null
          purchase_price: number | null
          rental_company: string | null
          rental_end_date: string | null
          rental_rate: number | null
          rental_rate_period: string | null
          rental_start_date: string | null
          salvage_value: number | null
          serial_number: string | null
          status: string
          telematics_device_id: string | null
          telematics_last_sync: string | null
          telematics_provider: string | null
          updated_at: string
          updated_by: string | null
          useful_life_years: number | null
          vin: string | null
          weight_lbs: number | null
          year: number | null
        }
        Insert: {
          capacity?: string | null
          created_at?: string
          created_by?: string | null
          current_hours?: number | null
          current_latitude?: number | null
          current_location_updated_at?: string | null
          current_longitude?: number | null
          current_miles?: number | null
          current_project_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          depreciation_method?: string | null
          description?: string | null
          equipment_category: string
          equipment_number: string
          equipment_type: string
          horsepower?: number | null
          hours_updated_at?: string | null
          id?: string
          insurance_expiration?: string | null
          insurance_policy_number?: string | null
          insured?: boolean | null
          internal_daily_rate?: number | null
          internal_hourly_rate?: number | null
          internal_monthly_rate?: number | null
          internal_weekly_rate?: number | null
          is_active?: boolean | null
          last_service_date?: string | null
          last_service_hours?: number | null
          license_plate?: string | null
          maintenance_interval_days?: number | null
          maintenance_interval_hours?: number | null
          make?: string | null
          miles_updated_at?: string | null
          model?: string | null
          name: string
          next_service_due_date?: string | null
          next_service_due_hours?: number | null
          notes?: string | null
          organization_id: string
          ownership_type?: string
          purchase_date?: string | null
          purchase_price?: number | null
          rental_company?: string | null
          rental_end_date?: string | null
          rental_rate?: number | null
          rental_rate_period?: string | null
          rental_start_date?: string | null
          salvage_value?: number | null
          serial_number?: string | null
          status?: string
          telematics_device_id?: string | null
          telematics_last_sync?: string | null
          telematics_provider?: string | null
          updated_at?: string
          updated_by?: string | null
          useful_life_years?: number | null
          vin?: string | null
          weight_lbs?: number | null
          year?: number | null
        }
        Update: {
          capacity?: string | null
          created_at?: string
          created_by?: string | null
          current_hours?: number | null
          current_latitude?: number | null
          current_location_updated_at?: string | null
          current_longitude?: number | null
          current_miles?: number | null
          current_project_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          depreciation_method?: string | null
          description?: string | null
          equipment_category?: string
          equipment_number?: string
          equipment_type?: string
          horsepower?: number | null
          hours_updated_at?: string | null
          id?: string
          insurance_expiration?: string | null
          insurance_policy_number?: string | null
          insured?: boolean | null
          internal_daily_rate?: number | null
          internal_hourly_rate?: number | null
          internal_monthly_rate?: number | null
          internal_weekly_rate?: number | null
          is_active?: boolean | null
          last_service_date?: string | null
          last_service_hours?: number | null
          license_plate?: string | null
          maintenance_interval_days?: number | null
          maintenance_interval_hours?: number | null
          make?: string | null
          miles_updated_at?: string | null
          model?: string | null
          name?: string
          next_service_due_date?: string | null
          next_service_due_hours?: number | null
          notes?: string | null
          organization_id?: string
          ownership_type?: string
          purchase_date?: string | null
          purchase_price?: number | null
          rental_company?: string | null
          rental_end_date?: string | null
          rental_rate?: number | null
          rental_rate_period?: string | null
          rental_start_date?: string | null
          salvage_value?: number | null
          serial_number?: string | null
          status?: string
          telematics_device_id?: string | null
          telematics_last_sync?: string | null
          telematics_provider?: string | null
          updated_at?: string
          updated_by?: string | null
          useful_life_years?: number | null
          vin?: string | null
          weight_lbs?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assignments: {
        Row: {
          assigned_by: string | null
          assigned_date: string
          assignment_notes: string | null
          created_at: string
          created_by: string | null
          equipment_id: string
          hours_at_assignment: number | null
          hours_at_release: number | null
          id: string
          is_current: boolean | null
          miles_at_assignment: number | null
          miles_at_release: number | null
          project_id: string
          release_notes: string | null
          released_by: string | null
          released_date: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_date?: string
          assignment_notes?: string | null
          created_at?: string
          created_by?: string | null
          equipment_id: string
          hours_at_assignment?: number | null
          hours_at_release?: number | null
          id?: string
          is_current?: boolean | null
          miles_at_assignment?: number | null
          miles_at_release?: number | null
          project_id: string
          release_notes?: string | null
          released_by?: string | null
          released_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_date?: string
          assignment_notes?: string | null
          created_at?: string
          created_by?: string | null
          equipment_id?: string
          hours_at_assignment?: number | null
          hours_at_release?: number | null
          id?: string
          is_current?: boolean | null
          miles_at_assignment?: number | null
          miles_at_release?: number | null
          project_id?: string
          release_notes?: string | null
          released_by?: string | null
          released_date?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment_health_overview"
            referencedColumns: ["equipment_id"]
          },
          {
            foreignKeyName: "equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_assignments_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_health_predictions: {
        Row: {
          component_predictions: Json | null
          created_at: string | null
          equipment_id: string
          estimated_cost: number | null
          estimated_downtime_hours: number | null
          failure_probability: number | null
          id: string
          input_metrics: Json | null
          model_version: string | null
          organization_id: string
          predicted_failure_date: string | null
          prediction_date: string
          recommended_date: string | null
          recommended_maintenance: string | null
          remaining_useful_life_hours: number | null
        }
        Insert: {
          component_predictions?: Json | null
          created_at?: string | null
          equipment_id: string
          estimated_cost?: number | null
          estimated_downtime_hours?: number | null
          failure_probability?: number | null
          id?: string
          input_metrics?: Json | null
          model_version?: string | null
          organization_id: string
          predicted_failure_date?: string | null
          prediction_date: string
          recommended_date?: string | null
          recommended_maintenance?: string | null
          remaining_useful_life_hours?: number | null
        }
        Update: {
          component_predictions?: Json | null
          created_at?: string | null
          equipment_id?: string
          estimated_cost?: number | null
          estimated_downtime_hours?: number | null
          failure_probability?: number | null
          id?: string
          input_metrics?: Json | null
          model_version?: string | null
          organization_id?: string
          predicted_failure_date?: string | null
          prediction_date?: string
          recommended_date?: string | null
          recommended_maintenance?: string | null
          remaining_useful_life_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_health_predictions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_health_predictions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment_health_overview"
            referencedColumns: ["equipment_id"]
          },
          {
            foreignKeyName: "equipment_health_predictions_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_health_predictions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_policy_rules: {
        Row: {
          consequence: string
          created_at: string | null
          created_by: string | null
          description: string
          effective_date: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          rule_type: string
          threshold_period_months: number | null
          threshold_value: number
          updated_at: string | null
        }
        Insert: {
          consequence: string
          created_at?: string | null
          created_by?: string | null
          description: string
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          rule_type: string
          threshold_period_months?: number | null
          threshold_value: number
          updated_at?: string | null
        }
        Update: {
          consequence?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          rule_type?: string
          threshold_period_months?: number | null
          threshold_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_policy_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      geocode_log: {
        Row: {
          accuracy_type: string | null
          created_at: string
          error_message: string | null
          formatted_address: string | null
          id: string
          input_address: string
          latitude: number | null
          longitude: number | null
          provider: string | null
          status: string
          ticket_id: string | null
        }
        Insert: {
          accuracy_type?: string | null
          created_at?: string
          error_message?: string | null
          formatted_address?: string | null
          id?: string
          input_address: string
          latitude?: number | null
          longitude?: number | null
          provider?: string | null
          status: string
          ticket_id?: string | null
        }
        Update: {
          accuracy_type?: string | null
          created_at?: string
          error_message?: string | null
          formatted_address?: string | null
          id?: string
          input_address?: string
          latitude?: number | null
          longitude?: number | null
          provider?: string | null
          status?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geocode_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geocode_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geocode_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geocode_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      hold_points: {
        Row: {
          activity_description: string
          advance_notice_days: number | null
          bypass_approved_by: string | null
          bypass_reason: string | null
          cost_code: string | null
          created_at: string | null
          created_by: string | null
          hold_point_number: string
          hold_type: string | null
          id: string
          inspection_id: string | null
          notes: string | null
          notify_owner: boolean | null
          notify_wvdoh: boolean | null
          organization_id: string
          project_id: string
          release_notes: string | null
          released_at: string | null
          released_by: string | null
          requested_by: string | null
          requested_date: string | null
          required_documentation: string[] | null
          required_inspections: string[] | null
          required_tests: string[] | null
          specification_section: string | null
          status: string | null
          updated_at: string | null
          work_item: string | null
        }
        Insert: {
          activity_description: string
          advance_notice_days?: number | null
          bypass_approved_by?: string | null
          bypass_reason?: string | null
          cost_code?: string | null
          created_at?: string | null
          created_by?: string | null
          hold_point_number: string
          hold_type?: string | null
          id?: string
          inspection_id?: string | null
          notes?: string | null
          notify_owner?: boolean | null
          notify_wvdoh?: boolean | null
          organization_id: string
          project_id: string
          release_notes?: string | null
          released_at?: string | null
          released_by?: string | null
          requested_by?: string | null
          requested_date?: string | null
          required_documentation?: string[] | null
          required_inspections?: string[] | null
          required_tests?: string[] | null
          specification_section?: string | null
          status?: string | null
          updated_at?: string | null
          work_item?: string | null
        }
        Update: {
          activity_description?: string
          advance_notice_days?: number | null
          bypass_approved_by?: string | null
          bypass_reason?: string | null
          cost_code?: string | null
          created_at?: string | null
          created_by?: string | null
          hold_point_number?: string
          hold_type?: string | null
          id?: string
          inspection_id?: string | null
          notes?: string | null
          notify_owner?: boolean | null
          notify_wvdoh?: boolean | null
          organization_id?: string
          project_id?: string
          release_notes?: string | null
          released_at?: string | null
          released_by?: string | null
          requested_by?: string | null
          requested_date?: string | null
          required_documentation?: string[] | null
          required_inspections?: string[] | null
          required_tests?: string[] | null
          specification_section?: string | null
          status?: string | null
          updated_at?: string | null
          work_item?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hold_points_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hold_points_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hold_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hold_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hold_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hold_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hold_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "hold_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      incidents: {
        Row: {
          body_part_affected: string | null
          classification: string
          closed_at: string | null
          closed_by: string | null
          corrective_actions: string | null
          created_at: string | null
          days_away: number | null
          description: string
          id: string
          immediate_actions: string | null
          incident_date: string
          incident_number: string | null
          incident_time: string | null
          injured_party_name: string | null
          injured_party_type: string | null
          injury_description: string | null
          investigation_notes: string | null
          location_description: string | null
          lost_time: boolean | null
          medical_attention_required: boolean | null
          organization_id: string
          osha_case_number: string | null
          osha_recordable: boolean | null
          project_id: string | null
          reported_by_id: string | null
          restricted_duty_days: number | null
          root_cause: string | null
          safety_director_notified: boolean | null
          severity: string
          status: string | null
          supervisor_notified: boolean | null
          treatment_provided: string | null
          updated_at: string | null
          witnesses: string[] | null
        }
        Insert: {
          body_part_affected?: string | null
          classification: string
          closed_at?: string | null
          closed_by?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          days_away?: number | null
          description: string
          id?: string
          immediate_actions?: string | null
          incident_date: string
          incident_number?: string | null
          incident_time?: string | null
          injured_party_name?: string | null
          injured_party_type?: string | null
          injury_description?: string | null
          investigation_notes?: string | null
          location_description?: string | null
          lost_time?: boolean | null
          medical_attention_required?: boolean | null
          organization_id: string
          osha_case_number?: string | null
          osha_recordable?: boolean | null
          project_id?: string | null
          reported_by_id?: string | null
          restricted_duty_days?: number | null
          root_cause?: string | null
          safety_director_notified?: boolean | null
          severity?: string
          status?: string | null
          supervisor_notified?: boolean | null
          treatment_provided?: string | null
          updated_at?: string | null
          witnesses?: string[] | null
        }
        Update: {
          body_part_affected?: string | null
          classification?: string
          closed_at?: string | null
          closed_by?: string | null
          corrective_actions?: string | null
          created_at?: string | null
          days_away?: number | null
          description?: string
          id?: string
          immediate_actions?: string | null
          incident_date?: string
          incident_number?: string | null
          incident_time?: string | null
          injured_party_name?: string | null
          injured_party_type?: string | null
          injury_description?: string | null
          investigation_notes?: string | null
          location_description?: string | null
          lost_time?: boolean | null
          medical_attention_required?: boolean | null
          organization_id?: string
          osha_case_number?: string | null
          osha_recordable?: boolean | null
          project_id?: string | null
          reported_by_id?: string | null
          restricted_duty_days?: number | null
          root_cause?: string | null
          safety_director_notified?: boolean | null
          severity?: string
          status?: string | null
          supervisor_notified?: boolean | null
          treatment_provided?: string | null
          updated_at?: string | null
          witnesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      indirect_costs: {
        Row: {
          allocated_to_items: boolean | null
          allocation_method: string | null
          basis_amount: number | null
          calculation_method: string | null
          category: Database["public"]["Enums"]["indirect_category_enum"]
          cost_amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_months: number | null
          id: string
          monthly_rate: number | null
          notes: string | null
          percentage_basis: string | null
          percentage_rate: number | null
          proposal_id: string
          updated_at: string | null
        }
        Insert: {
          allocated_to_items?: boolean | null
          allocation_method?: string | null
          basis_amount?: number | null
          calculation_method?: string | null
          category: Database["public"]["Enums"]["indirect_category_enum"]
          cost_amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_months?: number | null
          id?: string
          monthly_rate?: number | null
          notes?: string | null
          percentage_basis?: string | null
          percentage_rate?: number | null
          proposal_id: string
          updated_at?: string | null
        }
        Update: {
          allocated_to_items?: boolean | null
          allocation_method?: string | null
          basis_amount?: number | null
          calculation_method?: string | null
          category?: Database["public"]["Enums"]["indirect_category_enum"]
          cost_amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_months?: number | null
          id?: string
          monthly_rate?: number | null
          notes?: string | null
          percentage_basis?: string | null
          percentage_rate?: number | null
          proposal_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indirect_costs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "bid_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indirect_costs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_checklists: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          effective_date: string | null
          id: string
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
          version: number | null
          work_type: string | null
          wvdoh_division: string | null
          wvdoh_form_number: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
          version?: number | null
          work_type?: string | null
          wvdoh_division?: string | null
          wvdoh_form_number?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          inspection_type?: Database["public"]["Enums"]["inspection_type"]
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
          version?: number | null
          work_type?: string | null
          wvdoh_division?: string | null
          wvdoh_form_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_responses: {
        Row: {
          checklist_item_id: string
          deficiency_description: string | null
          id: string
          inspection_id: string
          is_compliant: boolean | null
          notes: string | null
          numeric_value: number | null
          photo_urls: string[] | null
          responded_at: string | null
          responded_by: string | null
          response: string | null
          text_value: string | null
        }
        Insert: {
          checklist_item_id: string
          deficiency_description?: string | null
          id?: string
          inspection_id: string
          is_compliant?: boolean | null
          notes?: string | null
          numeric_value?: number | null
          photo_urls?: string[] | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          text_value?: string | null
        }
        Update: {
          checklist_item_id?: string
          deficiency_description?: string | null
          id?: string
          inspection_id?: string
          is_compliant?: boolean | null
          notes?: string | null
          numeric_value?: number | null
          photo_urls?: string[] | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_responses_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_responses_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          actual_date: string | null
          actual_end_time: string | null
          actual_start_time: string | null
          checklist_id: string | null
          conditions_due_date: string | null
          conditions_for_acceptance: string | null
          contractor_rep_name: string | null
          contractor_signature_url: string | null
          contractor_signed_at: string | null
          cost_code: string | null
          created_at: string | null
          created_by: string | null
          daily_report_id: string | null
          documents: string[] | null
          id: string
          inspection_number: string
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          inspector_company: string | null
          inspector_name: string | null
          inspector_signature_url: string | null
          inspector_signed_at: string | null
          items_failed: number | null
          items_na: number | null
          items_passed: number | null
          latitude: number | null
          lead_inspector_id: string | null
          location_description: string | null
          longitude: number | null
          notes: string | null
          organization_id: string
          overall_result: string | null
          pass_percentage: number | null
          photos: string[] | null
          project_id: string
          reinspection_id: string | null
          requires_reinspection: boolean | null
          scheduled_date: string | null
          scheduled_time: string | null
          station_from: string | null
          station_to: string | null
          status: Database["public"]["Enums"]["inspection_status"] | null
          updated_at: string | null
          work_description: string | null
          wvdoh_comments: string | null
          wvdoh_inspector_name: string | null
          wvdoh_inspector_present: boolean | null
        }
        Insert: {
          actual_date?: string | null
          actual_end_time?: string | null
          actual_start_time?: string | null
          checklist_id?: string | null
          conditions_due_date?: string | null
          conditions_for_acceptance?: string | null
          contractor_rep_name?: string | null
          contractor_signature_url?: string | null
          contractor_signed_at?: string | null
          cost_code?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_id?: string | null
          documents?: string[] | null
          id?: string
          inspection_number: string
          inspection_type: Database["public"]["Enums"]["inspection_type"]
          inspector_company?: string | null
          inspector_name?: string | null
          inspector_signature_url?: string | null
          inspector_signed_at?: string | null
          items_failed?: number | null
          items_na?: number | null
          items_passed?: number | null
          latitude?: number | null
          lead_inspector_id?: string | null
          location_description?: string | null
          longitude?: number | null
          notes?: string | null
          organization_id: string
          overall_result?: string | null
          pass_percentage?: number | null
          photos?: string[] | null
          project_id: string
          reinspection_id?: string | null
          requires_reinspection?: boolean | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          station_from?: string | null
          station_to?: string | null
          status?: Database["public"]["Enums"]["inspection_status"] | null
          updated_at?: string | null
          work_description?: string | null
          wvdoh_comments?: string | null
          wvdoh_inspector_name?: string | null
          wvdoh_inspector_present?: boolean | null
        }
        Update: {
          actual_date?: string | null
          actual_end_time?: string | null
          actual_start_time?: string | null
          checklist_id?: string | null
          conditions_due_date?: string | null
          conditions_for_acceptance?: string | null
          contractor_rep_name?: string | null
          contractor_signature_url?: string | null
          contractor_signed_at?: string | null
          cost_code?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_id?: string | null
          documents?: string[] | null
          id?: string
          inspection_number?: string
          inspection_type?: Database["public"]["Enums"]["inspection_type"]
          inspector_company?: string | null
          inspector_name?: string | null
          inspector_signature_url?: string | null
          inspector_signed_at?: string | null
          items_failed?: number | null
          items_na?: number | null
          items_passed?: number | null
          latitude?: number | null
          lead_inspector_id?: string | null
          location_description?: string | null
          longitude?: number | null
          notes?: string | null
          organization_id?: string
          overall_result?: string | null
          pass_percentage?: number | null
          photos?: string[] | null
          project_id?: string
          reinspection_id?: string | null
          requires_reinspection?: boolean | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          station_from?: string | null
          station_to?: string | null
          status?: Database["public"]["Enums"]["inspection_status"] | null
          updated_at?: string | null
          work_description?: string | null
          wvdoh_comments?: string | null
          wvdoh_inspector_name?: string | null
          wvdoh_inspector_present?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "inspection_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_pending_report_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_recent_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      item_assemblies: {
        Row: {
          cost_code_id: string | null
          cost_source: string | null
          created_at: string | null
          created_by: string | null
          davis_bacon_rate: number | null
          fringes: number | null
          historical_project_id: string | null
          id: string
          is_ai_suggested: boolean | null
          is_historical: boolean | null
          is_manually_adjusted: boolean | null
          line_item_id: string
          productivity_factor: number | null
          productivity_notes: string | null
          quantity_per_unit: number
          quantity_uom: string | null
          resource_description: string | null
          resource_id: string | null
          resource_type: Database["public"]["Enums"]["resource_type_enum"]
          total_cost: number | null
          unit_cost: number
          updated_at: string | null
          wage_classification: string | null
          wage_rate_id: string | null
          waste_percentage: number | null
        }
        Insert: {
          cost_code_id?: string | null
          cost_source?: string | null
          created_at?: string | null
          created_by?: string | null
          davis_bacon_rate?: number | null
          fringes?: number | null
          historical_project_id?: string | null
          id?: string
          is_ai_suggested?: boolean | null
          is_historical?: boolean | null
          is_manually_adjusted?: boolean | null
          line_item_id: string
          productivity_factor?: number | null
          productivity_notes?: string | null
          quantity_per_unit: number
          quantity_uom?: string | null
          resource_description?: string | null
          resource_id?: string | null
          resource_type: Database["public"]["Enums"]["resource_type_enum"]
          total_cost?: number | null
          unit_cost: number
          updated_at?: string | null
          wage_classification?: string | null
          wage_rate_id?: string | null
          waste_percentage?: number | null
        }
        Update: {
          cost_code_id?: string | null
          cost_source?: string | null
          created_at?: string | null
          created_by?: string | null
          davis_bacon_rate?: number | null
          fringes?: number | null
          historical_project_id?: string | null
          id?: string
          is_ai_suggested?: boolean | null
          is_historical?: boolean | null
          is_manually_adjusted?: boolean | null
          line_item_id?: string
          productivity_factor?: number | null
          productivity_notes?: string | null
          quantity_per_unit?: number
          quantity_uom?: string | null
          resource_description?: string | null
          resource_id?: string | null
          resource_type?: Database["public"]["Enums"]["resource_type_enum"]
          total_cost?: number | null
          unit_cost?: number
          updated_at?: string | null
          wage_classification?: string | null
          wage_rate_id?: string | null
          waste_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "item_assemblies_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "proposal_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_assemblies_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_line_item_costing"
            referencedColumns: ["line_item_id"]
          },
        ]
      }
      master_wvdoh_items: {
        Row: {
          common_risk_factors: string[] | null
          created_at: string | null
          description: string
          division: string | null
          is_critical_path_typical: boolean | null
          is_force_sub: boolean | null
          is_lump_sum: boolean | null
          is_weather_sensitive: boolean | null
          item_code: string
          price_last_updated: string | null
          related_items: string[] | null
          requires_specialty_license: boolean | null
          short_description: string | null
          specs_reference_url: string | null
          specs_section: string | null
          specs_subsection: string | null
          typical_productivity_notes: string | null
          typical_unit_price_high: number | null
          typical_unit_price_low: number | null
          typical_unit_price_median: number | null
          unit_of_measure: string
          updated_at: string | null
          work_category: string | null
        }
        Insert: {
          common_risk_factors?: string[] | null
          created_at?: string | null
          description: string
          division?: string | null
          is_critical_path_typical?: boolean | null
          is_force_sub?: boolean | null
          is_lump_sum?: boolean | null
          is_weather_sensitive?: boolean | null
          item_code: string
          price_last_updated?: string | null
          related_items?: string[] | null
          requires_specialty_license?: boolean | null
          short_description?: string | null
          specs_reference_url?: string | null
          specs_section?: string | null
          specs_subsection?: string | null
          typical_productivity_notes?: string | null
          typical_unit_price_high?: number | null
          typical_unit_price_low?: number | null
          typical_unit_price_median?: number | null
          unit_of_measure: string
          updated_at?: string | null
          work_category?: string | null
        }
        Update: {
          common_risk_factors?: string[] | null
          created_at?: string | null
          description?: string
          division?: string | null
          is_critical_path_typical?: boolean | null
          is_force_sub?: boolean | null
          is_lump_sum?: boolean | null
          is_weather_sensitive?: boolean | null
          item_code?: string
          price_last_updated?: string | null
          related_items?: string[] | null
          requires_specialty_license?: boolean | null
          short_description?: string | null
          specs_reference_url?: string | null
          specs_section?: string | null
          specs_subsection?: string | null
          typical_productivity_notes?: string | null
          typical_unit_price_high?: number | null
          typical_unit_price_low?: number | null
          typical_unit_price_median?: number | null
          unit_of_measure?: string
          updated_at?: string | null
          work_category?: string | null
        }
        Relationships: []
      }
      material_reconciliation: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          material_ticket_id: string
          notes: string | null
          organization_id: string
          po_line_item_id: string | null
          po_line_quantity: number | null
          po_unit_price: number | null
          project_id: string
          reconciliation_type: string | null
          ticket_amount: number | null
          ticket_quantity: number
          variance_amount: number | null
          variance_percentage: number | null
          variance_quantity: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          material_ticket_id: string
          notes?: string | null
          organization_id: string
          po_line_item_id?: string | null
          po_line_quantity?: number | null
          po_unit_price?: number | null
          project_id: string
          reconciliation_type?: string | null
          ticket_amount?: number | null
          ticket_quantity: number
          variance_amount?: number | null
          variance_percentage?: number | null
          variance_quantity?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          material_ticket_id?: string
          notes?: string | null
          organization_id?: string
          po_line_item_id?: string | null
          po_line_quantity?: number | null
          po_unit_price?: number | null
          project_id?: string
          reconciliation_type?: string | null
          ticket_amount?: number | null
          ticket_quantity?: number
          variance_amount?: number | null
          variance_percentage?: number | null
          variance_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_reconciliation_material_ticket_id_fkey"
            columns: ["material_ticket_id"]
            isOneToOne: false
            referencedRelation: "material_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reconciliation_material_ticket_id_fkey"
            columns: ["material_ticket_id"]
            isOneToOne: false
            referencedRelation: "v_tickets_pending_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reconciliation_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reconciliation_po_line_item_id_fkey"
            columns: ["po_line_item_id"]
            isOneToOne: false
            referencedRelation: "po_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reconciliation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reconciliation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_reconciliation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_reconciliation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_reconciliation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_reconciliation_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      material_tickets: {
        Row: {
          additional_photos: string[] | null
          air_content: number | null
          ambient_temp: number | null
          asphalt_temp: number | null
          batch_time: string | null
          concrete_temp: number | null
          cost_code: string | null
          created_at: string | null
          created_by: string | null
          delivery_date: string
          delivery_location: string | null
          delivery_time: string | null
          driver_name: string | null
          gross_weight: number | null
          has_variance: boolean | null
          id: string
          latitude: number | null
          load_number: number | null
          longitude: number | null
          match_confidence: number | null
          matched_po_id: string | null
          matched_po_line_id: string | null
          material_category:
            | Database["public"]["Enums"]["material_category"]
            | null
          material_description: string | null
          mix_design_number: string | null
          net_weight: number | null
          notes: string | null
          ocr_extraction_id: string | null
          ocr_status: Database["public"]["Enums"]["ocr_status"] | null
          oil_percentage: number | null
          organization_id: string
          project_id: string
          quantity: number
          received_by: string | null
          receiver_name: string | null
          slump_at_site: number | null
          slump_ordered: number | null
          source_location: string | null
          specification: string | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          supplier_id: string | null
          tare_weight: number | null
          ticket_number: string
          ticket_photo_url: string | null
          truck_number: string | null
          unit_of_measure: string
          updated_at: string | null
          variance_amount: number | null
          variance_reason: string | null
          variance_resolved_at: string | null
          variance_resolved_by: string | null
          vendor_name: string | null
          vendor_ticket_number: string | null
          verified_at: string | null
          verified_by: string | null
          water_added_gallons: number | null
        }
        Insert: {
          additional_photos?: string[] | null
          air_content?: number | null
          ambient_temp?: number | null
          asphalt_temp?: number | null
          batch_time?: string | null
          concrete_temp?: number | null
          cost_code?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_date: string
          delivery_location?: string | null
          delivery_time?: string | null
          driver_name?: string | null
          gross_weight?: number | null
          has_variance?: boolean | null
          id?: string
          latitude?: number | null
          load_number?: number | null
          longitude?: number | null
          match_confidence?: number | null
          matched_po_id?: string | null
          matched_po_line_id?: string | null
          material_category?:
            | Database["public"]["Enums"]["material_category"]
            | null
          material_description?: string | null
          mix_design_number?: string | null
          net_weight?: number | null
          notes?: string | null
          ocr_extraction_id?: string | null
          ocr_status?: Database["public"]["Enums"]["ocr_status"] | null
          oil_percentage?: number | null
          organization_id: string
          project_id: string
          quantity: number
          received_by?: string | null
          receiver_name?: string | null
          slump_at_site?: number | null
          slump_ordered?: number | null
          source_location?: string | null
          specification?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          supplier_id?: string | null
          tare_weight?: number | null
          ticket_number: string
          ticket_photo_url?: string | null
          truck_number?: string | null
          unit_of_measure: string
          updated_at?: string | null
          variance_amount?: number | null
          variance_reason?: string | null
          variance_resolved_at?: string | null
          variance_resolved_by?: string | null
          vendor_name?: string | null
          vendor_ticket_number?: string | null
          verified_at?: string | null
          verified_by?: string | null
          water_added_gallons?: number | null
        }
        Update: {
          additional_photos?: string[] | null
          air_content?: number | null
          ambient_temp?: number | null
          asphalt_temp?: number | null
          batch_time?: string | null
          concrete_temp?: number | null
          cost_code?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string
          delivery_location?: string | null
          delivery_time?: string | null
          driver_name?: string | null
          gross_weight?: number | null
          has_variance?: boolean | null
          id?: string
          latitude?: number | null
          load_number?: number | null
          longitude?: number | null
          match_confidence?: number | null
          matched_po_id?: string | null
          matched_po_line_id?: string | null
          material_category?:
            | Database["public"]["Enums"]["material_category"]
            | null
          material_description?: string | null
          mix_design_number?: string | null
          net_weight?: number | null
          notes?: string | null
          ocr_extraction_id?: string | null
          ocr_status?: Database["public"]["Enums"]["ocr_status"] | null
          oil_percentage?: number | null
          organization_id?: string
          project_id?: string
          quantity?: number
          received_by?: string | null
          receiver_name?: string | null
          slump_at_site?: number | null
          slump_ordered?: number | null
          source_location?: string | null
          specification?: string | null
          status?: Database["public"]["Enums"]["ticket_status"] | null
          supplier_id?: string | null
          tare_weight?: number | null
          ticket_number?: string
          ticket_photo_url?: string | null
          truck_number?: string | null
          unit_of_measure?: string
          updated_at?: string | null
          variance_amount?: number | null
          variance_reason?: string | null
          variance_resolved_at?: string | null
          variance_resolved_by?: string | null
          vendor_name?: string | null
          vendor_ticket_number?: string | null
          verified_at?: string | null
          verified_by?: string | null
          water_added_gallons?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "material_tickets_matched_po_id_fkey"
            columns: ["matched_po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tickets_matched_po_id_fkey"
            columns: ["matched_po_id"]
            isOneToOne: false
            referencedRelation: "v_purchase_order_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tickets_matched_po_line_id_fkey"
            columns: ["matched_po_line_id"]
            isOneToOne: false
            referencedRelation: "po_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_tickets_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_cards: {
        Row: {
          certification_type: string | null
          conditions: string[] | null
          created_at: string | null
          document_url: string | null
          driver_id: string
          exam_date: string
          examiner_name: string | null
          examiner_registry_number: string | null
          expiration_date: string
          id: string
          is_conditional: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          certification_type?: string | null
          conditions?: string[] | null
          created_at?: string | null
          document_url?: string | null
          driver_id: string
          exam_date: string
          examiner_name?: string | null
          examiner_registry_number?: string | null
          expiration_date: string
          id?: string
          is_conditional?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          certification_type?: string | null
          conditions?: string[] | null
          created_at?: string | null
          document_url?: string | null
          driver_id?: string
          exam_date?: string
          examiner_name?: string | null
          examiner_registry_number?: string | null
          expiration_date?: string
          id?: string
          is_conditional?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_cards_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_minutes: {
        Row: {
          absent: Json | null
          action_items: Json | null
          agenda: string | null
          approved_at: string | null
          approved_by: string | null
          attendees: Json | null
          created_at: string | null
          distribution: Json | null
          document_id: string | null
          end_time: string | null
          id: string
          location: string | null
          meeting_date: string
          meeting_number: number
          meeting_type: string
          minutes_content: string | null
          next_meeting_date: string | null
          next_meeting_location: string | null
          organization_id: string
          prepared_by: string | null
          project_id: string
          start_time: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          absent?: Json | null
          action_items?: Json | null
          agenda?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attendees?: Json | null
          created_at?: string | null
          distribution?: Json | null
          document_id?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_number: number
          meeting_type: string
          minutes_content?: string | null
          next_meeting_date?: string | null
          next_meeting_location?: string | null
          organization_id: string
          prepared_by?: string | null
          project_id: string
          start_time?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          absent?: Json | null
          action_items?: Json | null
          agenda?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attendees?: Json | null
          created_at?: string | null
          distribution?: Json | null
          document_id?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_number?: number
          meeting_type?: string
          minutes_content?: string | null
          next_meeting_date?: string | null
          next_meeting_location?: string | null
          organization_id?: string
          prepared_by?: string | null
          project_id?: string
          start_time?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_minutes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "meeting_minutes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "meeting_minutes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "meeting_minutes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      mvr_records: {
        Row: {
          affects_eligibility: boolean | null
          conviction_date: string | null
          created_at: string | null
          description: string | null
          document_url: string | null
          driver_id: string
          fine_amount: number | null
          id: string
          is_serious_violation: boolean | null
          notes: string | null
          points: number | null
          report_date: string
          report_source: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          violation_date: string | null
          violation_type: string | null
        }
        Insert: {
          affects_eligibility?: boolean | null
          conviction_date?: string | null
          created_at?: string | null
          description?: string | null
          document_url?: string | null
          driver_id: string
          fine_amount?: number | null
          id?: string
          is_serious_violation?: boolean | null
          notes?: string | null
          points?: number | null
          report_date: string
          report_source?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          violation_date?: string | null
          violation_type?: string | null
        }
        Update: {
          affects_eligibility?: boolean | null
          conviction_date?: string | null
          created_at?: string | null
          description?: string | null
          document_url?: string | null
          driver_id?: string
          fine_amount?: number | null
          id?: string
          is_serious_violation?: boolean | null
          notes?: string | null
          points?: number | null
          report_date?: string
          report_source?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          violation_date?: string | null
          violation_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mvr_records_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      non_conformances: {
        Row: {
          actual_cost: number | null
          category: string | null
          closed_at: string | null
          closed_by: string | null
          closure_notes: string | null
          corrective_action: string | null
          corrective_action_by: string | null
          corrective_action_completed_at: string | null
          corrective_action_due_date: string | null
          created_at: string | null
          created_by: string | null
          description: string
          discovered_by: string | null
          discovered_date: string
          discoverer_name: string | null
          documents: string[] | null
          estimated_cost: number | null
          id: string
          inspection_id: string | null
          investigated_by: string | null
          investigation_completed_at: string | null
          investigation_notes: string | null
          latitude: number | null
          lessons_learned: string | null
          location_description: string | null
          longitude: number | null
          ncr_number: string
          organization_id: string
          photos: string[] | null
          preventive_action: string | null
          project_id: string
          responsible_party: string | null
          root_cause: string | null
          severity: Database["public"]["Enums"]["ncr_severity"]
          source_type: string | null
          specification_reference: string | null
          station: string | null
          status: Database["public"]["Enums"]["ncr_status"] | null
          subcontractor_id: string | null
          test_result_id: string | null
          title: string
          updated_at: string | null
          verification_method: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
          wvdoh_notification_date: string | null
          wvdoh_notified: boolean | null
          wvdoh_response: string | null
        }
        Insert: {
          actual_cost?: number | null
          category?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          corrective_action?: string | null
          corrective_action_by?: string | null
          corrective_action_completed_at?: string | null
          corrective_action_due_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          discovered_by?: string | null
          discovered_date: string
          discoverer_name?: string | null
          documents?: string[] | null
          estimated_cost?: number | null
          id?: string
          inspection_id?: string | null
          investigated_by?: string | null
          investigation_completed_at?: string | null
          investigation_notes?: string | null
          latitude?: number | null
          lessons_learned?: string | null
          location_description?: string | null
          longitude?: number | null
          ncr_number: string
          organization_id: string
          photos?: string[] | null
          preventive_action?: string | null
          project_id: string
          responsible_party?: string | null
          root_cause?: string | null
          severity: Database["public"]["Enums"]["ncr_severity"]
          source_type?: string | null
          specification_reference?: string | null
          station?: string | null
          status?: Database["public"]["Enums"]["ncr_status"] | null
          subcontractor_id?: string | null
          test_result_id?: string | null
          title: string
          updated_at?: string | null
          verification_method?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          wvdoh_notification_date?: string | null
          wvdoh_notified?: boolean | null
          wvdoh_response?: string | null
        }
        Update: {
          actual_cost?: number | null
          category?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          corrective_action?: string | null
          corrective_action_by?: string | null
          corrective_action_completed_at?: string | null
          corrective_action_due_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          discovered_by?: string | null
          discovered_date?: string
          discoverer_name?: string | null
          documents?: string[] | null
          estimated_cost?: number | null
          id?: string
          inspection_id?: string | null
          investigated_by?: string | null
          investigation_completed_at?: string | null
          investigation_notes?: string | null
          latitude?: number | null
          lessons_learned?: string | null
          location_description?: string | null
          longitude?: number | null
          ncr_number?: string
          organization_id?: string
          photos?: string[] | null
          preventive_action?: string | null
          project_id?: string
          responsible_party?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["ncr_severity"]
          source_type?: string | null
          specification_reference?: string | null
          station?: string | null
          status?: Database["public"]["Enums"]["ncr_status"] | null
          subcontractor_id?: string | null
          test_result_id?: string | null
          title?: string
          updated_at?: string | null
          verification_method?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          wvdoh_notification_date?: string | null
          wvdoh_notified?: boolean | null
          wvdoh_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "non_conformances_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformances_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformances_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformances_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "v_failed_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_extractions: {
        Row: {
          api_cost_cents: number | null
          confidence_score: number | null
          corrected_at: string | null
          corrected_by: string | null
          created_at: string | null
          extracted_date: string | null
          extracted_gross_weight: string | null
          extracted_material: string | null
          extracted_net_weight: string | null
          extracted_quantity: string | null
          extracted_tare_weight: string | null
          extracted_ticket_number: string | null
          extracted_time: string | null
          extracted_truck_number: string | null
          extracted_unit: string | null
          extracted_vendor: string | null
          human_corrected: boolean | null
          id: string
          image_hash: string | null
          image_url: string
          material_ticket_id: string
          model_version: string | null
          parsed_data: Json | null
          processed_at: string | null
          processing_time_ms: number | null
          provider: string | null
          raw_response: Json | null
          status: Database["public"]["Enums"]["ocr_status"] | null
          validation_errors: string[] | null
        }
        Insert: {
          api_cost_cents?: number | null
          confidence_score?: number | null
          corrected_at?: string | null
          corrected_by?: string | null
          created_at?: string | null
          extracted_date?: string | null
          extracted_gross_weight?: string | null
          extracted_material?: string | null
          extracted_net_weight?: string | null
          extracted_quantity?: string | null
          extracted_tare_weight?: string | null
          extracted_ticket_number?: string | null
          extracted_time?: string | null
          extracted_truck_number?: string | null
          extracted_unit?: string | null
          extracted_vendor?: string | null
          human_corrected?: boolean | null
          id?: string
          image_hash?: string | null
          image_url: string
          material_ticket_id: string
          model_version?: string | null
          parsed_data?: Json | null
          processed_at?: string | null
          processing_time_ms?: number | null
          provider?: string | null
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["ocr_status"] | null
          validation_errors?: string[] | null
        }
        Update: {
          api_cost_cents?: number | null
          confidence_score?: number | null
          corrected_at?: string | null
          corrected_by?: string | null
          created_at?: string | null
          extracted_date?: string | null
          extracted_gross_weight?: string | null
          extracted_material?: string | null
          extracted_net_weight?: string | null
          extracted_quantity?: string | null
          extracted_tare_weight?: string | null
          extracted_ticket_number?: string | null
          extracted_time?: string | null
          extracted_truck_number?: string | null
          extracted_unit?: string | null
          extracted_vendor?: string | null
          human_corrected?: boolean | null
          id?: string
          image_hash?: string | null
          image_url?: string
          material_ticket_id?: string
          model_version?: string | null
          parsed_data?: Json | null
          processed_at?: string | null
          processing_time_ms?: number | null
          provider?: string | null
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["ocr_status"] | null
          validation_errors?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_extractions_material_ticket_id_fkey"
            columns: ["material_ticket_id"]
            isOneToOne: false
            referencedRelation: "material_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_extractions_material_ticket_id_fkey"
            columns: ["material_ticket_id"]
            isOneToOne: false
            referencedRelation: "v_tickets_pending_verification"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string
          created_by: string | null
          dbe_certification_number: string | null
          dbe_certified: boolean | null
          dbe_expiration_date: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          legal_name: string | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          state: string | null
          tax_id: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
          wv_contractor_license: string | null
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          dbe_certification_number?: string | null
          dbe_certified?: boolean | null
          dbe_expiration_date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legal_name?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          slug: string
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          wv_contractor_license?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          dbe_certification_number?: string | null
          dbe_certified?: boolean | null
          dbe_expiration_date?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legal_name?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          slug?: string
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          wv_contractor_license?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      pay_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          organization_id: string
          pay_date: string | null
          period_number: number
          period_year: number
          start_date: string
          status: string
          total_double_time_hours: number | null
          total_gross_pay: number | null
          total_overtime_hours: number | null
          total_regular_hours: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          organization_id: string
          pay_date?: string | null
          period_number: number
          period_year: number
          start_date: string
          status?: string
          total_double_time_hours?: number | null
          total_gross_pay?: number | null
          total_overtime_hours?: number | null
          total_regular_hours?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          organization_id?: string
          pay_date?: string | null
          period_number?: number
          period_year?: number
          start_date?: string
          status?: string
          total_double_time_hours?: number | null
          total_gross_pay?: number | null
          total_overtime_hours?: number | null
          total_regular_hours?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pay_periods_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_periods_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          code: string
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          action: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name: string
        }
        Update: {
          action?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      po_line_items: {
        Row: {
          buy_america_required: boolean | null
          cost_code: string | null
          country_of_origin: string | null
          created_at: string | null
          description: string
          extended_amount: number | null
          id: string
          line_number: number
          material_category:
            | Database["public"]["Enums"]["material_category"]
            | null
          mix_design_number: string | null
          purchase_order_id: string
          quantity: number
          quantity_received: number | null
          quantity_remaining: number | null
          specification: string | null
          unit_of_measure: string
          unit_price: number
        }
        Insert: {
          buy_america_required?: boolean | null
          cost_code?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          description: string
          extended_amount?: number | null
          id?: string
          line_number: number
          material_category?:
            | Database["public"]["Enums"]["material_category"]
            | null
          mix_design_number?: string | null
          purchase_order_id: string
          quantity: number
          quantity_received?: number | null
          quantity_remaining?: number | null
          specification?: string | null
          unit_of_measure: string
          unit_price: number
        }
        Update: {
          buy_america_required?: boolean | null
          cost_code?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          description?: string
          extended_amount?: number | null
          id?: string
          line_number?: number
          material_category?:
            | Database["public"]["Enums"]["material_category"]
            | null
          mix_design_number?: string | null
          purchase_order_id?: string
          quantity?: number
          quantity_received?: number | null
          quantity_remaining?: number | null
          specification?: string | null
          unit_of_measure?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_line_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_line_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "v_purchase_order_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          message: string
          notification_sent_at: string | null
          notified_users: string[] | null
          organization_id: string
          prediction_id: string | null
          project_id: string | null
          recommended_actions: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          risk_indicator_id: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message: string
          notification_sent_at?: string | null
          notified_users?: string[] | null
          organization_id: string
          prediction_id?: string | null
          project_id?: string | null
          recommended_actions?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_indicator_id?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          notification_sent_at?: string | null
          notified_users?: string[] | null
          organization_id?: string
          prediction_id?: string | null
          project_id?: string | null
          recommended_actions?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          risk_indicator_id?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictive_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_alerts_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "project_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "predictive_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "predictive_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "predictive_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "predictive_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_alerts_risk_indicator_id_fkey"
            columns: ["risk_indicator_id"]
            isOneToOne: false
            referencedRelation: "risk_indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      prevailing_wage_rates: {
        Row: {
          base_rate: number
          classification_title: string
          counties: string[] | null
          created_at: string | null
          created_by: string | null
          document_url: string | null
          dt_base_rate: number | null
          effective_date: string
          expiration_date: string | null
          fringe_rate: number
          group_number: string | null
          id: string
          is_active: boolean | null
          modification_number: number | null
          organization_id: string
          ot_base_rate: number | null
          project_id: string | null
          total_rate: number | null
          updated_at: string | null
          wage_determination_number: string
          work_classification: Database["public"]["Enums"]["work_classification"]
        }
        Insert: {
          base_rate: number
          classification_title: string
          counties?: string[] | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          dt_base_rate?: number | null
          effective_date: string
          expiration_date?: string | null
          fringe_rate?: number
          group_number?: string | null
          id?: string
          is_active?: boolean | null
          modification_number?: number | null
          organization_id: string
          ot_base_rate?: number | null
          project_id?: string | null
          total_rate?: number | null
          updated_at?: string | null
          wage_determination_number: string
          work_classification: Database["public"]["Enums"]["work_classification"]
        }
        Update: {
          base_rate?: number
          classification_title?: string
          counties?: string[] | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          dt_base_rate?: number | null
          effective_date?: string
          expiration_date?: string | null
          fringe_rate?: number
          group_number?: string | null
          id?: string
          is_active?: boolean | null
          modification_number?: number | null
          organization_id?: string
          ot_base_rate?: number | null
          project_id?: string | null
          total_rate?: number | null
          updated_at?: string | null
          wage_determination_number?: string
          work_classification?: Database["public"]["Enums"]["work_classification"]
        }
        Relationships: [
          {
            foreignKeyName: "prevailing_wage_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevailing_wage_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevailing_wage_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevailing_wage_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prevailing_wage_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prevailing_wage_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "prevailing_wage_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          assignment_end: string | null
          assignment_start: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          project_id: string
          project_role: string
          receive_alerts: boolean | null
          receive_daily_summary: boolean | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          assignment_end?: string | null
          assignment_start?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          project_id: string
          project_role: string
          receive_alerts?: boolean | null
          receive_daily_summary?: boolean | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          assignment_end?: string | null
          assignment_start?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          project_id?: string
          project_role?: string
          receive_alerts?: boolean | null
          receive_daily_summary?: boolean | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contacts: {
        Row: {
          company: string | null
          contact_type: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          mobile: string | null
          name: string
          notes: string | null
          phone: string | null
          project_id: string
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company?: string | null
          contact_type: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          mobile?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          project_id: string
          role: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          mobile?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          project_id?: string
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_contacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_locations: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          default_end_time: string | null
          default_start_time: string | null
          geofence_polygon: Json | null
          geofence_radius_meters: number | null
          geofence_type: string
          id: string
          is_active: boolean | null
          latitude: number
          location_type: string
          longitude: number
          name: string
          project_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          default_end_time?: string | null
          default_start_time?: string | null
          geofence_polygon?: Json | null
          geofence_radius_meters?: number | null
          geofence_type?: string
          id?: string
          is_active?: boolean | null
          latitude: number
          location_type: string
          longitude: number
          name: string
          project_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          default_end_time?: string | null
          default_start_time?: string | null
          geofence_polygon?: Json | null
          geofence_radius_meters?: number | null
          geofence_type?: string
          id?: string
          is_active?: boolean | null
          latitude?: number
          location_type?: string
          longitude?: number
          name?: string
          project_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_locations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_metrics_history: {
        Row: {
          actual_cost: number | null
          actual_percent_complete: number | null
          approved_co_value: number | null
          cost_variance: number | null
          cpi: number | null
          created_at: string | null
          eac: number | null
          earned_value: number | null
          failed_tests: number | null
          first_aid_cases: number | null
          id: string
          labor_hours: number | null
          metric_date: string
          near_misses: number | null
          open_ncrs: number | null
          pending_co_value: number | null
          planned_cost: number | null
          planned_percent_complete: number | null
          productivity_factor: number | null
          project_id: string
          recordable_incidents: number | null
          rework_hours: number | null
          schedule_variance_days: number | null
          spi: number | null
          trir: number | null
          weather_delay_days: number | null
        }
        Insert: {
          actual_cost?: number | null
          actual_percent_complete?: number | null
          approved_co_value?: number | null
          cost_variance?: number | null
          cpi?: number | null
          created_at?: string | null
          eac?: number | null
          earned_value?: number | null
          failed_tests?: number | null
          first_aid_cases?: number | null
          id?: string
          labor_hours?: number | null
          metric_date: string
          near_misses?: number | null
          open_ncrs?: number | null
          pending_co_value?: number | null
          planned_cost?: number | null
          planned_percent_complete?: number | null
          productivity_factor?: number | null
          project_id: string
          recordable_incidents?: number | null
          rework_hours?: number | null
          schedule_variance_days?: number | null
          spi?: number | null
          trir?: number | null
          weather_delay_days?: number | null
        }
        Update: {
          actual_cost?: number | null
          actual_percent_complete?: number | null
          approved_co_value?: number | null
          cost_variance?: number | null
          cpi?: number | null
          created_at?: string | null
          eac?: number | null
          earned_value?: number | null
          failed_tests?: number | null
          first_aid_cases?: number | null
          id?: string
          labor_hours?: number | null
          metric_date?: string
          near_misses?: number | null
          open_ncrs?: number | null
          pending_co_value?: number | null
          planned_cost?: number | null
          planned_percent_complete?: number | null
          productivity_factor?: number | null
          project_id?: string
          recordable_incidents?: number | null
          rework_hours?: number | null
          schedule_variance_days?: number | null
          spi?: number | null
          trir?: number | null
          weather_delay_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_metrics_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_metrics_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_metrics_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_metrics_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_metrics_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_metrics_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_phases: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          budgeted_value: number | null
          created_at: string
          created_by: string | null
          description: string | null
          earned_value: number | null
          id: string
          name: string
          percent_complete: number | null
          phase_number: number
          planned_end_date: string | null
          planned_start_date: string | null
          project_id: string
          status: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          budgeted_value?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          earned_value?: number | null
          id?: string
          name: string
          percent_complete?: number | null
          phase_number: number
          planned_end_date?: string | null
          planned_start_date?: string | null
          project_id: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          budgeted_value?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          earned_value?: number | null
          id?: string
          name?: string
          percent_complete?: number | null
          phase_number?: number
          planned_end_date?: string | null
          planned_start_date?: string | null
          project_id?: string
          status?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_phases_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_predictions: {
        Row: {
          actual_date: string | null
          actual_value: number | null
          confidence_level: number | null
          created_at: string | null
          explanation: string | null
          id: string
          input_factors: Json | null
          is_current: boolean | null
          model_version: string | null
          organization_id: string
          predicted_date: string | null
          predicted_value: number | null
          prediction_accuracy: number | null
          prediction_date: string
          prediction_range_high: number | null
          prediction_range_low: number | null
          prediction_type: Database["public"]["Enums"]["prediction_type"]
          project_id: string
          target_date: string | null
        }
        Insert: {
          actual_date?: string | null
          actual_value?: number | null
          confidence_level?: number | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          input_factors?: Json | null
          is_current?: boolean | null
          model_version?: string | null
          organization_id: string
          predicted_date?: string | null
          predicted_value?: number | null
          prediction_accuracy?: number | null
          prediction_date: string
          prediction_range_high?: number | null
          prediction_range_low?: number | null
          prediction_type: Database["public"]["Enums"]["prediction_type"]
          project_id: string
          target_date?: string | null
        }
        Update: {
          actual_date?: string | null
          actual_value?: number | null
          confidence_level?: number | null
          created_at?: string | null
          explanation?: string | null
          id?: string
          input_factors?: Json | null
          is_current?: boolean | null
          model_version?: string | null
          organization_id?: string
          predicted_date?: string | null
          predicted_value?: number | null
          prediction_accuracy?: number | null
          prediction_date?: string
          prediction_range_high?: number | null
          prediction_range_low?: number | null
          prediction_type?: Database["public"]["Enums"]["prediction_type"]
          project_id?: string
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_predictions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_completion_date: string | null
          address_line1: string | null
          address_line2: string | null
          bid_item_number: string | null
          bonding_company: string | null
          buy_america_required: boolean | null
          city: string | null
          client_contact_email: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          client_name: string | null
          contract_number: string | null
          contract_type: string | null
          county: string | null
          created_at: string
          created_by: string | null
          current_completion_date: string | null
          current_contract_value: number | null
          current_working_days: number | null
          davis_bacon_required: boolean | null
          dbe_goal_percentage: number | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          estimated_cost: number | null
          federal_aid_number: string | null
          id: string
          insurance_certificate_expiration: string | null
          is_federal_aid: boolean | null
          name: string
          notice_to_proceed_date: string | null
          organization_id: string
          original_completion_date: string | null
          original_contract_value: number | null
          original_working_days: number | null
          payment_bond_amount: number | null
          percent_complete: number | null
          performance_bond_amount: number | null
          project_number: string
          project_type: string | null
          settings: Json | null
          state: string | null
          status: string
          updated_at: string
          updated_by: string | null
          working_days_used: number | null
          wvdoh_district: number | null
          wvdoh_inspector: string | null
          wvdoh_project_manager: string | null
          zip_code: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          address_line1?: string | null
          address_line2?: string | null
          bid_item_number?: string | null
          bonding_company?: string | null
          buy_america_required?: boolean | null
          city?: string | null
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          client_name?: string | null
          contract_number?: string | null
          contract_type?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          current_completion_date?: string | null
          current_contract_value?: number | null
          current_working_days?: number | null
          davis_bacon_required?: boolean | null
          dbe_goal_percentage?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          estimated_cost?: number | null
          federal_aid_number?: string | null
          id?: string
          insurance_certificate_expiration?: string | null
          is_federal_aid?: boolean | null
          name: string
          notice_to_proceed_date?: string | null
          organization_id: string
          original_completion_date?: string | null
          original_contract_value?: number | null
          original_working_days?: number | null
          payment_bond_amount?: number | null
          percent_complete?: number | null
          performance_bond_amount?: number | null
          project_number: string
          project_type?: string | null
          settings?: Json | null
          state?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          working_days_used?: number | null
          wvdoh_district?: number | null
          wvdoh_inspector?: string | null
          wvdoh_project_manager?: string | null
          zip_code?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          address_line1?: string | null
          address_line2?: string | null
          bid_item_number?: string | null
          bonding_company?: string | null
          buy_america_required?: boolean | null
          city?: string | null
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          client_name?: string | null
          contract_number?: string | null
          contract_type?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          current_completion_date?: string | null
          current_contract_value?: number | null
          current_working_days?: number | null
          davis_bacon_required?: boolean | null
          dbe_goal_percentage?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          estimated_cost?: number | null
          federal_aid_number?: string | null
          id?: string
          insurance_certificate_expiration?: string | null
          is_federal_aid?: boolean | null
          name?: string
          notice_to_proceed_date?: string | null
          organization_id?: string
          original_completion_date?: string | null
          original_contract_value?: number | null
          original_working_days?: number | null
          payment_bond_amount?: number | null
          percent_complete?: number | null
          performance_bond_amount?: number | null
          project_number?: string
          project_type?: string | null
          settings?: Json | null
          state?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          working_days_used?: number | null
          wvdoh_district?: number | null
          wvdoh_inspector?: string | null
          wvdoh_project_manager?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_line_items: {
        Row: {
          ai_confidence_score: number | null
          ai_notes: string | null
          ai_pricing_notes: string | null
          ai_suggested_unit_price: number | null
          calculated_direct_cost: number | null
          calculated_unit_price: number | null
          calculation_basis: string | null
          calculation_method:
            | Database["public"]["Enums"]["calculation_method_enum"]
            | null
          calculation_percentage: number | null
          contingency_pct: number | null
          created_at: string | null
          description: string
          estimator_notes: string | null
          fulfillment_method:
            | Database["public"]["Enums"]["fulfillment_enum"]
            | null
          id: string
          is_lump_sum: boolean | null
          item_id: string | null
          line_number: string | null
          overhead_pct: number | null
          priced_at: string | null
          priced_by: string | null
          primary_cost_code_id: string | null
          profit_pct: number | null
          proposal_id: string
          quantity: number | null
          requires_special_provision: boolean | null
          risk_factors: string[] | null
          risk_score: number | null
          special_provision_ref: string | null
          sub_quote_amount: number | null
          sub_quote_expiry_date: string | null
          sub_quote_received_date: string | null
          sub_quote_status:
            | Database["public"]["Enums"]["quote_status_enum"]
            | null
          sub_quote_vendor_id: string | null
          total_price_bid: number | null
          unit_of_measure: string | null
          unit_price_bid: number | null
          updated_at: string | null
          wvdoh_item_code: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_notes?: string | null
          ai_pricing_notes?: string | null
          ai_suggested_unit_price?: number | null
          calculated_direct_cost?: number | null
          calculated_unit_price?: number | null
          calculation_basis?: string | null
          calculation_method?:
            | Database["public"]["Enums"]["calculation_method_enum"]
            | null
          calculation_percentage?: number | null
          contingency_pct?: number | null
          created_at?: string | null
          description: string
          estimator_notes?: string | null
          fulfillment_method?:
            | Database["public"]["Enums"]["fulfillment_enum"]
            | null
          id?: string
          is_lump_sum?: boolean | null
          item_id?: string | null
          line_number?: string | null
          overhead_pct?: number | null
          priced_at?: string | null
          priced_by?: string | null
          primary_cost_code_id?: string | null
          profit_pct?: number | null
          proposal_id: string
          quantity?: number | null
          requires_special_provision?: boolean | null
          risk_factors?: string[] | null
          risk_score?: number | null
          special_provision_ref?: string | null
          sub_quote_amount?: number | null
          sub_quote_expiry_date?: string | null
          sub_quote_received_date?: string | null
          sub_quote_status?:
            | Database["public"]["Enums"]["quote_status_enum"]
            | null
          sub_quote_vendor_id?: string | null
          total_price_bid?: number | null
          unit_of_measure?: string | null
          unit_price_bid?: number | null
          updated_at?: string | null
          wvdoh_item_code?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          ai_notes?: string | null
          ai_pricing_notes?: string | null
          ai_suggested_unit_price?: number | null
          calculated_direct_cost?: number | null
          calculated_unit_price?: number | null
          calculation_basis?: string | null
          calculation_method?:
            | Database["public"]["Enums"]["calculation_method_enum"]
            | null
          calculation_percentage?: number | null
          contingency_pct?: number | null
          created_at?: string | null
          description?: string
          estimator_notes?: string | null
          fulfillment_method?:
            | Database["public"]["Enums"]["fulfillment_enum"]
            | null
          id?: string
          is_lump_sum?: boolean | null
          item_id?: string | null
          line_number?: string | null
          overhead_pct?: number | null
          priced_at?: string | null
          priced_by?: string | null
          primary_cost_code_id?: string | null
          profit_pct?: number | null
          proposal_id?: string
          quantity?: number | null
          requires_special_provision?: boolean | null
          risk_factors?: string[] | null
          risk_score?: number | null
          special_provision_ref?: string | null
          sub_quote_amount?: number | null
          sub_quote_expiry_date?: string | null
          sub_quote_received_date?: string | null
          sub_quote_status?:
            | Database["public"]["Enums"]["quote_status_enum"]
            | null
          sub_quote_vendor_id?: string | null
          total_price_bid?: number | null
          unit_of_measure?: string | null
          unit_price_bid?: number | null
          updated_at?: string | null
          wvdoh_item_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_line_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "bid_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_wvdoh_item_code_fkey"
            columns: ["wvdoh_item_code"]
            isOneToOne: false
            referencedRelation: "master_wvdoh_items"
            referencedColumns: ["item_code"]
          },
        ]
      }
      punch_list_items: {
        Row: {
          after_photos: string[] | null
          area: string | null
          assigned_to: string | null
          before_photos: string[] | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          description: string
          due_date: string | null
          grid_reference: string | null
          id: string
          item_number: number
          location: string
          notes: string | null
          priority: Database["public"]["Enums"]["punch_item_priority"] | null
          punch_list_id: string
          resolution_notes: string | null
          responsible_party: string | null
          room: string | null
          specification_reference: string | null
          status: Database["public"]["Enums"]["punch_item_status"] | null
          subcontractor_id: string | null
          trade: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          after_photos?: string[] | null
          area?: string | null
          assigned_to?: string | null
          before_photos?: string[] | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          due_date?: string | null
          grid_reference?: string | null
          id?: string
          item_number: number
          location: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["punch_item_priority"] | null
          punch_list_id: string
          resolution_notes?: string | null
          responsible_party?: string | null
          room?: string | null
          specification_reference?: string | null
          status?: Database["public"]["Enums"]["punch_item_status"] | null
          subcontractor_id?: string | null
          trade?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          after_photos?: string[] | null
          area?: string | null
          assigned_to?: string | null
          before_photos?: string[] | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          due_date?: string | null
          grid_reference?: string | null
          id?: string
          item_number?: number
          location?: string
          notes?: string | null
          priority?: Database["public"]["Enums"]["punch_item_priority"] | null
          punch_list_id?: string
          resolution_notes?: string | null
          responsible_party?: string | null
          room?: string | null
          specification_reference?: string | null
          status?: Database["public"]["Enums"]["punch_item_status"] | null
          subcontractor_id?: string | null
          trade?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_list_items_punch_list_id_fkey"
            columns: ["punch_list_id"]
            isOneToOne: false
            referencedRelation: "punch_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_items_punch_list_id_fkey"
            columns: ["punch_list_id"]
            isOneToOne: false
            referencedRelation: "v_punch_list_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_items_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_lists: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          completed_items: number | null
          completion_percentage: number | null
          contractor_rep_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          final_sign_off_url: string | null
          id: string
          list_type: string | null
          name: string
          organization_id: string
          owner_rep_name: string | null
          project_id: string
          status: string | null
          total_items: number | null
          updated_at: string | null
          walkthrough_date: string | null
          walkthrough_notes: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          completed_items?: number | null
          completion_percentage?: number | null
          contractor_rep_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          final_sign_off_url?: string | null
          id?: string
          list_type?: string | null
          name: string
          organization_id: string
          owner_rep_name?: string | null
          project_id: string
          status?: string | null
          total_items?: number | null
          updated_at?: string | null
          walkthrough_date?: string | null
          walkthrough_notes?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          completed_items?: number | null
          completion_percentage?: number | null
          contractor_rep_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          final_sign_off_url?: string | null
          id?: string
          list_type?: string | null
          name?: string
          organization_id?: string
          owner_rep_name?: string | null
          project_id?: string
          status?: string | null
          total_items?: number | null
          updated_at?: string | null
          walkthrough_date?: string | null
          walkthrough_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          buy_america_certified: boolean | null
          buy_america_docs_url: string | null
          created_at: string | null
          created_by: string | null
          default_cost_code: string | null
          expiration_date: string | null
          freight_amount: number | null
          id: string
          internal_notes: string | null
          notes: string | null
          organization_id: string
          po_date: string
          po_document_url: string | null
          po_number: string
          project_id: string
          remaining_amount: number | null
          required_date: string | null
          requires_buy_america: boolean | null
          revision_number: number | null
          status: Database["public"]["Enums"]["po_status"] | null
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number | null
          total_amount: number | null
          total_received_amount: number | null
          updated_at: string | null
          vendor_contact: string | null
          vendor_email: string | null
          vendor_name: string
          vendor_phone: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          buy_america_certified?: boolean | null
          buy_america_docs_url?: string | null
          created_at?: string | null
          created_by?: string | null
          default_cost_code?: string | null
          expiration_date?: string | null
          freight_amount?: number | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          organization_id: string
          po_date?: string
          po_document_url?: string | null
          po_number: string
          project_id: string
          remaining_amount?: number | null
          required_date?: string | null
          requires_buy_america?: boolean | null
          revision_number?: number | null
          status?: Database["public"]["Enums"]["po_status"] | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          total_received_amount?: number | null
          updated_at?: string | null
          vendor_contact?: string | null
          vendor_email?: string | null
          vendor_name: string
          vendor_phone?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          buy_america_certified?: boolean | null
          buy_america_docs_url?: string | null
          created_at?: string | null
          created_by?: string | null
          default_cost_code?: string | null
          expiration_date?: string | null
          freight_amount?: number | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          organization_id?: string
          po_date?: string
          po_document_url?: string | null
          po_number?: string
          project_id?: string
          remaining_amount?: number | null
          required_date?: string | null
          requires_buy_america?: boolean | null
          revision_number?: number | null
          status?: Database["public"]["Enums"]["po_status"] | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          total_received_amount?: number | null
          updated_at?: string | null
          vendor_contact?: string | null
          vendor_email?: string | null
          vendor_name?: string
          vendor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          is_selected: boolean | null
          line_item_id: string | null
          notes: string | null
          proposal_id: string
          quantity: number | null
          quote_document_path: string | null
          quote_valid_until: string | null
          quoted_amount: number | null
          quoted_unit_price: number | null
          rejection_reason: string | null
          response_date: string | null
          rfq_document_path: string | null
          scope_description: string | null
          sent_date: string | null
          status: Database["public"]["Enums"]["quote_status_enum"] | null
          unit_of_measure: string | null
          updated_at: string | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_phone: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          is_selected?: boolean | null
          line_item_id?: string | null
          notes?: string | null
          proposal_id: string
          quantity?: number | null
          quote_document_path?: string | null
          quote_valid_until?: string | null
          quoted_amount?: number | null
          quoted_unit_price?: number | null
          rejection_reason?: string | null
          response_date?: string | null
          rfq_document_path?: string | null
          scope_description?: string | null
          sent_date?: string | null
          status?: Database["public"]["Enums"]["quote_status_enum"] | null
          unit_of_measure?: string | null
          updated_at?: string | null
          vendor_email?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
          vendor_phone?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          is_selected?: boolean | null
          line_item_id?: string | null
          notes?: string | null
          proposal_id?: string
          quantity?: number | null
          quote_document_path?: string | null
          quote_valid_until?: string | null
          quoted_amount?: number | null
          quoted_unit_price?: number | null
          rejection_reason?: string | null
          response_date?: string | null
          rfq_document_path?: string | null
          scope_description?: string | null
          sent_date?: string | null
          status?: Database["public"]["Enums"]["quote_status_enum"] | null
          unit_of_measure?: string | null
          updated_at?: string | null
          vendor_email?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
          vendor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "proposal_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_line_item_costing"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "quote_requests_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "bid_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_requests_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      report_photos: {
        Row: {
          ai_description: string | null
          ai_detected_objects: Json | null
          ai_processed_at: string | null
          ai_safety_concerns: string[] | null
          caption: string | null
          created_at: string
          daily_report_entry_id: string | null
          daily_report_id: string | null
          device_make: string | null
          device_model: string | null
          exif_data: Json | null
          file_size_bytes: number | null
          height_px: number | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          latitude: number | null
          location_description: string | null
          longitude: number | null
          mime_type: string | null
          organization_id: string
          photo_category: string | null
          project_id: string
          sort_order: number | null
          storage_bucket: string
          storage_path: string
          tags: string[] | null
          taken_at: string
          taken_by: string
          thumbnail_path: string | null
          updated_at: string
          width_px: number | null
        }
        Insert: {
          ai_description?: string | null
          ai_detected_objects?: Json | null
          ai_processed_at?: string | null
          ai_safety_concerns?: string[] | null
          caption?: string | null
          created_at?: string
          daily_report_entry_id?: string | null
          daily_report_id?: string | null
          device_make?: string | null
          device_model?: string | null
          exif_data?: Json | null
          file_size_bytes?: number | null
          height_px?: number | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          mime_type?: string | null
          organization_id: string
          photo_category?: string | null
          project_id: string
          sort_order?: number | null
          storage_bucket?: string
          storage_path: string
          tags?: string[] | null
          taken_at?: string
          taken_by: string
          thumbnail_path?: string | null
          updated_at?: string
          width_px?: number | null
        }
        Update: {
          ai_description?: string | null
          ai_detected_objects?: Json | null
          ai_processed_at?: string | null
          ai_safety_concerns?: string[] | null
          caption?: string | null
          created_at?: string
          daily_report_entry_id?: string | null
          daily_report_id?: string | null
          device_make?: string | null
          device_model?: string | null
          exif_data?: Json | null
          file_size_bytes?: number | null
          height_px?: number | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location_description?: string | null
          longitude?: number | null
          mime_type?: string | null
          organization_id?: string
          photo_category?: string | null
          project_id?: string
          sort_order?: number | null
          storage_bucket?: string
          storage_path?: string
          tags?: string[] | null
          taken_at?: string
          taken_by?: string
          thumbnail_path?: string | null
          updated_at?: string
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_photos_daily_report_entry_id_fkey"
            columns: ["daily_report_entry_id"]
            isOneToOne: false
            referencedRelation: "daily_report_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_pending_report_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_recent_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "report_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "report_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "report_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "report_photos_taken_by_fkey"
            columns: ["taken_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_attachments: {
        Row: {
          description: string | null
          document_id: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          rfi_id: string
          sort_order: number | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          description?: string | null
          document_id?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          rfi_id: string
          sort_order?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          description?: string | null
          document_id?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          rfi_id?: string
          sort_order?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfi_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "v_open_rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "v_rfi_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_comments: {
        Row: {
          attachments: Json | null
          author_company: string | null
          author_id: string | null
          author_name: string | null
          comment_text: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          rfi_id: string
        }
        Insert: {
          attachments?: Json | null
          author_company?: string | null
          author_id?: string | null
          author_name?: string | null
          comment_text: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          rfi_id: string
        }
        Update: {
          attachments?: Json | null
          author_company?: string | null
          author_id?: string | null
          author_name?: string | null
          comment_text?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          rfi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_comments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_comments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "v_open_rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_comments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "v_rfi_log"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_distribution: {
        Row: {
          created_at: string | null
          external_company: string | null
          external_email: string | null
          external_name: string | null
          id: string
          notified_at: string | null
          recipient_type: string
          rfi_id: string
          role: string | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          created_at?: string | null
          external_company?: string | null
          external_email?: string | null
          external_name?: string | null
          id?: string
          notified_at?: string | null
          recipient_type: string
          rfi_id: string
          role?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          created_at?: string | null
          external_company?: string | null
          external_email?: string | null
          external_name?: string | null
          id?: string
          notified_at?: string | null
          recipient_type?: string
          rfi_id?: string
          role?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfi_distribution_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_distribution_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "v_open_rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_distribution_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "v_rfi_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_distribution_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_settings: {
        Row: {
          architect_contacts: Json | null
          auto_notify_on_response: boolean | null
          auto_notify_on_submit: boolean | null
          default_distribution: Json | null
          default_response_days: number | null
          engineer_contacts: Json | null
          escalation_contacts: Json | null
          escalation_days: number | null
          escalation_enabled: boolean | null
          id: string
          next_number: number | null
          number_prefix: string | null
          owner_contacts: Json | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          architect_contacts?: Json | null
          auto_notify_on_response?: boolean | null
          auto_notify_on_submit?: boolean | null
          default_distribution?: Json | null
          default_response_days?: number | null
          engineer_contacts?: Json | null
          escalation_contacts?: Json | null
          escalation_days?: number | null
          escalation_enabled?: boolean | null
          id?: string
          next_number?: number | null
          number_prefix?: string | null
          owner_contacts?: Json | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          architect_contacts?: Json | null
          auto_notify_on_response?: boolean | null
          auto_notify_on_submit?: boolean | null
          default_distribution?: Json | null
          default_response_days?: number | null
          engineer_contacts?: Json | null
          escalation_contacts?: Json | null
          escalation_days?: number | null
          escalation_enabled?: boolean | null
          id?: string
          next_number?: number | null
          number_prefix?: string | null
          owner_contacts?: Json | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfi_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfi_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfi_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfi_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      rfi_templates: {
        Row: {
          category: Database["public"]["Enums"]["rfi_category"]
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          question_template: string
          subject_template: string
          suggested_priority: Database["public"]["Enums"]["rfi_priority"] | null
          typical_response_days: number | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["rfi_category"]
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          question_template: string
          subject_template: string
          suggested_priority?:
            | Database["public"]["Enums"]["rfi_priority"]
            | null
          typical_response_days?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["rfi_category"]
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          question_template?: string
          subject_template?: string
          suggested_priority?:
            | Database["public"]["Enums"]["rfi_priority"]
            | null
          typical_response_days?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rfi_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfi_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rfis: {
        Row: {
          ball_in_court: string
          category: Database["public"]["Enums"]["rfi_category"]
          closed_at: string | null
          contractor_suggestion: string | null
          cost_impact: boolean | null
          cost_impact_description: string | null
          cost_impact_estimate: number | null
          created_at: string | null
          created_by: string | null
          detail_reference: string | null
          drawing_reference: string | null
          id: string
          location: string | null
          organization_id: string
          priority: Database["public"]["Enums"]["rfi_priority"]
          project_id: string
          question: string
          related_change_order_id: string | null
          related_submittal_id: string | null
          responded_at: string | null
          responded_by: string | null
          response: string | null
          response_attachment_url: string | null
          response_required_by: string | null
          rfi_number: string
          schedule_impact: boolean | null
          schedule_impact_days: number | null
          schedule_impact_description: string | null
          spec_section: string | null
          status: Database["public"]["Enums"]["rfi_status"]
          subcontract_id: string | null
          subcontractor_id: string | null
          subject: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          ball_in_court?: string
          category: Database["public"]["Enums"]["rfi_category"]
          closed_at?: string | null
          contractor_suggestion?: string | null
          cost_impact?: boolean | null
          cost_impact_description?: string | null
          cost_impact_estimate?: number | null
          created_at?: string | null
          created_by?: string | null
          detail_reference?: string | null
          drawing_reference?: string | null
          id?: string
          location?: string | null
          organization_id: string
          priority?: Database["public"]["Enums"]["rfi_priority"]
          project_id: string
          question: string
          related_change_order_id?: string | null
          related_submittal_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          response_attachment_url?: string | null
          response_required_by?: string | null
          rfi_number: string
          schedule_impact?: boolean | null
          schedule_impact_days?: number | null
          schedule_impact_description?: string | null
          spec_section?: string | null
          status?: Database["public"]["Enums"]["rfi_status"]
          subcontract_id?: string | null
          subcontractor_id?: string | null
          subject: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          ball_in_court?: string
          category?: Database["public"]["Enums"]["rfi_category"]
          closed_at?: string | null
          contractor_suggestion?: string | null
          cost_impact?: boolean | null
          cost_impact_description?: string | null
          cost_impact_estimate?: number | null
          created_at?: string | null
          created_by?: string | null
          detail_reference?: string | null
          drawing_reference?: string | null
          id?: string
          location?: string | null
          organization_id?: string
          priority?: Database["public"]["Enums"]["rfi_priority"]
          project_id?: string
          question?: string
          related_change_order_id?: string | null
          related_submittal_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          response_attachment_url?: string | null
          response_required_by?: string | null
          rfi_number?: string
          schedule_impact?: boolean | null
          schedule_impact_days?: number | null
          schedule_impact_description?: string | null
          spec_section?: string | null
          status?: Database["public"]["Enums"]["rfi_status"]
          subcontract_id?: string | null
          subcontractor_id?: string | null
          subject?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "rfis_related_change_order_id_fkey"
            columns: ["related_change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_related_change_order_id_fkey"
            columns: ["related_change_order_id"]
            isOneToOne: false
            referencedRelation: "v_change_order_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "v_pending_submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_related_submittal_id_fkey"
            columns: ["related_submittal_id"]
            isOneToOne: false
            referencedRelation: "v_submittal_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontract_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "v_active_subcontracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_indicators: {
        Row: {
          change_percentage: number | null
          critical_threshold: number | null
          current_value: number
          description: string | null
          id: string
          indicator_name: string
          indicator_type: string
          is_active: boolean | null
          measured_at: string | null
          next_update_at: string | null
          organization_id: string
          previous_value: number | null
          project_id: string | null
          risk_score: number | null
          severity: Database["public"]["Enums"]["alert_severity"] | null
          target_value: number | null
          trend_days: number | null
          trend_direction: string | null
          warning_threshold: number | null
        }
        Insert: {
          change_percentage?: number | null
          critical_threshold?: number | null
          current_value: number
          description?: string | null
          id?: string
          indicator_name: string
          indicator_type: string
          is_active?: boolean | null
          measured_at?: string | null
          next_update_at?: string | null
          organization_id: string
          previous_value?: number | null
          project_id?: string | null
          risk_score?: number | null
          severity?: Database["public"]["Enums"]["alert_severity"] | null
          target_value?: number | null
          trend_days?: number | null
          trend_direction?: string | null
          warning_threshold?: number | null
        }
        Update: {
          change_percentage?: number | null
          critical_threshold?: number | null
          current_value?: number
          description?: string | null
          id?: string
          indicator_name?: string
          indicator_type?: string
          is_active?: boolean | null
          measured_at?: string | null
          next_update_at?: string | null
          organization_id?: string
          previous_value?: number | null
          project_id?: string | null
          risk_score?: number | null
          severity?: Database["public"]["Enums"]["alert_severity"] | null
          target_value?: number | null
          trend_days?: number | null
          trend_direction?: string | null
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_indicators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "risk_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "risk_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "risk_indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      role_module_access: {
        Row: {
          created_at: string | null
          has_access: boolean | null
          id: string
          module_id: string
          role_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          has_access?: boolean | null
          id?: string
          module_id: string
          role_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          has_access?: boolean | null
          id?: string
          module_id?: string
          role_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_module_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "app_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_module_access_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          level: number
          name: string
          organization_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          level: number
          name: string
          organization_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          level?: number
          name?: string
          organization_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_orientations: {
        Row: {
          acknowledged_at: string | null
          conducted_by: string | null
          conducted_date: string
          created_at: string | null
          employee_id: string | null
          id: string
          is_site_specific: boolean | null
          notes: string | null
          organization_id: string
          orientation_type: string
          project_id: string | null
          signature_data: string | null
          subcontractor_worker_id: string | null
          topics_covered: string[] | null
          valid_until: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          conducted_by?: string | null
          conducted_date: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          is_site_specific?: boolean | null
          notes?: string | null
          organization_id: string
          orientation_type?: string
          project_id?: string | null
          signature_data?: string | null
          subcontractor_worker_id?: string | null
          topics_covered?: string[] | null
          valid_until?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          conducted_by?: string | null
          conducted_date?: string
          created_at?: string | null
          employee_id?: string | null
          id?: string
          is_site_specific?: boolean | null
          notes?: string | null
          organization_id?: string
          orientation_type?: string
          project_id?: string | null
          signature_data?: string | null
          subcontractor_worker_id?: string | null
          topics_covered?: string[] | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_orientations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_orientations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_orientations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_orientations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_orientations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_orientations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_orientations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_orientations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_orientations_subcontractor_worker_id_fkey"
            columns: ["subcontractor_worker_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          batch_count: number | null
          batch_key: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          incident_id: string | null
          message_preview: string
          message_type: string
          phone_number: string
          project_id: string | null
          sent_at: string
          status: string
          ticket_id: string | null
          twilio_sid: string | null
          user_id: string | null
        }
        Insert: {
          batch_count?: number | null
          batch_key?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          incident_id?: string | null
          message_preview: string
          message_type: string
          phone_number: string
          project_id?: string | null
          sent_at?: string
          status?: string
          ticket_id?: string | null
          twilio_sid?: string | null
          user_id?: string | null
        }
        Update: {
          batch_count?: number | null
          batch_key?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          incident_id?: string | null
          message_preview?: string
          message_type?: string
          phone_number?: string
          project_id?: string | null
          sent_at?: string
          status?: string
          ticket_id?: string | null
          twilio_sid?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "wv811_emergency_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sms_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sms_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sms_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sms_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_rate_limits: {
        Row: {
          id: string
          message_count: number
          message_type: string
          phone_number: string
          window_start: string
        }
        Insert: {
          id?: string
          message_count?: number
          message_type: string
          phone_number: string
          window_start?: string
        }
        Update: {
          id?: string
          message_count?: number
          message_type?: string
          phone_number?: string
          window_start?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      spec_chunks: {
        Row: {
          chunk_index: number
          chunk_type: Database["public"]["Enums"]["spec_chunk_type"]
          content: string
          content_tokens: number | null
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          keywords: string[] | null
          material_types: string[] | null
          page_number: number | null
          pay_item_codes: string[] | null
          section_context: string | null
          section_id: string | null
          subsection_id: string | null
        }
        Insert: {
          chunk_index: number
          chunk_type: Database["public"]["Enums"]["spec_chunk_type"]
          content: string
          content_tokens?: number | null
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          keywords?: string[] | null
          material_types?: string[] | null
          page_number?: number | null
          pay_item_codes?: string[] | null
          section_context?: string | null
          section_id?: string | null
          subsection_id?: string | null
        }
        Update: {
          chunk_index?: number
          chunk_type?: Database["public"]["Enums"]["spec_chunk_type"]
          content?: string
          content_tokens?: number | null
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          keywords?: string[] | null
          material_types?: string[] | null
          page_number?: number | null
          pay_item_codes?: string[] | null
          section_context?: string | null
          section_id?: string | null
          subsection_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spec_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "spec_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_chunks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "spec_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_chunks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "v_section_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_chunks_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "spec_subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_divisions: {
        Row: {
          created_at: string
          description: string | null
          division_number: number
          document_id: string
          end_page: number | null
          id: string
          sort_order: number
          start_page: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          division_number: number
          document_id: string
          end_page?: number | null
          id?: string
          sort_order?: number
          start_page?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          division_number?: number
          document_id?: string
          end_page?: number | null
          id?: string
          sort_order?: number
          start_page?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spec_divisions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "spec_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_type: Database["public"]["Enums"]["spec_document_type"]
          edition: string | null
          effective_date: string | null
          expiration_date: string | null
          file_hash: string | null
          id: string
          is_active: boolean
          organization_id: string | null
          processing_completed_at: string | null
          processing_error: string | null
          processing_started_at: string | null
          processing_status: Database["public"]["Enums"]["spec_processing_status"]
          source_file_path: string | null
          source_url: string | null
          title: string
          total_chunks: number | null
          total_pages: number | null
          total_sections: number | null
          updated_at: string
          updated_by: string | null
          version_year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_type?: Database["public"]["Enums"]["spec_document_type"]
          edition?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          file_hash?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: Database["public"]["Enums"]["spec_processing_status"]
          source_file_path?: string | null
          source_url?: string | null
          title: string
          total_chunks?: number | null
          total_pages?: number | null
          total_sections?: number | null
          updated_at?: string
          updated_by?: string | null
          version_year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_type?: Database["public"]["Enums"]["spec_document_type"]
          edition?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          file_hash?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: Database["public"]["Enums"]["spec_processing_status"]
          source_file_path?: string | null
          source_url?: string | null
          title?: string
          total_chunks?: number | null
          total_pages?: number | null
          total_sections?: number | null
          updated_at?: string
          updated_by?: string | null
          version_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "spec_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_item_links: {
        Row: {
          created_at: string
          document_id: string
          id: string
          item_description: string | null
          item_number: string
          measurement_subsection_id: string | null
          measurement_summary: string | null
          payment_subsection_id: string | null
          payment_summary: string | null
          primary_section_id: string | null
          related_section_ids: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          item_description?: string | null
          item_number: string
          measurement_subsection_id?: string | null
          measurement_summary?: string | null
          payment_subsection_id?: string | null
          payment_summary?: string | null
          primary_section_id?: string | null
          related_section_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          item_description?: string | null
          item_number?: string
          measurement_subsection_id?: string | null
          measurement_summary?: string | null
          payment_subsection_id?: string | null
          payment_summary?: string | null
          primary_section_id?: string | null
          related_section_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spec_item_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "spec_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_item_links_measurement_subsection_id_fkey"
            columns: ["measurement_subsection_id"]
            isOneToOne: false
            referencedRelation: "spec_subsections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_item_links_payment_subsection_id_fkey"
            columns: ["payment_subsection_id"]
            isOneToOne: false
            referencedRelation: "spec_subsections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_item_links_primary_section_id_fkey"
            columns: ["primary_section_id"]
            isOneToOne: false
            referencedRelation: "spec_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_item_links_primary_section_id_fkey"
            columns: ["primary_section_id"]
            isOneToOne: false
            referencedRelation: "v_section_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_query_log: {
        Row: {
          bid_project_id: string | null
          created_at: string
          feedback_text: string | null
          id: string
          line_item_id: string | null
          organization_id: string | null
          query_embedding: string | null
          query_text: string
          query_time_ms: number | null
          response_text: string | null
          result_count: number | null
          top_chunk_ids: string[] | null
          user_id: string | null
          was_helpful: boolean | null
        }
        Insert: {
          bid_project_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          line_item_id?: string | null
          organization_id?: string | null
          query_embedding?: string | null
          query_text: string
          query_time_ms?: number | null
          response_text?: string | null
          result_count?: number | null
          top_chunk_ids?: string[] | null
          user_id?: string | null
          was_helpful?: boolean | null
        }
        Update: {
          bid_project_id?: string | null
          created_at?: string
          feedback_text?: string | null
          id?: string
          line_item_id?: string | null
          organization_id?: string | null
          query_embedding?: string | null
          query_text?: string
          query_time_ms?: number | null
          response_text?: string | null
          result_count?: number | null
          top_chunk_ids?: string[] | null
          user_id?: string | null
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "spec_query_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_sections: {
        Row: {
          created_at: string
          description: string | null
          division_id: string
          document_id: string
          end_page: number | null
          full_text: string | null
          id: string
          related_pay_items: string[] | null
          section_number: string
          sort_order: number
          start_page: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          division_id: string
          document_id: string
          end_page?: number | null
          full_text?: string | null
          id?: string
          related_pay_items?: string[] | null
          section_number: string
          sort_order?: number
          start_page?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          division_id?: string
          document_id?: string
          end_page?: number | null
          full_text?: string | null
          id?: string
          related_pay_items?: string[] | null
          section_number?: string
          sort_order?: number
          start_page?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spec_sections_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "spec_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_sections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "spec_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_subsections: {
        Row: {
          content: string
          created_at: string
          cross_references: string[] | null
          hierarchy_level: number
          id: string
          page_number: number | null
          parent_subsection_id: string | null
          section_id: string
          sort_order: number
          subsection_number: string
          title: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          cross_references?: string[] | null
          hierarchy_level?: number
          id?: string
          page_number?: number | null
          parent_subsection_id?: string | null
          section_id: string
          sort_order?: number
          subsection_number: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          cross_references?: string[] | null
          hierarchy_level?: number
          id?: string
          page_number?: number | null
          parent_subsection_id?: string | null
          section_id?: string
          sort_order?: number
          subsection_number?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spec_subsections_parent_subsection_id_fkey"
            columns: ["parent_subsection_id"]
            isOneToOne: false
            referencedRelation: "spec_subsections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_subsections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "spec_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_subsections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "v_section_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      spec_tables: {
        Row: {
          created_at: string
          id: string
          page_number: number | null
          raw_text: string | null
          section_id: string
          subsection_id: string | null
          table_data: Json
          table_number: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_number?: number | null
          raw_text?: string | null
          section_id: string
          subsection_id?: string | null
          table_data: Json
          table_number?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          page_number?: number | null
          raw_text?: string | null
          section_id?: string
          subsection_id?: string | null
          table_data?: Json
          table_number?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spec_tables_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "spec_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_tables_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "v_section_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spec_tables_subsection_id_fkey"
            columns: ["subsection_id"]
            isOneToOne: false
            referencedRelation: "spec_subsections"
            referencedColumns: ["id"]
          },
        ]
      }
      special_provision_analysis: {
        Row: {
          affected_line_items: string[] | null
          ai_recommendations: string | null
          ai_summary: string | null
          cost_impact: string | null
          created_at: string | null
          deviation_type: string | null
          estimated_cost_delta: number | null
          id: string
          proposal_id: string
          risk_level: string | null
          schedule_impact_days: number | null
          sp_section: string | null
          sp_title: string | null
          special_requirement: string | null
          standard_requirement: string | null
        }
        Insert: {
          affected_line_items?: string[] | null
          ai_recommendations?: string | null
          ai_summary?: string | null
          cost_impact?: string | null
          created_at?: string | null
          deviation_type?: string | null
          estimated_cost_delta?: number | null
          id?: string
          proposal_id: string
          risk_level?: string | null
          schedule_impact_days?: number | null
          sp_section?: string | null
          sp_title?: string | null
          special_requirement?: string | null
          standard_requirement?: string | null
        }
        Update: {
          affected_line_items?: string[] | null
          ai_recommendations?: string | null
          ai_summary?: string | null
          cost_impact?: string | null
          created_at?: string | null
          deviation_type?: string | null
          estimated_cost_delta?: number | null
          id?: string
          proposal_id?: string
          risk_level?: string | null
          schedule_impact_days?: number | null
          sp_section?: string | null
          sp_title?: string | null
          special_requirement?: string | null
          standard_requirement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "special_provision_analysis_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "bid_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "special_provision_analysis_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontract_agreements: {
        Row: {
          actual_completion_date: string | null
          actual_start_date: string | null
          agreement_number: string
          approved_at: string | null
          approved_by: string | null
          completion_date: string
          created_at: string | null
          created_by: string | null
          current_value: number
          davis_bacon_required: boolean | null
          dbe_credit_amount: number | null
          description: string | null
          id: string
          is_dbe_contract: boolean | null
          organization_id: string
          original_value: number
          payment_bond_amount: number | null
          payment_bond_required: boolean | null
          performance_bond_amount: number | null
          performance_bond_required: boolean | null
          project_id: string
          required_auto_limit: number | null
          required_gl_limit: number | null
          required_workers_comp: boolean | null
          requires_certified_payroll: boolean | null
          retention_percentage: number | null
          scope_of_work: string
          signed_agreement_url: string | null
          start_date: string
          status: Database["public"]["Enums"]["subcontract_status"]
          subcontractor_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          actual_start_date?: string | null
          agreement_number: string
          approved_at?: string | null
          approved_by?: string | null
          completion_date: string
          created_at?: string | null
          created_by?: string | null
          current_value: number
          davis_bacon_required?: boolean | null
          dbe_credit_amount?: number | null
          description?: string | null
          id?: string
          is_dbe_contract?: boolean | null
          organization_id: string
          original_value: number
          payment_bond_amount?: number | null
          payment_bond_required?: boolean | null
          performance_bond_amount?: number | null
          performance_bond_required?: boolean | null
          project_id: string
          required_auto_limit?: number | null
          required_gl_limit?: number | null
          required_workers_comp?: boolean | null
          requires_certified_payroll?: boolean | null
          retention_percentage?: number | null
          scope_of_work: string
          signed_agreement_url?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["subcontract_status"]
          subcontractor_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          actual_start_date?: string | null
          agreement_number?: string
          approved_at?: string | null
          approved_by?: string | null
          completion_date?: string
          created_at?: string | null
          created_by?: string | null
          current_value?: number
          davis_bacon_required?: boolean | null
          dbe_credit_amount?: number | null
          description?: string | null
          id?: string
          is_dbe_contract?: boolean | null
          organization_id?: string
          original_value?: number
          payment_bond_amount?: number | null
          payment_bond_required?: boolean | null
          performance_bond_amount?: number | null
          performance_bond_required?: boolean | null
          project_id?: string
          required_auto_limit?: number | null
          required_gl_limit?: number | null
          required_workers_comp?: boolean | null
          requires_certified_payroll?: boolean | null
          retention_percentage?: number | null
          scope_of_work?: string
          signed_agreement_url?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["subcontract_status"]
          subcontractor_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontract_agreements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_agreements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_agreements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_agreements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontract_agreements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontract_agreements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontract_agreements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontract_agreements_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontract_change_orders: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          change_order_number: string
          created_at: string | null
          description: string
          id: string
          organization_id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subcontract_id: string
          submitted_at: string | null
          submitted_by: string | null
          time_extension_days: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          change_order_number: string
          created_at?: string | null
          description: string
          id?: string
          organization_id: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subcontract_id: string
          submitted_at?: string | null
          submitted_by?: string | null
          time_extension_days?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          change_order_number?: string
          created_at?: string | null
          description?: string
          id?: string
          organization_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subcontract_id?: string
          submitted_at?: string | null
          submitted_by?: string | null
          time_extension_days?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontract_change_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_change_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_change_orders_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_change_orders_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontract_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_change_orders_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "v_active_subcontracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_change_orders_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_compliance: {
        Row: {
          bonds_verified: boolean | null
          certificate_of_insurance_url: string | null
          compliance_notes: string | null
          contract_signed: boolean | null
          drug_testing_compliant: boolean | null
          id: string
          insurance_verified: boolean | null
          issues: string | null
          last_insurance_check: string | null
          last_payroll_check: string | null
          last_safety_check: string | null
          monthly_dbe_reports: boolean | null
          organization_id: string
          payment_bond_url: string | null
          performance_bond_url: string | null
          safety_meetings_attended: boolean | null
          safety_orientation_complete: boolean | null
          subcontract_id: string
          updated_at: string | null
          updated_by: string | null
          w9_received: boolean | null
          weekly_certified_payroll: boolean | null
        }
        Insert: {
          bonds_verified?: boolean | null
          certificate_of_insurance_url?: string | null
          compliance_notes?: string | null
          contract_signed?: boolean | null
          drug_testing_compliant?: boolean | null
          id?: string
          insurance_verified?: boolean | null
          issues?: string | null
          last_insurance_check?: string | null
          last_payroll_check?: string | null
          last_safety_check?: string | null
          monthly_dbe_reports?: boolean | null
          organization_id: string
          payment_bond_url?: string | null
          performance_bond_url?: string | null
          safety_meetings_attended?: boolean | null
          safety_orientation_complete?: boolean | null
          subcontract_id: string
          updated_at?: string | null
          updated_by?: string | null
          w9_received?: boolean | null
          weekly_certified_payroll?: boolean | null
        }
        Update: {
          bonds_verified?: boolean | null
          certificate_of_insurance_url?: string | null
          compliance_notes?: string | null
          contract_signed?: boolean | null
          drug_testing_compliant?: boolean | null
          id?: string
          insurance_verified?: boolean | null
          issues?: string | null
          last_insurance_check?: string | null
          last_payroll_check?: string | null
          last_safety_check?: string | null
          monthly_dbe_reports?: boolean | null
          organization_id?: string
          payment_bond_url?: string | null
          performance_bond_url?: string | null
          safety_meetings_attended?: boolean | null
          safety_orientation_complete?: boolean | null
          subcontract_id?: string
          updated_at?: string | null
          updated_by?: string | null
          w9_received?: boolean | null
          weekly_certified_payroll?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_compliance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_compliance_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontract_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_compliance_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "v_active_subcontracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_compliance_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_daily_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          daily_report_id: string | null
          equipment_on_site: Json | null
          id: string
          issues: string | null
          location: string | null
          log_date: string
          notes: string | null
          organization_id: string
          project_id: string
          subcontract_id: string
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
          work_description: string | null
          workers_by_trade: Json | null
          workers_on_site: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          daily_report_id?: string | null
          equipment_on_site?: Json | null
          id?: string
          issues?: string | null
          location?: string | null
          log_date: string
          notes?: string | null
          organization_id: string
          project_id: string
          subcontract_id: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          work_description?: string | null
          workers_by_trade?: Json | null
          workers_on_site?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          daily_report_id?: string | null
          equipment_on_site?: Json | null
          id?: string
          issues?: string | null
          location?: string | null
          log_date?: string
          notes?: string | null
          organization_id?: string
          project_id?: string
          subcontract_id?: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          work_description?: string | null
          workers_by_trade?: Json | null
          workers_on_site?: number
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_daily_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_pending_report_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_recent_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontract_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "v_active_subcontracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_daily_logs_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_evaluations: {
        Row: {
          communication_comments: string | null
          communication_rating: Database["public"]["Enums"]["performance_rating"]
          created_at: string | null
          documentation_comments: string | null
          documentation_rating: Database["public"]["Enums"]["performance_rating"]
          evaluated_by: string
          evaluation_date: string
          evaluation_type: string
          id: string
          organization_id: string
          overall_comments: string | null
          overall_rating: Database["public"]["Enums"]["performance_rating"]
          project_id: string | null
          quality_comments: string | null
          quality_rating: Database["public"]["Enums"]["performance_rating"]
          recommendation_notes: string | null
          safety_comments: string | null
          safety_rating: Database["public"]["Enums"]["performance_rating"]
          schedule_comments: string | null
          schedule_rating: Database["public"]["Enums"]["performance_rating"]
          subcontract_id: string | null
          subcontractor_id: string
          updated_at: string | null
          would_hire_again: boolean | null
        }
        Insert: {
          communication_comments?: string | null
          communication_rating: Database["public"]["Enums"]["performance_rating"]
          created_at?: string | null
          documentation_comments?: string | null
          documentation_rating: Database["public"]["Enums"]["performance_rating"]
          evaluated_by: string
          evaluation_date: string
          evaluation_type: string
          id?: string
          organization_id: string
          overall_comments?: string | null
          overall_rating: Database["public"]["Enums"]["performance_rating"]
          project_id?: string | null
          quality_comments?: string | null
          quality_rating: Database["public"]["Enums"]["performance_rating"]
          recommendation_notes?: string | null
          safety_comments?: string | null
          safety_rating: Database["public"]["Enums"]["performance_rating"]
          schedule_comments?: string | null
          schedule_rating: Database["public"]["Enums"]["performance_rating"]
          subcontract_id?: string | null
          subcontractor_id: string
          updated_at?: string | null
          would_hire_again?: boolean | null
        }
        Update: {
          communication_comments?: string | null
          communication_rating?: Database["public"]["Enums"]["performance_rating"]
          created_at?: string | null
          documentation_comments?: string | null
          documentation_rating?: Database["public"]["Enums"]["performance_rating"]
          evaluated_by?: string
          evaluation_date?: string
          evaluation_type?: string
          id?: string
          organization_id?: string
          overall_comments?: string | null
          overall_rating?: Database["public"]["Enums"]["performance_rating"]
          project_id?: string | null
          quality_comments?: string | null
          quality_rating?: Database["public"]["Enums"]["performance_rating"]
          recommendation_notes?: string | null
          safety_comments?: string | null
          safety_rating?: Database["public"]["Enums"]["performance_rating"]
          schedule_comments?: string | null
          schedule_rating?: Database["public"]["Enums"]["performance_rating"]
          subcontract_id?: string | null
          subcontractor_id?: string
          updated_at?: string | null
          would_hire_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "subcontractor_evaluations_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontract_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_evaluations_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "v_active_subcontracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_evaluations_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_insurance: {
        Row: {
          additional_insured: boolean | null
          aggregate_limit: number | null
          carrier_name: string
          certificate_holder: string | null
          certificate_url: string | null
          coverage_amount: number | null
          created_at: string
          created_by: string | null
          deductible: number | null
          effective_date: string
          expiration_date: string
          id: string
          insurance_type: string
          is_current: boolean | null
          is_verified: boolean | null
          policy_number: string
          subcontractor_id: string
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
          waiver_of_subrogation: boolean | null
        }
        Insert: {
          additional_insured?: boolean | null
          aggregate_limit?: number | null
          carrier_name: string
          certificate_holder?: string | null
          certificate_url?: string | null
          coverage_amount?: number | null
          created_at?: string
          created_by?: string | null
          deductible?: number | null
          effective_date: string
          expiration_date: string
          id?: string
          insurance_type: string
          is_current?: boolean | null
          is_verified?: boolean | null
          policy_number: string
          subcontractor_id: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          waiver_of_subrogation?: boolean | null
        }
        Update: {
          additional_insured?: boolean | null
          aggregate_limit?: number | null
          carrier_name?: string
          certificate_holder?: string | null
          certificate_url?: string | null
          coverage_amount?: number | null
          created_at?: string
          created_by?: string | null
          deductible?: number | null
          effective_date?: string
          expiration_date?: string
          id?: string
          insurance_type?: string
          is_current?: boolean | null
          is_verified?: boolean | null
          policy_number?: string
          subcontractor_id?: string
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          waiver_of_subrogation?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_insurance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_insurance_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_insurance_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_insurance_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_invoice_lines: {
        Row: {
          balance_to_finish: number
          cost_code: string | null
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          item_number: number
          materials_stored: number | null
          percent_complete: number
          previous_applications: number | null
          scheduled_value: number
          this_period: number
          total_completed: number
          updated_at: string | null
        }
        Insert: {
          balance_to_finish: number
          cost_code?: string | null
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          item_number: number
          materials_stored?: number | null
          percent_complete: number
          previous_applications?: number | null
          scheduled_value: number
          this_period: number
          total_completed: number
          updated_at?: string | null
        }
        Update: {
          balance_to_finish?: number
          cost_code?: string | null
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          item_number?: number
          materials_stored?: number | null
          percent_complete?: number
          previous_applications?: number | null
          scheduled_value?: number
          this_period?: number
          total_completed?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_pending_sub_payments"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      subcontractor_invoices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          certified_payroll_attached: boolean | null
          certified_payroll_verified: boolean | null
          check_number: string | null
          conditional_waiver_received: boolean | null
          created_at: string | null
          created_by: string | null
          current_payment_due: number
          id: string
          invoice_number: string
          less_previous_payments: number | null
          materials_stored: number | null
          organization_id: string
          paid_at: string | null
          pay_application_number: number
          period_end: string
          period_start: string
          retention_amount: number
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_value: number
          status: Database["public"]["Enums"]["invoice_status"]
          subcontract_id: string
          submitted_at: string | null
          total_completed_and_stored: number
          total_earned_less_retention: number
          unconditional_waiver_received: boolean | null
          updated_at: string | null
          work_completed_previous: number | null
          work_completed_this_period: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          certified_payroll_attached?: boolean | null
          certified_payroll_verified?: boolean | null
          check_number?: string | null
          conditional_waiver_received?: boolean | null
          created_at?: string | null
          created_by?: string | null
          current_payment_due: number
          id?: string
          invoice_number: string
          less_previous_payments?: number | null
          materials_stored?: number | null
          organization_id: string
          paid_at?: string | null
          pay_application_number: number
          period_end: string
          period_start: string
          retention_amount: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_value: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subcontract_id: string
          submitted_at?: string | null
          total_completed_and_stored: number
          total_earned_less_retention: number
          unconditional_waiver_received?: boolean | null
          updated_at?: string | null
          work_completed_previous?: number | null
          work_completed_this_period: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          certified_payroll_attached?: boolean | null
          certified_payroll_verified?: boolean | null
          check_number?: string | null
          conditional_waiver_received?: boolean | null
          created_at?: string | null
          created_by?: string | null
          current_payment_due?: number
          id?: string
          invoice_number?: string
          less_previous_payments?: number | null
          materials_stored?: number | null
          organization_id?: string
          paid_at?: string | null
          pay_application_number?: number
          period_end?: string
          period_start?: string
          retention_amount?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_value?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subcontract_id?: string
          submitted_at?: string | null
          total_completed_and_stored?: number
          total_earned_less_retention?: number
          unconditional_waiver_received?: boolean | null
          updated_at?: string | null
          work_completed_previous?: number | null
          work_completed_this_period?: number
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_invoices_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_invoices_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontract_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_invoices_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "v_active_subcontracts"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_workers: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string
          has_site_orientation: boolean | null
          id: string
          last_name: string
          notes: string | null
          orientation_date: string | null
          phone: string | null
          safety_cert_expires: string | null
          status: string | null
          subcontractor_id: string
          trade_classification: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name: string
          has_site_orientation?: boolean | null
          id?: string
          last_name: string
          notes?: string | null
          orientation_date?: string | null
          phone?: string | null
          safety_cert_expires?: string | null
          status?: string | null
          subcontractor_id: string
          trade_classification?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string
          has_site_orientation?: boolean | null
          id?: string
          last_name?: string
          notes?: string | null
          orientation_date?: string | null
          phone?: string | null
          safety_cert_expires?: string | null
          status?: string | null
          subcontractor_id?: string
          trade_classification?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_workers_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          active_contract_count: number | null
          address_line1: string | null
          address_line2: string | null
          aggregate_limit: number | null
          bonding_company: string | null
          business_type: string | null
          city: string | null
          company_name: string
          contractor_license_expiration: string | null
          contractor_license_number: string | null
          contractor_license_state: string | null
          created_at: string
          created_by: string | null
          dba_name: string | null
          dbe_certification_expiration: string | null
          dbe_certification_number: string | null
          dbe_certifying_agency: string | null
          default_payment_terms: string | null
          default_retainage_percent: number | null
          deleted_at: string | null
          deleted_by: string | null
          emr_rate: number | null
          emr_year: number | null
          id: string
          is_dbe_certified: boolean | null
          is_prequalified: boolean | null
          minority_classification: string | null
          notes: string | null
          office_fax: string | null
          office_phone: string | null
          organization_id: string
          osha_recordable_rate: number | null
          performance_rating: number | null
          prequalification_date: string | null
          prequalification_expiration: string | null
          prequalification_notes: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          primary_contact_title: string | null
          primary_trade: string
          secondary_trades: string[] | null
          single_project_limit: number | null
          state: string | null
          status: string
          status_reason: string | null
          tax_id: string | null
          total_contract_value: number | null
          updated_at: string
          updated_by: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          active_contract_count?: number | null
          address_line1?: string | null
          address_line2?: string | null
          aggregate_limit?: number | null
          bonding_company?: string | null
          business_type?: string | null
          city?: string | null
          company_name: string
          contractor_license_expiration?: string | null
          contractor_license_number?: string | null
          contractor_license_state?: string | null
          created_at?: string
          created_by?: string | null
          dba_name?: string | null
          dbe_certification_expiration?: string | null
          dbe_certification_number?: string | null
          dbe_certifying_agency?: string | null
          default_payment_terms?: string | null
          default_retainage_percent?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          emr_rate?: number | null
          emr_year?: number | null
          id?: string
          is_dbe_certified?: boolean | null
          is_prequalified?: boolean | null
          minority_classification?: string | null
          notes?: string | null
          office_fax?: string | null
          office_phone?: string | null
          organization_id: string
          osha_recordable_rate?: number | null
          performance_rating?: number | null
          prequalification_date?: string | null
          prequalification_expiration?: string | null
          prequalification_notes?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          primary_contact_title?: string | null
          primary_trade: string
          secondary_trades?: string[] | null
          single_project_limit?: number | null
          state?: string | null
          status?: string
          status_reason?: string | null
          tax_id?: string | null
          total_contract_value?: number | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          active_contract_count?: number | null
          address_line1?: string | null
          address_line2?: string | null
          aggregate_limit?: number | null
          bonding_company?: string | null
          business_type?: string | null
          city?: string | null
          company_name?: string
          contractor_license_expiration?: string | null
          contractor_license_number?: string | null
          contractor_license_state?: string | null
          created_at?: string
          created_by?: string | null
          dba_name?: string | null
          dbe_certification_expiration?: string | null
          dbe_certification_number?: string | null
          dbe_certifying_agency?: string | null
          default_payment_terms?: string | null
          default_retainage_percent?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          emr_rate?: number | null
          emr_year?: number | null
          id?: string
          is_dbe_certified?: boolean | null
          is_prequalified?: boolean | null
          minority_classification?: string | null
          notes?: string | null
          office_fax?: string | null
          office_phone?: string | null
          organization_id?: string
          osha_recordable_rate?: number | null
          performance_rating?: number | null
          prequalification_date?: string | null
          prequalification_expiration?: string | null
          prequalification_notes?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          primary_contact_title?: string | null
          primary_trade?: string
          secondary_trades?: string[] | null
          single_project_limit?: number | null
          state?: string | null
          status?: string
          status_reason?: string | null
          tax_id?: string | null
          total_contract_value?: number | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractors_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractors_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_attachments: {
        Row: {
          attachment_type: string | null
          created_at: string | null
          document_id: string
          id: string
          sort_order: number | null
          submittal_id: string
        }
        Insert: {
          attachment_type?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          sort_order?: number | null
          submittal_id: string
        }
        Update: {
          attachment_type?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          sort_order?: number | null
          submittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_attachments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_attachments_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_attachments_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "v_pending_submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_attachments_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "v_submittal_log"
            referencedColumns: ["id"]
          },
        ]
      }
      submittals: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          original_submittal_id: string | null
          project_id: string
          required_date: string | null
          required_on_site_date: string | null
          resubmittal_count: number | null
          review_comments: string | null
          review_days: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_number: number | null
          spec_section: string
          spec_section_title: string | null
          status: Database["public"]["Enums"]["submittal_status"]
          subcontract_id: string | null
          subcontractor_id: string | null
          submittal_number: string
          submittal_type: string
          submitted_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id: string
          original_submittal_id?: string | null
          project_id: string
          required_date?: string | null
          required_on_site_date?: string | null
          resubmittal_count?: number | null
          review_comments?: string | null
          review_days?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number?: number | null
          spec_section: string
          spec_section_title?: string | null
          status?: Database["public"]["Enums"]["submittal_status"]
          subcontract_id?: string | null
          subcontractor_id?: string | null
          submittal_number: string
          submittal_type: string
          submitted_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          original_submittal_id?: string | null
          project_id?: string
          required_date?: string | null
          required_on_site_date?: string | null
          resubmittal_count?: number | null
          review_comments?: string | null
          review_days?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number?: number | null
          spec_section?: string
          spec_section_title?: string | null
          status?: Database["public"]["Enums"]["submittal_status"]
          subcontract_id?: string | null
          subcontractor_id?: string | null
          submittal_number?: string
          submittal_type?: string
          submitted_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_original_submittal_id_fkey"
            columns: ["original_submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_original_submittal_id_fkey"
            columns: ["original_submittal_id"]
            isOneToOne: false
            referencedRelation: "v_pending_submittals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_original_submittal_id_fkey"
            columns: ["original_submittal_id"]
            isOneToOne: false
            referencedRelation: "v_submittal_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "submittals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "subcontract_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_subcontract_id_fkey"
            columns: ["subcontract_id"]
            isOneToOne: false
            referencedRelation: "v_active_subcontracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          approved_materials: Json | null
          buy_america_certified: boolean | null
          city: string | null
          company_name: string
          created_at: string
          created_by: string | null
          credit_limit: number | null
          dba_name: string | null
          dbe_certification_expiration: string | null
          dbe_certification_number: string | null
          default_payment_terms: string | null
          deleted_at: string | null
          deleted_by: string | null
          delivery_fee: number | null
          delivery_lead_time_days: number | null
          domestic_content_percentage: number | null
          dot_approval_states: string[] | null
          id: string
          is_dbe_certified: boolean | null
          is_dot_approved: boolean | null
          is_wvdoh_approved: boolean | null
          material_categories: string[]
          minimum_order_amount: number | null
          notes: string | null
          office_fax: string | null
          office_phone: string | null
          on_time_delivery_rate: number | null
          organization_id: string
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          quality_rating: number | null
          rejection_rate: number | null
          sales_rep_email: string | null
          sales_rep_name: string | null
          sales_rep_phone: string | null
          state: string | null
          status: string
          tax_id: string | null
          updated_at: string
          updated_by: string | null
          vendor_code: string | null
          website: string | null
          wvdoh_approval_expiration: string | null
          wvdoh_approval_number: string | null
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          approved_materials?: Json | null
          buy_america_certified?: boolean | null
          city?: string | null
          company_name: string
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          dba_name?: string | null
          dbe_certification_expiration?: string | null
          dbe_certification_number?: string | null
          default_payment_terms?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_fee?: number | null
          delivery_lead_time_days?: number | null
          domestic_content_percentage?: number | null
          dot_approval_states?: string[] | null
          id?: string
          is_dbe_certified?: boolean | null
          is_dot_approved?: boolean | null
          is_wvdoh_approved?: boolean | null
          material_categories: string[]
          minimum_order_amount?: number | null
          notes?: string | null
          office_fax?: string | null
          office_phone?: string | null
          on_time_delivery_rate?: number | null
          organization_id: string
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          quality_rating?: number | null
          rejection_rate?: number | null
          sales_rep_email?: string | null
          sales_rep_name?: string | null
          sales_rep_phone?: string | null
          state?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_code?: string | null
          website?: string | null
          wvdoh_approval_expiration?: string | null
          wvdoh_approval_number?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          approved_materials?: Json | null
          buy_america_certified?: boolean | null
          city?: string | null
          company_name?: string
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          dba_name?: string | null
          dbe_certification_expiration?: string | null
          dbe_certification_number?: string | null
          default_payment_terms?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delivery_fee?: number | null
          delivery_lead_time_days?: number | null
          domestic_content_percentage?: number | null
          dot_approval_states?: string[] | null
          id?: string
          is_dbe_certified?: boolean | null
          is_dot_approved?: boolean | null
          is_wvdoh_approved?: boolean | null
          material_categories?: string[]
          minimum_order_amount?: number | null
          notes?: string | null
          office_fax?: string | null
          office_phone?: string | null
          on_time_delivery_rate?: number | null
          organization_id?: string
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          quality_rating?: number | null
          rejection_rate?: number | null
          sales_rep_email?: string | null
          sales_rep_name?: string | null
          sales_rep_phone?: string | null
          state?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_code?: string | null
          website?: string | null
          wvdoh_approval_expiration?: string | null
          wvdoh_approval_number?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_logs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          certified_payroll_id: string | null
          cost_code: string
          created_at: string | null
          created_by: string | null
          crew_assignment_id: string | null
          employee_id: string
          end_time: string | null
          equipment_description: string | null
          equipment_id: string | null
          fringe_owed: number | null
          gps_verified: boolean | null
          gross_double_time: number | null
          gross_overtime: number | null
          gross_regular: number | null
          hours_double_time: number | null
          hours_overtime: number | null
          hours_regular: number | null
          hours_total: number | null
          id: string
          latitude: number | null
          locked_base_rate: number
          locked_fringe_rate: number
          locked_total_rate: number | null
          longitude: number | null
          organization_id: string
          prevailing_wage_class: string
          project_id: string
          rejection_reason: string | null
          start_time: string
          status: string | null
          submitted_at: string | null
          task_description: string | null
          updated_at: string | null
          work_classification: Database["public"]["Enums"]["work_classification"]
          work_date: string
          work_location: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          certified_payroll_id?: string | null
          cost_code: string
          created_at?: string | null
          created_by?: string | null
          crew_assignment_id?: string | null
          employee_id: string
          end_time?: string | null
          equipment_description?: string | null
          equipment_id?: string | null
          fringe_owed?: number | null
          gps_verified?: boolean | null
          gross_double_time?: number | null
          gross_overtime?: number | null
          gross_regular?: number | null
          hours_double_time?: number | null
          hours_overtime?: number | null
          hours_regular?: number | null
          hours_total?: number | null
          id?: string
          latitude?: number | null
          locked_base_rate: number
          locked_fringe_rate?: number
          locked_total_rate?: number | null
          longitude?: number | null
          organization_id: string
          prevailing_wage_class: string
          project_id: string
          rejection_reason?: string | null
          start_time: string
          status?: string | null
          submitted_at?: string | null
          task_description?: string | null
          updated_at?: string | null
          work_classification: Database["public"]["Enums"]["work_classification"]
          work_date: string
          work_location?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          certified_payroll_id?: string | null
          cost_code?: string
          created_at?: string | null
          created_by?: string | null
          crew_assignment_id?: string | null
          employee_id?: string
          end_time?: string | null
          equipment_description?: string | null
          equipment_id?: string | null
          fringe_owed?: number | null
          gps_verified?: boolean | null
          gross_double_time?: number | null
          gross_overtime?: number | null
          gross_regular?: number | null
          hours_double_time?: number | null
          hours_overtime?: number | null
          hours_regular?: number | null
          hours_total?: number | null
          id?: string
          latitude?: number | null
          locked_base_rate?: number
          locked_fringe_rate?: number
          locked_total_rate?: number | null
          longitude?: number | null
          organization_id?: string
          prevailing_wage_class?: string
          project_id?: string
          rejection_reason?: string | null
          start_time?: string
          status?: string | null
          submitted_at?: string | null
          task_description?: string | null
          updated_at?: string | null
          work_classification?: Database["public"]["Enums"]["work_classification"]
          work_date?: string
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_crew_assignment_id_fkey"
            columns: ["crew_assignment_id"]
            isOneToOne: false
            referencedRelation: "crew_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_crew_assignment_id_fkey"
            columns: ["crew_assignment_id"]
            isOneToOne: false
            referencedRelation: "v_daily_crew_schedule"
            referencedColumns: ["assignment_id"]
          },
          {
            foreignKeyName: "task_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment_health_overview"
            referencedColumns: ["equipment_id"]
          },
          {
            foreignKeyName: "task_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "v_equipment_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "task_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "task_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "task_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      test_results: {
        Row: {
          additional_results: Json | null
          air_content: number | null
          batch_number: string | null
          created_at: string | null
          created_by: string | null
          failure_notes: string | null
          id: string
          inspection_id: string | null
          lab_name: string | null
          lab_report_url: string | null
          mat_temperature: number | null
          material_description: string | null
          material_source: string | null
          material_ticket_id: string | null
          meets_specification: boolean | null
          mix_design: string | null
          ncr_id: string | null
          notes: string | null
          oil_content: number | null
          organization_id: string
          photos: string[] | null
          project_id: string
          result_unit: string | null
          result_value: number | null
          sample_date: string
          sample_id: string | null
          sample_location: string | null
          sample_time: string | null
          slump: number | null
          specification_max: number | null
          specification_min: number | null
          station: string | null
          status: Database["public"]["Enums"]["test_status"] | null
          temperature: number | null
          test_age_days: number | null
          test_date: string | null
          test_number: string
          test_type_id: string | null
          tested_by: string | null
          updated_at: string | null
          wvdoh_form_submitted: boolean | null
          wvdoh_submission_date: string | null
        }
        Insert: {
          additional_results?: Json | null
          air_content?: number | null
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          failure_notes?: string | null
          id?: string
          inspection_id?: string | null
          lab_name?: string | null
          lab_report_url?: string | null
          mat_temperature?: number | null
          material_description?: string | null
          material_source?: string | null
          material_ticket_id?: string | null
          meets_specification?: boolean | null
          mix_design?: string | null
          ncr_id?: string | null
          notes?: string | null
          oil_content?: number | null
          organization_id: string
          photos?: string[] | null
          project_id: string
          result_unit?: string | null
          result_value?: number | null
          sample_date: string
          sample_id?: string | null
          sample_location?: string | null
          sample_time?: string | null
          slump?: number | null
          specification_max?: number | null
          specification_min?: number | null
          station?: string | null
          status?: Database["public"]["Enums"]["test_status"] | null
          temperature?: number | null
          test_age_days?: number | null
          test_date?: string | null
          test_number: string
          test_type_id?: string | null
          tested_by?: string | null
          updated_at?: string | null
          wvdoh_form_submitted?: boolean | null
          wvdoh_submission_date?: string | null
        }
        Update: {
          additional_results?: Json | null
          air_content?: number | null
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          failure_notes?: string | null
          id?: string
          inspection_id?: string | null
          lab_name?: string | null
          lab_report_url?: string | null
          mat_temperature?: number | null
          material_description?: string | null
          material_source?: string | null
          material_ticket_id?: string | null
          meets_specification?: boolean | null
          mix_design?: string | null
          ncr_id?: string | null
          notes?: string | null
          oil_content?: number | null
          organization_id?: string
          photos?: string[] | null
          project_id?: string
          result_unit?: string | null
          result_value?: number | null
          sample_date?: string
          sample_id?: string | null
          sample_location?: string | null
          sample_time?: string | null
          slump?: number | null
          specification_max?: number | null
          specification_min?: number | null
          station?: string | null
          status?: Database["public"]["Enums"]["test_status"] | null
          temperature?: number | null
          test_age_days?: number | null
          test_date?: string | null
          test_number?: string
          test_type_id?: string | null
          tested_by?: string | null
          updated_at?: string | null
          wvdoh_form_submitted?: boolean | null
          wvdoh_submission_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_material_ticket_id_fkey"
            columns: ["material_ticket_id"]
            isOneToOne: false
            referencedRelation: "material_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_material_ticket_id_fkey"
            columns: ["material_ticket_id"]
            isOneToOne: false
            referencedRelation: "v_tickets_pending_verification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_test_type_id_fkey"
            columns: ["test_type_id"]
            isOneToOne: false
            referencedRelation: "test_types"
            referencedColumns: ["id"]
          },
        ]
      }
      test_types: {
        Row: {
          category: Database["public"]["Enums"]["test_category"]
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          max_value: number | null
          min_value: number | null
          name: string
          organization_id: string
          required_frequency: string | null
          specification_reference: string | null
          target_value: number | null
          test_method: string | null
          unit_of_measure: string | null
          updated_at: string | null
          wvdoh_form_number: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["test_category"]
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          max_value?: number | null
          min_value?: number | null
          name: string
          organization_id: string
          required_frequency?: string | null
          specification_reference?: string | null
          target_value?: number | null
          test_method?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
          wvdoh_form_number?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["test_category"]
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          max_value?: number | null
          min_value?: number | null
          name?: string
          organization_id?: string
          required_frequency?: string | null
          specification_reference?: string | null
          target_value?: number | null
          test_method?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
          wvdoh_form_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bonus: number | null
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          cost_code: string | null
          cost_code_id: string | null
          created_at: string
          created_by: string | null
          crew_member_id: string
          daily_report_id: string | null
          deductions: number | null
          deleted_at: string | null
          deleted_by: string | null
          double_time_hours: number | null
          double_time_pay: number | null
          double_time_rate: number | null
          entered_by_user_id: string
          entry_method: string | null
          fringe_pay: number | null
          fringe_rate: number | null
          hourly_rate: number | null
          id: string
          is_holiday: boolean | null
          is_saturday: boolean | null
          is_sunday: boolean | null
          location_verified: boolean | null
          lunch_minutes: number | null
          notes: string | null
          organization_id: string
          overtime_hours: number | null
          overtime_pay: number | null
          overtime_rate: number | null
          pay_period_id: string | null
          per_diem: number | null
          project_id: string
          regular_hours: number | null
          regular_pay: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requires_overnight: boolean | null
          status: string
          submitted_at: string | null
          time_in: string | null
          time_out: string | null
          total_hours: number | null
          trade_classification: string
          travel_pay: number | null
          updated_at: string
          updated_by: string | null
          wage_rate_id: string | null
          work_date: string
          work_description: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bonus?: number | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          cost_code?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          crew_member_id: string
          daily_report_id?: string | null
          deductions?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          double_time_hours?: number | null
          double_time_pay?: number | null
          double_time_rate?: number | null
          entered_by_user_id: string
          entry_method?: string | null
          fringe_pay?: number | null
          fringe_rate?: number | null
          hourly_rate?: number | null
          id?: string
          is_holiday?: boolean | null
          is_saturday?: boolean | null
          is_sunday?: boolean | null
          location_verified?: boolean | null
          lunch_minutes?: number | null
          notes?: string | null
          organization_id: string
          overtime_hours?: number | null
          overtime_pay?: number | null
          overtime_rate?: number | null
          pay_period_id?: string | null
          per_diem?: number | null
          project_id: string
          regular_hours?: number | null
          regular_pay?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_overnight?: boolean | null
          status?: string
          submitted_at?: string | null
          time_in?: string | null
          time_out?: string | null
          total_hours?: number | null
          trade_classification: string
          travel_pay?: number | null
          updated_at?: string
          updated_by?: string | null
          wage_rate_id?: string | null
          work_date: string
          work_description?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bonus?: number | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          cost_code?: string | null
          cost_code_id?: string | null
          created_at?: string
          created_by?: string | null
          crew_member_id?: string
          daily_report_id?: string | null
          deductions?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          double_time_hours?: number | null
          double_time_pay?: number | null
          double_time_rate?: number | null
          entered_by_user_id?: string
          entry_method?: string | null
          fringe_pay?: number | null
          fringe_rate?: number | null
          hourly_rate?: number | null
          id?: string
          is_holiday?: boolean | null
          is_saturday?: boolean | null
          is_sunday?: boolean | null
          location_verified?: boolean | null
          lunch_minutes?: number | null
          notes?: string | null
          organization_id?: string
          overtime_hours?: number | null
          overtime_pay?: number | null
          overtime_rate?: number | null
          pay_period_id?: string | null
          per_diem?: number | null
          project_id?: string
          regular_hours?: number | null
          regular_pay?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_overnight?: boolean | null
          status?: string
          submitted_at?: string | null
          time_in?: string | null
          time_out?: string | null
          total_hours?: number | null
          trade_classification?: string
          travel_pay?: number | null
          updated_at?: string
          updated_by?: string | null
          wage_rate_id?: string | null
          work_date?: string
          work_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_cost_code_id_fkey"
            columns: ["cost_code_id"]
            isOneToOne: false
            referencedRelation: "cost_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "v_active_crew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_pending_report_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_recent_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_entered_by_user_id_fkey"
            columns: ["entered_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_pay_period_id_fkey"
            columns: ["pay_period_id"]
            isOneToOne: false
            referencedRelation: "pay_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_wage_rate_id_fkey"
            columns: ["wage_rate_id"]
            isOneToOne: false
            referencedRelation: "wage_rates"
            referencedColumns: ["id"]
          },
        ]
      }
      time_extension_requests: {
        Row: {
          affected_activities: string | null
          change_order_id: string | null
          created_at: string | null
          created_by: string | null
          daily_report_ids: string[] | null
          days_granted: number | null
          days_requested: number
          delay_end_date: string | null
          delay_start_date: string
          description: string
          id: string
          organization_id: string
          project_id: string
          reason: string
          request_number: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          supporting_documents: Json | null
          title: string
          updated_at: string | null
          weather_data: Json | null
        }
        Insert: {
          affected_activities?: string | null
          change_order_id?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_ids?: string[] | null
          days_granted?: number | null
          days_requested: number
          delay_end_date?: string | null
          delay_start_date: string
          description: string
          id?: string
          organization_id: string
          project_id: string
          reason: string
          request_number: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supporting_documents?: Json | null
          title: string
          updated_at?: string | null
          weather_data?: Json | null
        }
        Update: {
          affected_activities?: string | null
          change_order_id?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_report_ids?: string[] | null
          days_granted?: number | null
          days_requested?: number
          delay_end_date?: string | null
          delay_start_date?: string
          description?: string
          id?: string
          organization_id?: string
          project_id?: string
          reason?: string
          request_number?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          supporting_documents?: Json | null
          title?: string
          updated_at?: string | null
          weather_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "time_extension_requests_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_extension_requests_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "v_change_order_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_extension_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_extension_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_extension_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_extension_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_extension_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_extension_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_extension_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_extension_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_extension_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      toolbox_talk_attendance: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          signature_data: string | null
          subcontractor_worker_id: string | null
          toolbox_talk_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          signature_data?: string | null
          subcontractor_worker_id?: string | null
          toolbox_talk_id: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          signature_data?: string | null
          subcontractor_worker_id?: string | null
          toolbox_talk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talk_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_attendance_subcontractor_worker_id_fkey"
            columns: ["subcontractor_worker_id"]
            isOneToOne: false
            referencedRelation: "subcontractor_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talk_attendance_toolbox_talk_id_fkey"
            columns: ["toolbox_talk_id"]
            isOneToOne: false
            referencedRelation: "toolbox_talks"
            referencedColumns: ["id"]
          },
        ]
      }
      toolbox_talks: {
        Row: {
          acknowledged_count: number | null
          conducted_date: string
          conducted_time: string | null
          content: string | null
          created_at: string | null
          duration_minutes: number | null
          hazards_discussed: string | null
          id: string
          notes: string | null
          organization_id: string
          presenter_id: string | null
          presenter_name: string | null
          project_id: string | null
          questions_asked: string | null
          safety_measures: string | null
          topic: string
          topic_code: string | null
          total_attendees: number | null
          updated_at: string | null
        }
        Insert: {
          acknowledged_count?: number | null
          conducted_date: string
          conducted_time?: string | null
          content?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          hazards_discussed?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          presenter_id?: string | null
          presenter_name?: string | null
          project_id?: string | null
          questions_asked?: string | null
          safety_measures?: string | null
          topic: string
          topic_code?: string | null
          total_attendees?: number | null
          updated_at?: string | null
        }
        Update: {
          acknowledged_count?: number | null
          conducted_date?: string
          conducted_time?: string | null
          content?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          hazards_discussed?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          presenter_id?: string | null
          presenter_name?: string | null
          project_id?: string | null
          questions_asked?: string | null
          safety_measures?: string | null
          topic?: string
          topic_code?: string | null
          total_attendees?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "toolbox_talks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "toolbox_talks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      transmittal_items: {
        Row: {
          copies: number | null
          created_at: string | null
          description: string
          document_id: string | null
          document_number: string | null
          id: string
          revision: string | null
          sort_order: number | null
          transmittal_id: string
        }
        Insert: {
          copies?: number | null
          created_at?: string | null
          description: string
          document_id?: string | null
          document_number?: string | null
          id?: string
          revision?: string | null
          sort_order?: number | null
          transmittal_id: string
        }
        Update: {
          copies?: number | null
          created_at?: string | null
          description?: string
          document_id?: string | null
          document_number?: string | null
          id?: string
          revision?: string | null
          sort_order?: number | null
          transmittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transmittal_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittal_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_recent_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittal_items_transmittal_id_fkey"
            columns: ["transmittal_id"]
            isOneToOne: false
            referencedRelation: "transmittals"
            referencedColumns: ["id"]
          },
        ]
      }
      transmittals: {
        Row: {
          cc_contacts: Json | null
          created_at: string | null
          created_by: string | null
          for_action: string | null
          from_user_id: string | null
          id: string
          message: string | null
          organization_id: string
          project_id: string
          response_due_date: string | null
          response_received: boolean | null
          response_received_at: string | null
          response_required: boolean | null
          sent_at: string | null
          sent_via: string | null
          subject: string
          to_company: string
          to_contact: string
          to_email: string | null
          tracking_number: string | null
          transmittal_number: string
          updated_at: string | null
        }
        Insert: {
          cc_contacts?: Json | null
          created_at?: string | null
          created_by?: string | null
          for_action?: string | null
          from_user_id?: string | null
          id?: string
          message?: string | null
          organization_id: string
          project_id: string
          response_due_date?: string | null
          response_received?: boolean | null
          response_received_at?: string | null
          response_required?: boolean | null
          sent_at?: string | null
          sent_via?: string | null
          subject: string
          to_company: string
          to_contact: string
          to_email?: string | null
          tracking_number?: string | null
          transmittal_number: string
          updated_at?: string | null
        }
        Update: {
          cc_contacts?: Json | null
          created_at?: string | null
          created_by?: string | null
          for_action?: string | null
          from_user_id?: string | null
          id?: string
          message?: string | null
          organization_id?: string
          project_id?: string
          response_due_date?: string | null
          response_received?: boolean | null
          response_received_at?: string | null
          response_required?: boolean | null
          sent_at?: string | null
          sent_via?: string | null
          subject?: string
          to_company?: string
          to_contact?: string
          to_email?: string | null
          tracking_number?: string | null
          transmittal_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transmittals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittals_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          certifications: Json | null
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          deactivation_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          department: string | null
          display_name: string | null
          email: string
          employee_id: string | null
          failed_login_count: number | null
          first_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          last_login_at: string | null
          last_name: string
          locked_until: string | null
          mfa_enabled: boolean | null
          must_change_password: boolean | null
          organization_id: string
          password_changed_at: string | null
          phone: string | null
          preferences: Json | null
          timezone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          certifications?: Json | null
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          display_name?: string | null
          email: string
          employee_id?: string | null
          failed_login_count?: number | null
          first_name: string
          hire_date?: string | null
          id: string
          is_active?: boolean | null
          job_title?: string | null
          last_login_at?: string | null
          last_name: string
          locked_until?: string | null
          mfa_enabled?: boolean | null
          must_change_password?: boolean | null
          organization_id: string
          password_changed_at?: string | null
          phone?: string | null
          preferences?: Json | null
          timezone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          certifications?: Json | null
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          display_name?: string | null
          email?: string
          employee_id?: string | null
          failed_login_count?: number | null
          first_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          last_login_at?: string | null
          last_name?: string
          locked_until?: string | null
          mfa_enabled?: boolean | null
          must_change_password?: boolean | null
          organization_id?: string
          password_changed_at?: string | null
          phone?: string | null
          preferences?: Json | null
          timezone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          project_id: string | null
          role_id: string
          updated_at: string
          updated_by: string | null
          user_id: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string | null
          role_id: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string | null
          role_id?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_roles_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_roles_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_roles_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_recordings: {
        Row: {
          ai_extracted_entries: Json | null
          ai_processing_model: string | null
          ai_processing_tokens: number | null
          created_at: string
          daily_report_id: string | null
          duration_seconds: number | null
          file_format: string | null
          file_size_bytes: number | null
          id: string
          latitude: number | null
          longitude: number | null
          organization_id: string
          processing_attempts: number | null
          processing_completed_at: string | null
          processing_error: string | null
          processing_started_at: string | null
          processing_status: string | null
          project_id: string
          recorded_at: string
          recorded_by: string
          storage_bucket: string
          storage_path: string
          transcript: string | null
          transcript_confidence: number | null
          transcript_language: string | null
          transcript_segments: Json | null
          updated_at: string
        }
        Insert: {
          ai_extracted_entries?: Json | null
          ai_processing_model?: string | null
          ai_processing_tokens?: number | null
          created_at?: string
          daily_report_id?: string | null
          duration_seconds?: number | null
          file_format?: string | null
          file_size_bytes?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          organization_id: string
          processing_attempts?: number | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          project_id: string
          recorded_at?: string
          recorded_by: string
          storage_bucket?: string
          storage_path: string
          transcript?: string | null
          transcript_confidence?: number | null
          transcript_language?: string | null
          transcript_segments?: Json | null
          updated_at?: string
        }
        Update: {
          ai_extracted_entries?: Json | null
          ai_processing_model?: string | null
          ai_processing_tokens?: number | null
          created_at?: string
          daily_report_id?: string | null
          duration_seconds?: number | null
          file_format?: string | null
          file_size_bytes?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          organization_id?: string
          processing_attempts?: number | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          project_id?: string
          recorded_at?: string
          recorded_by?: string
          storage_bucket?: string
          storage_path?: string
          transcript?: string | null
          transcript_confidence?: number | null
          transcript_language?: string | null
          transcript_segments?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_recordings_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_recordings_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_pending_report_approvals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_recordings_daily_report_id_fkey"
            columns: ["daily_report_id"]
            isOneToOne: false
            referencedRelation: "v_recent_daily_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_recordings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_recordings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_recordings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_recordings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "voice_recordings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "voice_recordings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "voice_recordings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "voice_recordings_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wage_determination_items: {
        Row: {
          base_rate: number
          classification: string
          created_at: string | null
          effective_date: string | null
          eo_14026_applies: boolean | null
          eo_minimum_rate: number | null
          fringe_benefits: number
          general_decision_number: string | null
          id: string
          modification_number: number | null
          proposal_id: string
          publication_date: string | null
          total_rate: number
          trade_code: string | null
        }
        Insert: {
          base_rate: number
          classification: string
          created_at?: string | null
          effective_date?: string | null
          eo_14026_applies?: boolean | null
          eo_minimum_rate?: number | null
          fringe_benefits: number
          general_decision_number?: string | null
          id?: string
          modification_number?: number | null
          proposal_id: string
          publication_date?: string | null
          total_rate: number
          trade_code?: string | null
        }
        Update: {
          base_rate?: number
          classification?: string
          created_at?: string | null
          effective_date?: string | null
          eo_14026_applies?: boolean | null
          eo_minimum_rate?: number | null
          fringe_benefits?: number
          general_decision_number?: string | null
          id?: string
          modification_number?: number | null
          proposal_id?: string
          publication_date?: string | null
          total_rate?: number
          trade_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wage_determination_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "bid_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wage_determination_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      wage_rates: {
        Row: {
          base_hourly_rate: number
          county: string | null
          created_at: string
          created_by: string | null
          double_time_multiplier: number | null
          effective_date: string
          expiration_date: string | null
          fringe_rate: number | null
          id: string
          is_active: boolean | null
          organization_id: string
          overtime_multiplier: number | null
          project_id: string | null
          rate_type: string
          source: string | null
          source_document_url: string | null
          state: string | null
          total_hourly_rate: number | null
          trade_classification: string
          trade_sub_classification: string | null
          updated_at: string
          updated_by: string | null
          wage_determination_date: string | null
          wage_determination_number: string | null
        }
        Insert: {
          base_hourly_rate: number
          county?: string | null
          created_at?: string
          created_by?: string | null
          double_time_multiplier?: number | null
          effective_date: string
          expiration_date?: string | null
          fringe_rate?: number | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          overtime_multiplier?: number | null
          project_id?: string | null
          rate_type?: string
          source?: string | null
          source_document_url?: string | null
          state?: string | null
          total_hourly_rate?: number | null
          trade_classification: string
          trade_sub_classification?: string | null
          updated_at?: string
          updated_by?: string | null
          wage_determination_date?: string | null
          wage_determination_number?: string | null
        }
        Update: {
          base_hourly_rate?: number
          county?: string | null
          created_at?: string
          created_by?: string | null
          double_time_multiplier?: number | null
          effective_date?: string
          expiration_date?: string | null
          fringe_rate?: number | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          overtime_multiplier?: number | null
          project_id?: string | null
          rate_type?: string
          source?: string | null
          source_document_url?: string | null
          state?: string | null
          total_hourly_rate?: number | null
          trade_classification?: string
          trade_sub_classification?: string | null
          updated_at?: string
          updated_by?: string | null
          wage_determination_date?: string | null
          wage_determination_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wage_rates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wage_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wage_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wage_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wage_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "wage_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "wage_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "wage_rates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "wage_rates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_impact_predictions: {
        Row: {
          confidence_level: number | null
          created_at: string | null
          forecast_date: string
          forecast_for_date: string
          id: string
          impacted_activities: string[] | null
          organization_id: string
          predicted_working_day: boolean | null
          project_id: string
          resource_recommendations: string | null
          schedule_adjustments: Json | null
          weather_forecast: Json
          work_impact_score: number | null
        }
        Insert: {
          confidence_level?: number | null
          created_at?: string | null
          forecast_date: string
          forecast_for_date: string
          id?: string
          impacted_activities?: string[] | null
          organization_id: string
          predicted_working_day?: boolean | null
          project_id: string
          resource_recommendations?: string | null
          schedule_adjustments?: Json | null
          weather_forecast: Json
          work_impact_score?: number | null
        }
        Update: {
          confidence_level?: number | null
          created_at?: string | null
          forecast_date?: string
          forecast_for_date?: string
          id?: string
          impacted_activities?: string[] | null
          organization_id?: string
          predicted_working_day?: boolean | null
          project_id?: string
          resource_recommendations?: string | null
          schedule_adjustments?: Json | null
          weather_forecast?: Json
          work_impact_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_impact_predictions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_impact_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_impact_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_impact_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weather_impact_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weather_impact_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weather_impact_predictions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      weather_snapshots: {
        Row: {
          cloud_cover_percent: number | null
          condition_code: string | null
          condition_description: string | null
          created_at: string
          feels_like_f: number | null
          forecast_high_f: number | null
          forecast_low_f: number | null
          humidity_percent: number | null
          id: string
          is_forecast: boolean | null
          latitude: number
          longitude: number
          precipitation_chance_percent: number | null
          precipitation_inches: number | null
          precipitation_type: string | null
          pressure_mb: number | null
          project_id: string
          raw_response: Json | null
          snapshot_at: string
          snapshot_date: string
          snapshot_time: string
          source: string
          source_station_id: string | null
          temperature_f: number | null
          uv_index: number | null
          visibility_miles: number | null
          wind_direction_degrees: number | null
          wind_direction_text: string | null
          wind_gust_mph: number | null
          wind_speed_mph: number | null
        }
        Insert: {
          cloud_cover_percent?: number | null
          condition_code?: string | null
          condition_description?: string | null
          created_at?: string
          feels_like_f?: number | null
          forecast_high_f?: number | null
          forecast_low_f?: number | null
          humidity_percent?: number | null
          id?: string
          is_forecast?: boolean | null
          latitude: number
          longitude: number
          precipitation_chance_percent?: number | null
          precipitation_inches?: number | null
          precipitation_type?: string | null
          pressure_mb?: number | null
          project_id: string
          raw_response?: Json | null
          snapshot_at?: string
          snapshot_date: string
          snapshot_time: string
          source: string
          source_station_id?: string | null
          temperature_f?: number | null
          uv_index?: number | null
          visibility_miles?: number | null
          wind_direction_degrees?: number | null
          wind_direction_text?: string | null
          wind_gust_mph?: number | null
          wind_speed_mph?: number | null
        }
        Update: {
          cloud_cover_percent?: number | null
          condition_code?: string | null
          condition_description?: string | null
          created_at?: string
          feels_like_f?: number | null
          forecast_high_f?: number | null
          forecast_low_f?: number | null
          humidity_percent?: number | null
          id?: string
          is_forecast?: boolean | null
          latitude?: number
          longitude?: number
          precipitation_chance_percent?: number | null
          precipitation_inches?: number | null
          precipitation_type?: string | null
          pressure_mb?: number | null
          project_id?: string
          raw_response?: Json | null
          snapshot_at?: string
          snapshot_date?: string
          snapshot_time?: string
          source?: string
          source_station_id?: string | null
          temperature_f?: number | null
          uv_index?: number | null
          visibility_miles?: number | null
          wind_direction_degrees?: number | null
          wind_direction_text?: string | null
          wind_gust_mph?: number | null
          wind_speed_mph?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weather_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weather_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weather_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "weather_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      wv811_alert_acknowledgements: {
        Row: {
          ack_deadline: string | null
          acknowledged_action: string | null
          acknowledged_at: string | null
          acknowledged_via: string | null
          alert_id: string
          created_at: string
          delivered_at: string | null
          delivered_via: string[] | null
          device_info: Json | null
          escalated_at: string | null
          escalated_to: string | null
          escalation_reason: string | null
          id: string
          ip_address: unknown
          opened_at: string | null
          opened_via: string | null
          organization_id: string
          requires_explicit_ack: boolean | null
          sent_at: string
          sent_via: string[] | null
          status: Database["public"]["Enums"]["wv811_ack_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ack_deadline?: string | null
          acknowledged_action?: string | null
          acknowledged_at?: string | null
          acknowledged_via?: string | null
          alert_id: string
          created_at?: string
          delivered_at?: string | null
          delivered_via?: string[] | null
          device_info?: Json | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string | null
          opened_via?: string | null
          organization_id: string
          requires_explicit_ack?: boolean | null
          sent_at?: string
          sent_via?: string[] | null
          status?: Database["public"]["Enums"]["wv811_ack_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ack_deadline?: string | null
          acknowledged_action?: string | null
          acknowledged_at?: string | null
          acknowledged_via?: string | null
          alert_id?: string
          created_at?: string
          delivered_at?: string | null
          delivered_via?: string[] | null
          device_info?: Json | null
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          id?: string
          ip_address?: unknown
          opened_at?: string | null
          opened_via?: string | null
          organization_id?: string
          requires_explicit_ack?: boolean | null
          sent_at?: string
          sent_via?: string[] | null
          status?: Database["public"]["Enums"]["wv811_ack_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wv811_alert_acknowledgements_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "wv811_ticket_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_alert_acknowledgements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_alert_subscriptions: {
        Row: {
          alert_24_hour: boolean | null
          alert_48_hour: boolean | null
          alert_conflict: boolean | null
          alert_new_ticket: boolean | null
          alert_overdue: boolean | null
          alert_response_received: boolean | null
          alert_same_day: boolean | null
          area_polygon: unknown
          channel_email: boolean | null
          channel_in_app: boolean | null
          channel_push: boolean | null
          channel_sms: boolean | null
          created_at: string
          email_address: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          phone_number: string | null
          project_id: string | null
          scope_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_24_hour?: boolean | null
          alert_48_hour?: boolean | null
          alert_conflict?: boolean | null
          alert_new_ticket?: boolean | null
          alert_overdue?: boolean | null
          alert_response_received?: boolean | null
          alert_same_day?: boolean | null
          area_polygon?: unknown
          channel_email?: boolean | null
          channel_in_app?: boolean | null
          channel_push?: boolean | null
          channel_sms?: boolean | null
          created_at?: string
          email_address?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          phone_number?: string | null
          project_id?: string | null
          scope_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_24_hour?: boolean | null
          alert_48_hour?: boolean | null
          alert_conflict?: boolean | null
          alert_new_ticket?: boolean | null
          alert_overdue?: boolean | null
          alert_response_received?: boolean | null
          alert_same_day?: boolean | null
          area_polygon?: unknown
          channel_email?: boolean | null
          channel_in_app?: boolean | null
          channel_push?: boolean | null
          channel_sms?: boolean | null
          created_at?: string
          email_address?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          phone_number?: string | null
          project_id?: string | null
          scope_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wv811_alert_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_audit_packs: {
        Row: {
          created_at: string
          data_end_date: string | null
          data_start_date: string | null
          download_count: number | null
          export_format: string
          export_name: string
          file_size_bytes: number | null
          generated_at: string
          generated_by: string
          generation_duration_ms: number | null
          id: string
          includes_acknowledgements: boolean | null
          includes_alert_log: boolean | null
          includes_dig_checks: boolean | null
          includes_field_notes: boolean | null
          includes_photos: boolean | null
          includes_ticket_details: boolean | null
          includes_utility_responses: boolean | null
          last_downloaded_at: string | null
          last_downloaded_by: string | null
          organization_id: string
          retention_until: string
          storage_path: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string
          data_end_date?: string | null
          data_start_date?: string | null
          download_count?: number | null
          export_format?: string
          export_name: string
          file_size_bytes?: number | null
          generated_at?: string
          generated_by: string
          generation_duration_ms?: number | null
          id?: string
          includes_acknowledgements?: boolean | null
          includes_alert_log?: boolean | null
          includes_dig_checks?: boolean | null
          includes_field_notes?: boolean | null
          includes_photos?: boolean | null
          includes_ticket_details?: boolean | null
          includes_utility_responses?: boolean | null
          last_downloaded_at?: string | null
          last_downloaded_by?: string | null
          organization_id: string
          retention_until?: string
          storage_path?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string
          data_end_date?: string | null
          data_start_date?: string | null
          download_count?: number | null
          export_format?: string
          export_name?: string
          file_size_bytes?: number | null
          generated_at?: string
          generated_by?: string
          generation_duration_ms?: number | null
          id?: string
          includes_acknowledgements?: boolean | null
          includes_alert_log?: boolean | null
          includes_dig_checks?: boolean | null
          includes_field_notes?: boolean | null
          includes_photos?: boolean | null
          includes_ticket_details?: boolean | null
          includes_utility_responses?: boolean | null
          last_downloaded_at?: string | null
          last_downloaded_by?: string | null
          organization_id?: string
          retention_until?: string
          storage_path?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wv811_audit_packs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_audit_packs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_audit_packs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_audit_packs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_audit_packs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_daily_radar_sends: {
        Row: {
          email_sent: boolean | null
          high_risk_digs: number | null
          id: string
          organization_id: string
          push_sent: boolean | null
          sent_at: string
          sent_date: string
          tickets_expiring_3_days: number | null
          tickets_pending_utilities: number | null
          tickets_update_today: number | null
          user_id: string
        }
        Insert: {
          email_sent?: boolean | null
          high_risk_digs?: number | null
          id?: string
          organization_id: string
          push_sent?: boolean | null
          sent_at?: string
          sent_date: string
          tickets_expiring_3_days?: number | null
          tickets_pending_utilities?: number | null
          tickets_update_today?: number | null
          user_id: string
        }
        Update: {
          email_sent?: boolean | null
          high_risk_digs?: number | null
          id?: string
          organization_id?: string
          push_sent?: boolean | null
          sent_at?: string
          sent_date?: string
          tickets_expiring_3_days?: number | null
          tickets_pending_utilities?: number | null
          tickets_update_today?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wv811_daily_radar_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_dig_checks: {
        Row: {
          check_date: string
          check_time: string | null
          checked_at: string
          checked_by: string | null
          id: string
          issues: Json | null
          latitude: number | null
          location_query: string | null
          longitude: number | null
          organization_id: string
          project_id: string | null
          result: string
          result_message: string
          ticket_id: string | null
        }
        Insert: {
          check_date: string
          check_time?: string | null
          checked_at?: string
          checked_by?: string | null
          id?: string
          issues?: Json | null
          latitude?: number | null
          location_query?: string | null
          longitude?: number | null
          organization_id: string
          project_id?: string | null
          result: string
          result_message: string
          ticket_id?: string | null
        }
        Update: {
          check_date?: string
          check_time?: string | null
          checked_at?: string
          checked_by?: string | null
          id?: string
          issues?: Json | null
          latitude?: number | null
          location_query?: string | null
          longitude?: number | null
          organization_id?: string
          project_id?: string | null
          result?: string
          result_message?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wv811_dig_checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_dig_checks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_dig_checks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_dig_checks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_dig_checks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_digest_preferences: {
        Row: {
          created_at: string
          email_address: string | null
          frequency: Database["public"]["Enums"]["wv811_digest_frequency"]
          id: string
          include_conflicts: boolean | null
          include_expiring: boolean | null
          include_pending: boolean | null
          include_summary: boolean | null
          is_active: boolean | null
          last_sent_at: string | null
          organization_id: string
          send_day_of_week: number | null
          send_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_address?: string | null
          frequency?: Database["public"]["Enums"]["wv811_digest_frequency"]
          id?: string
          include_conflicts?: boolean | null
          include_expiring?: boolean | null
          include_pending?: boolean | null
          include_summary?: boolean | null
          is_active?: boolean | null
          last_sent_at?: string | null
          organization_id: string
          send_day_of_week?: number | null
          send_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_address?: string | null
          frequency?: Database["public"]["Enums"]["wv811_digest_frequency"]
          id?: string
          include_conflicts?: boolean | null
          include_expiring?: boolean | null
          include_pending?: boolean | null
          include_summary?: boolean | null
          is_active?: boolean | null
          last_sent_at?: string | null
          organization_id?: string
          send_day_of_week?: number | null
          send_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wv811_digest_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_draft_communications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          draft_type: string
          id: string
          organization_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string
          target_email: string | null
          target_utility_code: string | null
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          draft_type: string
          id?: string
          organization_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject: string
          target_email?: string | null
          target_utility_code?: string | null
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          draft_type?: string
          id?: string
          organization_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
          target_email?: string | null
          target_utility_code?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wv811_draft_communications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_draft_communications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_draft_communications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_draft_communications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_draft_communications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_email_ingests: {
        Row: {
          attachment_paths: string[] | null
          created_at: string
          error_message: string | null
          from_email: string
          id: string
          organization_id: string
          processed_at: string | null
          raw_body_html: string | null
          raw_body_text: string | null
          raw_headers: Json | null
          received_at: string
          retry_count: number | null
          sendgrid_message_id: string | null
          status: Database["public"]["Enums"]["wv811_email_status"]
          subject: string | null
          ticket_id: string | null
          to_email: string
          updated_at: string
        }
        Insert: {
          attachment_paths?: string[] | null
          created_at?: string
          error_message?: string | null
          from_email: string
          id?: string
          organization_id: string
          processed_at?: string | null
          raw_body_html?: string | null
          raw_body_text?: string | null
          raw_headers?: Json | null
          received_at?: string
          retry_count?: number | null
          sendgrid_message_id?: string | null
          status?: Database["public"]["Enums"]["wv811_email_status"]
          subject?: string | null
          ticket_id?: string | null
          to_email: string
          updated_at?: string
        }
        Update: {
          attachment_paths?: string[] | null
          created_at?: string
          error_message?: string | null
          from_email?: string
          id?: string
          organization_id?: string
          processed_at?: string | null
          raw_body_html?: string | null
          raw_body_text?: string | null
          raw_headers?: Json | null
          received_at?: string
          retry_count?: number | null
          sendgrid_message_id?: string | null
          status?: Database["public"]["Enums"]["wv811_email_status"]
          subject?: string | null
          ticket_id?: string | null
          to_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_email_ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_email_ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_email_ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_email_ticket"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_email_ingests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_emergency_incidents: {
        Row: {
          address: string | null
          created_at: string
          crew_on_site: Json | null
          description: string | null
          draft_email_to_811: Json | null
          follow_up_completed_at: string | null
          follow_up_required: boolean | null
          gps_accuracy_meters: number | null
          id: string
          incident_number: string
          incident_type: Database["public"]["Enums"]["wv811_incident_type"]
          latitude: number
          longitude: number
          notification_log: Json | null
          organization_id: string
          photo_ids: string[] | null
          pm_notified_at: string | null
          project_id: string | null
          reported_at: string
          reported_by: string
          reporter_phone: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          safety_director_notified_at: string | null
          severity: string | null
          status: string
          superintendent_notified_at: string | null
          ticket_id: string | null
          updated_at: string
          utility_type: string | null
          vp_notified_at: string | null
          wv811_notified_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          crew_on_site?: Json | null
          description?: string | null
          draft_email_to_811?: Json | null
          follow_up_completed_at?: string | null
          follow_up_required?: boolean | null
          gps_accuracy_meters?: number | null
          id?: string
          incident_number: string
          incident_type: Database["public"]["Enums"]["wv811_incident_type"]
          latitude: number
          longitude: number
          notification_log?: Json | null
          organization_id: string
          photo_ids?: string[] | null
          pm_notified_at?: string | null
          project_id?: string | null
          reported_at?: string
          reported_by: string
          reporter_phone?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          safety_director_notified_at?: string | null
          severity?: string | null
          status?: string
          superintendent_notified_at?: string | null
          ticket_id?: string | null
          updated_at?: string
          utility_type?: string | null
          vp_notified_at?: string | null
          wv811_notified_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          crew_on_site?: Json | null
          description?: string | null
          draft_email_to_811?: Json | null
          follow_up_completed_at?: string | null
          follow_up_required?: boolean | null
          gps_accuracy_meters?: number | null
          id?: string
          incident_number?: string
          incident_type?: Database["public"]["Enums"]["wv811_incident_type"]
          latitude?: number
          longitude?: number
          notification_log?: Json | null
          organization_id?: string
          photo_ids?: string[] | null
          pm_notified_at?: string | null
          project_id?: string | null
          reported_at?: string
          reported_by?: string
          reporter_phone?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          safety_director_notified_at?: string | null
          severity?: string | null
          status?: string
          superintendent_notified_at?: string | null
          ticket_id?: string | null
          updated_at?: string
          utility_type?: string | null
          vp_notified_at?: string | null
          wv811_notified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wv811_emergency_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_emergency_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_emergency_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_emergency_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "wv811_emergency_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "wv811_emergency_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "wv811_emergency_incidents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "wv811_emergency_incidents_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_emergency_incidents_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_emergency_incidents_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_emergency_incidents_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          name: string
          year: number
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          name: string
          year: number
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          name?: string
          year?: number
        }
        Relationships: []
      }
      wv811_offline_sync_logs: {
        Row: {
          app_version: string | null
          data_as_of: string
          device_id: string | null
          device_type: string | null
          dig_checks_synced: number | null
          error_log: Json | null
          had_errors: boolean | null
          id: string
          network_type: string | null
          organization_id: string
          sync_completed_at: string | null
          sync_started_at: string
          sync_type: string
          tickets_synced: number | null
          user_id: string
          utility_responses_synced: number | null
          was_online: boolean | null
        }
        Insert: {
          app_version?: string | null
          data_as_of?: string
          device_id?: string | null
          device_type?: string | null
          dig_checks_synced?: number | null
          error_log?: Json | null
          had_errors?: boolean | null
          id?: string
          network_type?: string | null
          organization_id: string
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_type: string
          tickets_synced?: number | null
          user_id: string
          utility_responses_synced?: number | null
          was_online?: boolean | null
        }
        Update: {
          app_version?: string | null
          data_as_of?: string
          device_id?: string | null
          device_type?: string | null
          dig_checks_synced?: number | null
          error_log?: Json | null
          had_errors?: boolean | null
          id?: string
          network_type?: string | null
          organization_id?: string
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_type?: string
          tickets_synced?: number | null
          user_id?: string
          utility_responses_synced?: number | null
          was_online?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "wv811_offline_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_photo_analysis_log: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          ai_version: string | null
          analysis_completed_at: string | null
          analysis_duration_ms: number | null
          analysis_started_at: string | null
          attachment_id: string
          created_at: string | null
          error_message: string | null
          estimated_cost_cents: number | null
          id: string
          input_tokens: number | null
          output_tokens: number | null
          request_payload: Json | null
          response_payload: Json | null
          retry_count: number | null
          status: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          ai_version?: string | null
          analysis_completed_at?: string | null
          analysis_duration_ms?: number | null
          analysis_started_at?: string | null
          attachment_id: string
          created_at?: string | null
          error_message?: string | null
          estimated_cost_cents?: number | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number | null
          status?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          ai_version?: string | null
          analysis_completed_at?: string | null
          analysis_duration_ms?: number | null
          analysis_started_at?: string | null
          attachment_id?: string
          created_at?: string | null
          error_message?: string | null
          estimated_cost_cents?: number | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wv811_photo_analysis_log_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "v_pending_ai_confirmations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_photo_analysis_log_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "wv811_ticket_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_photo_verifications: {
        Row: {
          captured_at: string
          captured_by: string
          created_at: string
          exception_reason: string | null
          file_name: string
          file_size_bytes: number | null
          gps_accuracy_meters: number | null
          id: string
          is_exception: boolean | null
          latitude: number | null
          longitude: number | null
          mime_type: string | null
          notes: string | null
          organization_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          storage_path: string
          ticket_id: string
          utility_response_id: string | null
          verification_type: string
        }
        Insert: {
          captured_at?: string
          captured_by: string
          created_at?: string
          exception_reason?: string | null
          file_name: string
          file_size_bytes?: number | null
          gps_accuracy_meters?: number | null
          id?: string
          is_exception?: boolean | null
          latitude?: number | null
          longitude?: number | null
          mime_type?: string | null
          notes?: string | null
          organization_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path: string
          ticket_id: string
          utility_response_id?: string | null
          verification_type?: string
        }
        Update: {
          captured_at?: string
          captured_by?: string
          created_at?: string
          exception_reason?: string | null
          file_name?: string
          file_size_bytes?: number | null
          gps_accuracy_meters?: number | null
          id?: string
          is_exception?: boolean | null
          latitude?: number | null
          longitude?: number | null
          mime_type?: string | null
          notes?: string | null
          organization_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          storage_path?: string
          ticket_id?: string
          utility_response_id?: string | null
          verification_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wv811_photo_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_photo_verifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_photo_verifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_photo_verifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_photo_verifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_photo_verifications_utility_response_id_fkey"
            columns: ["utility_response_id"]
            isOneToOne: false
            referencedRelation: "wv811_utility_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_project_tickets: {
        Row: {
          id: string
          linked_at: string
          linked_by: string | null
          notes: string | null
          project_id: string
          ticket_id: string
        }
        Insert: {
          id?: string
          linked_at?: string
          linked_by?: string | null
          notes?: string | null
          project_id: string
          ticket_id: string
        }
        Update: {
          id?: string
          linked_at?: string
          linked_by?: string | null
          notes?: string | null
          project_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wv811_project_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_project_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_project_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_project_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_ticket_alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["wv811_alert_type"]
          body: string | null
          channel: Database["public"]["Enums"]["wv811_alert_channel"]
          created_at: string
          delivered_at: string | null
          external_message_id: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          priority: Database["public"]["Enums"]["wv811_alert_priority"] | null
          read_at: string | null
          sent_at: string | null
          subject: string | null
          subscription_id: string | null
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["wv811_alert_type"]
          body?: string | null
          channel: Database["public"]["Enums"]["wv811_alert_channel"]
          created_at?: string
          delivered_at?: string | null
          external_message_id?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["wv811_alert_priority"] | null
          read_at?: string | null
          sent_at?: string | null
          subject?: string | null
          subscription_id?: string | null
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["wv811_alert_type"]
          body?: string | null
          channel?: Database["public"]["Enums"]["wv811_alert_channel"]
          created_at?: string
          delivered_at?: string | null
          external_message_id?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["wv811_alert_priority"] | null
          read_at?: string | null
          sent_at?: string | null
          subject?: string | null
          subscription_id?: string | null
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wv811_ticket_alerts_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "wv811_alert_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_alerts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_alerts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_alerts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_alerts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_ticket_attachments: {
        Row: {
          ai_analysis_confirmed_at: string | null
          ai_analysis_confirmed_by: string | null
          ai_analysis_status: string | null
          ai_analysis_version: string | null
          ai_analyzed_at: string | null
          ai_description: string | null
          ai_keywords: string[] | null
          ai_mark_colors_detected: string[] | null
          ai_objects_detected: Json | null
          ai_quality_score: number | null
          ai_raw_response: Json | null
          ai_safety_concerns: string[] | null
          ai_scene_type: string | null
          ai_time_of_day: string | null
          ai_utility_types_visible: string[] | null
          ai_weather_conditions: string | null
          content_hash: string | null
          created_at: string
          description: string | null
          exif_aperture: string | null
          exif_camera_make: string | null
          exif_camera_model: string | null
          exif_exposure_time: string | null
          exif_flash_used: boolean | null
          exif_focal_length: string | null
          exif_gps_accuracy: number | null
          exif_gps_altitude: number | null
          exif_height: number | null
          exif_iso: string | null
          exif_orientation: number | null
          exif_raw_data: Json | null
          exif_width: number | null
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          human_override_data: Json | null
          id: string
          latitude: number | null
          longitude: number | null
          photo_category: string | null
          storage_path: string
          taken_at: string | null
          thumbnail_path: string | null
          ticket_id: string
          uploaded_by: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          ai_analysis_confirmed_at?: string | null
          ai_analysis_confirmed_by?: string | null
          ai_analysis_status?: string | null
          ai_analysis_version?: string | null
          ai_analyzed_at?: string | null
          ai_description?: string | null
          ai_keywords?: string[] | null
          ai_mark_colors_detected?: string[] | null
          ai_objects_detected?: Json | null
          ai_quality_score?: number | null
          ai_raw_response?: Json | null
          ai_safety_concerns?: string[] | null
          ai_scene_type?: string | null
          ai_time_of_day?: string | null
          ai_utility_types_visible?: string[] | null
          ai_weather_conditions?: string | null
          content_hash?: string | null
          created_at?: string
          description?: string | null
          exif_aperture?: string | null
          exif_camera_make?: string | null
          exif_camera_model?: string | null
          exif_exposure_time?: string | null
          exif_flash_used?: boolean | null
          exif_focal_length?: string | null
          exif_gps_accuracy?: number | null
          exif_gps_altitude?: number | null
          exif_height?: number | null
          exif_iso?: string | null
          exif_orientation?: number | null
          exif_raw_data?: Json | null
          exif_width?: number | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          human_override_data?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_category?: string | null
          storage_path: string
          taken_at?: string | null
          thumbnail_path?: string | null
          ticket_id: string
          uploaded_by?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          ai_analysis_confirmed_at?: string | null
          ai_analysis_confirmed_by?: string | null
          ai_analysis_status?: string | null
          ai_analysis_version?: string | null
          ai_analyzed_at?: string | null
          ai_description?: string | null
          ai_keywords?: string[] | null
          ai_mark_colors_detected?: string[] | null
          ai_objects_detected?: Json | null
          ai_quality_score?: number | null
          ai_raw_response?: Json | null
          ai_safety_concerns?: string[] | null
          ai_scene_type?: string | null
          ai_time_of_day?: string | null
          ai_utility_types_visible?: string[] | null
          ai_weather_conditions?: string | null
          content_hash?: string | null
          created_at?: string
          description?: string | null
          exif_aperture?: string | null
          exif_camera_make?: string | null
          exif_camera_model?: string | null
          exif_exposure_time?: string | null
          exif_flash_used?: boolean | null
          exif_focal_length?: string | null
          exif_gps_accuracy?: number | null
          exif_gps_altitude?: number | null
          exif_height?: number | null
          exif_iso?: string | null
          exif_orientation?: number | null
          exif_raw_data?: Json | null
          exif_width?: number | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          human_override_data?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_category?: string | null
          storage_path?: string
          taken_at?: string | null
          thumbnail_path?: string | null
          ticket_id?: string
          uploaded_by?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wv811_ticket_attachments_ai_analysis_confirmed_by_fkey"
            columns: ["ai_analysis_confirmed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_ticket_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["wv811_ticket_status"] | null
          note_type: string
          old_status: Database["public"]["Enums"]["wv811_ticket_status"] | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["wv811_ticket_status"] | null
          note_type?: string
          old_status?: Database["public"]["Enums"]["wv811_ticket_status"] | null
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["wv811_ticket_status"] | null
          note_type?: string
          old_status?: Database["public"]["Enums"]["wv811_ticket_status"] | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wv811_ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_tickets: {
        Row: {
          alert_count: number | null
          created_at: string
          created_by: string | null
          cross_street_1: string | null
          cross_street_2: string | null
          depth_in_inches: number | null
          dig_area_polygon: unknown
          dig_site_address: string
          dig_site_city: string | null
          dig_site_county: string | null
          dig_site_location: unknown
          dig_site_state: string | null
          dig_site_zip: string | null
          done_for: string | null
          excavator_address: string | null
          excavator_company: string | null
          excavator_email: string | null
          excavator_name: string | null
          excavator_phone: string | null
          extent_description: string | null
          has_electric_utility: boolean | null
          has_gas_utility: boolean | null
          id: string
          is_high_risk: boolean | null
          last_alert_sent_at: string | null
          legal_dig_date: string
          location_description: string | null
          notes: string | null
          organization_id: string
          original_email_id: string | null
          parent_ticket_id: string | null
          parsed_at: string | null
          parsing_confidence: number | null
          parsing_model: string | null
          portal_url: string | null
          project_id: string | null
          raw_parsed_data: Json | null
          renewal_requested_at: string | null
          responded_utilities: number | null
          risk_score: number | null
          status: Database["public"]["Enums"]["wv811_ticket_status"]
          status_changed_at: string | null
          taken_date: string | null
          ticket_created_at: string
          ticket_expires_at: string
          ticket_number: string
          ticket_type: string | null
          total_utilities: number | null
          update_by_date: string | null
          updated_at: string
          updated_by: string | null
          work_date: string | null
          work_description: string | null
          work_end_date: string | null
          work_start_date: string | null
          work_type: Database["public"]["Enums"]["wv811_work_type"] | null
        }
        Insert: {
          alert_count?: number | null
          created_at?: string
          created_by?: string | null
          cross_street_1?: string | null
          cross_street_2?: string | null
          depth_in_inches?: number | null
          dig_area_polygon?: unknown
          dig_site_address: string
          dig_site_city?: string | null
          dig_site_county?: string | null
          dig_site_location?: unknown
          dig_site_state?: string | null
          dig_site_zip?: string | null
          done_for?: string | null
          excavator_address?: string | null
          excavator_company?: string | null
          excavator_email?: string | null
          excavator_name?: string | null
          excavator_phone?: string | null
          extent_description?: string | null
          has_electric_utility?: boolean | null
          has_gas_utility?: boolean | null
          id?: string
          is_high_risk?: boolean | null
          last_alert_sent_at?: string | null
          legal_dig_date: string
          location_description?: string | null
          notes?: string | null
          organization_id: string
          original_email_id?: string | null
          parent_ticket_id?: string | null
          parsed_at?: string | null
          parsing_confidence?: number | null
          parsing_model?: string | null
          portal_url?: string | null
          project_id?: string | null
          raw_parsed_data?: Json | null
          renewal_requested_at?: string | null
          responded_utilities?: number | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["wv811_ticket_status"]
          status_changed_at?: string | null
          taken_date?: string | null
          ticket_created_at: string
          ticket_expires_at: string
          ticket_number: string
          ticket_type?: string | null
          total_utilities?: number | null
          update_by_date?: string | null
          updated_at?: string
          updated_by?: string | null
          work_date?: string | null
          work_description?: string | null
          work_end_date?: string | null
          work_start_date?: string | null
          work_type?: Database["public"]["Enums"]["wv811_work_type"] | null
        }
        Update: {
          alert_count?: number | null
          created_at?: string
          created_by?: string | null
          cross_street_1?: string | null
          cross_street_2?: string | null
          depth_in_inches?: number | null
          dig_area_polygon?: unknown
          dig_site_address?: string
          dig_site_city?: string | null
          dig_site_county?: string | null
          dig_site_location?: unknown
          dig_site_state?: string | null
          dig_site_zip?: string | null
          done_for?: string | null
          excavator_address?: string | null
          excavator_company?: string | null
          excavator_email?: string | null
          excavator_name?: string | null
          excavator_phone?: string | null
          extent_description?: string | null
          has_electric_utility?: boolean | null
          has_gas_utility?: boolean | null
          id?: string
          is_high_risk?: boolean | null
          last_alert_sent_at?: string | null
          legal_dig_date?: string
          location_description?: string | null
          notes?: string | null
          organization_id?: string
          original_email_id?: string | null
          parent_ticket_id?: string | null
          parsed_at?: string | null
          parsing_confidence?: number | null
          parsing_model?: string | null
          portal_url?: string | null
          project_id?: string | null
          raw_parsed_data?: Json | null
          renewal_requested_at?: string | null
          responded_utilities?: number | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["wv811_ticket_status"]
          status_changed_at?: string | null
          taken_date?: string | null
          ticket_created_at?: string
          ticket_expires_at?: string
          ticket_number?: string
          ticket_type?: string | null
          total_utilities?: number | null
          update_by_date?: string | null
          updated_at?: string
          updated_by?: string | null
          work_date?: string | null
          work_description?: string | null
          work_end_date?: string | null
          work_start_date?: string | null
          work_type?: Database["public"]["Enums"]["wv811_work_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "wv811_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_tickets_original_email_id_fkey"
            columns: ["original_email_id"]
            isOneToOne: false
            referencedRelation: "wv811_email_ingests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_user_alert_preferences: {
        Row: {
          alert_role: Database["public"]["Enums"]["wv811_user_alert_role"]
          always_alert_on_conflict: boolean | null
          always_alert_on_emergency: boolean | null
          always_alert_on_expired: boolean | null
          created_at: string
          daily_radar_enabled: boolean | null
          daily_radar_time: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          organization_id: string
          override_enabled_at: string | null
          override_enabled_by: string | null
          override_expires_at: string | null
          push_enabled: boolean | null
          quiet_mode_enabled: boolean | null
          quiet_mode_until: string | null
          sms_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_role?: Database["public"]["Enums"]["wv811_user_alert_role"]
          always_alert_on_conflict?: boolean | null
          always_alert_on_emergency?: boolean | null
          always_alert_on_expired?: boolean | null
          created_at?: string
          daily_radar_enabled?: boolean | null
          daily_radar_time?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          organization_id: string
          override_enabled_at?: string | null
          override_enabled_by?: string | null
          override_expires_at?: string | null
          push_enabled?: boolean | null
          quiet_mode_enabled?: boolean | null
          quiet_mode_until?: string | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_role?: Database["public"]["Enums"]["wv811_user_alert_role"]
          always_alert_on_conflict?: boolean | null
          always_alert_on_emergency?: boolean | null
          always_alert_on_expired?: boolean | null
          created_at?: string
          daily_radar_enabled?: boolean | null
          daily_radar_time?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          organization_id?: string
          override_enabled_at?: string | null
          override_enabled_by?: string | null
          override_expires_at?: string | null
          push_enabled?: boolean | null
          quiet_mode_enabled?: boolean | null
          quiet_mode_until?: string | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wv811_user_alert_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_utility_responses: {
        Row: {
          conflict_logged_at: string | null
          conflict_logged_by: string | null
          conflict_reason: string | null
          conflict_resolution_notes: string | null
          conflict_resolved_at: string | null
          conflict_resolved_by: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          marked_at: string | null
          marked_by: string | null
          marking_instructions: string | null
          response_message: string | null
          response_received_at: string | null
          response_status:
            | Database["public"]["Enums"]["wv811_response_status"]
            | null
          response_type: Database["public"]["Enums"]["wv811_utility_response_type"]
          response_window_closes_at: string | null
          response_window_opens_at: string | null
          ticket_id: string
          updated_at: string
          utility_code: string
          utility_name: string
          utility_type: string | null
          verification_notes: string | null
          verification_photo_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          conflict_logged_at?: string | null
          conflict_logged_by?: string | null
          conflict_reason?: string | null
          conflict_resolution_notes?: string | null
          conflict_resolved_at?: string | null
          conflict_resolved_by?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          marking_instructions?: string | null
          response_message?: string | null
          response_received_at?: string | null
          response_status?:
            | Database["public"]["Enums"]["wv811_response_status"]
            | null
          response_type?: Database["public"]["Enums"]["wv811_utility_response_type"]
          response_window_closes_at?: string | null
          response_window_opens_at?: string | null
          ticket_id: string
          updated_at?: string
          utility_code: string
          utility_name: string
          utility_type?: string | null
          verification_notes?: string | null
          verification_photo_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          conflict_logged_at?: string | null
          conflict_logged_by?: string | null
          conflict_reason?: string | null
          conflict_resolution_notes?: string | null
          conflict_resolved_at?: string | null
          conflict_resolved_by?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          marking_instructions?: string | null
          response_message?: string | null
          response_received_at?: string | null
          response_status?:
            | Database["public"]["Enums"]["wv811_response_status"]
            | null
          response_type?: Database["public"]["Enums"]["wv811_utility_response_type"]
          response_window_closes_at?: string | null
          response_window_opens_at?: string | null
          ticket_id?: string
          updated_at?: string
          utility_code?: string
          utility_name?: string
          utility_type?: string | null
          verification_notes?: string | null
          verification_photo_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wv811_utility_responses_photo_fk"
            columns: ["verification_photo_id"]
            isOneToOne: false
            referencedRelation: "wv811_photo_verifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_utility_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_utility_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_utility_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_utility_responses_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      wv811_work_schedule: {
        Row: {
          created_at: string
          created_by: string | null
          external_id: string | null
          id: string
          imported_from: string | null
          last_checked_at: string | null
          latitude: number | null
          location_address: string | null
          location_city: string | null
          location_county: string | null
          longitude: number | null
          matched_ticket_id: string | null
          organization_id: string
          planned_date: string
          planned_end_date: string | null
          project_id: string | null
          readiness_issues: Json | null
          readiness_status: string | null
          updated_at: string
          work_description: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          id?: string
          imported_from?: string | null
          last_checked_at?: string | null
          latitude?: number | null
          location_address?: string | null
          location_city?: string | null
          location_county?: string | null
          longitude?: number | null
          matched_ticket_id?: string | null
          organization_id: string
          planned_date: string
          planned_end_date?: string | null
          project_id?: string | null
          readiness_issues?: Json | null
          readiness_status?: string | null
          updated_at?: string
          work_description: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          id?: string
          imported_from?: string | null
          last_checked_at?: string | null
          latitude?: number | null
          location_address?: string | null
          location_city?: string | null
          location_county?: string | null
          longitude?: number | null
          matched_ticket_id?: string | null
          organization_id?: string
          planned_date?: string
          planned_end_date?: string | null
          project_id?: string | null
          readiness_issues?: Json | null
          readiness_status?: string | null
          updated_at?: string
          work_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "wv811_work_schedule_matched_ticket_id_fkey"
            columns: ["matched_ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_work_schedule_matched_ticket_id_fkey"
            columns: ["matched_ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_work_schedule_matched_ticket_id_fkey"
            columns: ["matched_ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_work_schedule_matched_ticket_id_fkey"
            columns: ["matched_ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_work_schedule_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      v_active_crew: {
        Row: {
          active_cert_count: number | null
          default_project_id: string | null
          default_project_name: string | null
          display_name: string | null
          email: string | null
          employee_id: string | null
          id: string | null
          next_cert_expiration: string | null
          organization_id: string | null
          phone: string | null
          trade_classification: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_members_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_members_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_members_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_active_predictive_alerts: {
        Row: {
          alert_type: string | null
          created_at: string | null
          hours_since_created: number | null
          id: string | null
          message: string | null
          project_name: string | null
          project_number: string | null
          severity: Database["public"]["Enums"]["alert_severity"] | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
      v_active_projects: {
        Row: {
          client_name: string | null
          contract_number: string | null
          current_completion_date: string | null
          current_contract_value: number | null
          current_working_days: number | null
          id: string | null
          name: string | null
          notice_to_proceed_date: string | null
          organization_id: string | null
          original_contract_value: number | null
          percent_complete: number | null
          project_number: string | null
          project_type: string | null
          schedule_percent_used: number | null
          status: string | null
          team_count: number | null
          working_days_used: number | null
        }
        Insert: {
          client_name?: string | null
          contract_number?: string | null
          current_completion_date?: string | null
          current_contract_value?: number | null
          current_working_days?: number | null
          id?: string | null
          name?: string | null
          notice_to_proceed_date?: string | null
          organization_id?: string | null
          original_contract_value?: number | null
          percent_complete?: number | null
          project_number?: string | null
          project_type?: string | null
          schedule_percent_used?: never
          status?: string | null
          team_count?: never
          working_days_used?: number | null
        }
        Update: {
          client_name?: string | null
          contract_number?: string | null
          current_completion_date?: string | null
          current_contract_value?: number | null
          current_working_days?: number | null
          id?: string | null
          name?: string | null
          notice_to_proceed_date?: string | null
          organization_id?: string | null
          original_contract_value?: number | null
          percent_complete?: number | null
          project_number?: string | null
          project_type?: string | null
          schedule_percent_used?: never
          status?: string | null
          team_count?: never
          working_days_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_active_subcontracts: {
        Row: {
          agreement_number: string | null
          completion_date: string | null
          current_value: number | null
          id: string | null
          is_dbe_certified: boolean | null
          pending_invoices: number | null
          percent_complete: number | null
          project_name: string | null
          project_number: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["subcontract_status"] | null
          subcontractor_name: string | null
          title: string | null
        }
        Relationships: []
      }
      v_ai_usage_summary: {
        Row: {
          avg_latency_ms: number | null
          estimated_cost: number | null
          month: string | null
          organization_id: string | null
          total_requests: number | null
          total_tokens: number | null
          unique_users: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bid_ai_accuracy: {
        Row: {
          avg_original_confidence: number | null
          categorization_changes: number | null
          entity_type:
            | Database["public"]["Enums"]["correction_entity_enum"]
            | null
          factual_errors: number | null
          field_name: string | null
          organization_id: string | null
          projects_with_corrections: number | null
          severity_changes: number | null
          total_corrections: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_ai_corrections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bid_assembly_templates: {
        Row: {
          applicable_conditions: string | null
          code: string | null
          created_at: string | null
          created_by: string | null
          default_estimation_method:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          default_productivity_rate: number | null
          default_productivity_unit: string | null
          description: string | null
          design_assumptions: string | null
          equipment_lines: number | null
          id: string | null
          is_active: boolean | null
          labor_lines: number | null
          last_used_at: string | null
          line_count: number | null
          material_lines: number | null
          name: string | null
          organization_id: string | null
          output_description: string | null
          output_unit: string | null
          subcontract_lines: number | null
          superseded_by_id: string | null
          times_used: number | null
          total_cost_per_unit: number | null
          total_equipment_cost_per_unit: number | null
          total_labor_cost_per_unit: number | null
          total_material_cost_per_unit: number | null
          total_sub_cost_per_unit: number | null
          updated_at: string | null
          updated_by: string | null
          version: number | null
          work_category:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
          wvdoh_item_number: string | null
          wvdoh_item_pattern: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_assembly_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_assembly_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_assembly_templates_superseded_by_id_fkey"
            columns: ["superseded_by_id"]
            isOneToOne: false
            referencedRelation: "bid_assembly_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_assembly_templates_superseded_by_id_fkey"
            columns: ["superseded_by_id"]
            isOneToOne: false
            referencedRelation: "v_bid_assembly_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_assembly_templates_superseded_by_id_fkey"
            columns: ["superseded_by_id"]
            isOneToOne: false
            referencedRelation: "v_bid_assembly_usage"
            referencedColumns: ["template_id"]
          },
          {
            foreignKeyName: "bid_assembly_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bid_assembly_usage: {
        Row: {
          active_applications: number | null
          avg_ai_confidence: number | null
          avg_applied_cost: number | null
          avg_productivity_factor: number | null
          last_used_at: string | null
          organization_id: string | null
          projects_used_in: number | null
          template_code: string | null
          template_id: string | null
          template_name: string | null
          template_scope: string | null
          template_unit_cost: number | null
          times_adjusted: number | null
          times_overridden: number | null
          times_used: number | null
          work_category:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_assembly_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bid_category_summary: {
        Row: {
          assembly_count: number | null
          avg_unit_cost: number | null
          bid_project_id: string | null
          high_risk_count: number | null
          historical_count: number | null
          item_count: number | null
          manual_count: number | null
          project_name: string | null
          review_pct: number | null
          reviewed_count: number | null
          subquote_count: number | null
          total_base_cost: number | null
          total_extended_price: number | null
          total_quantity: number | null
          work_category:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
        ]
      }
      v_bid_environmental_summary: {
        Row: {
          asbestos_findings: number | null
          bid_project_id: string | null
          cost_impacting_commitments: number | null
          lead_findings: number | null
          licensed_contractor_required: number | null
          linked_item_count: number | null
          max_schedule_impact_days: number | null
          not_covered_count: number | null
          permit_count: number | null
          positive_findings: number | null
          project_name: string | null
          schedule_impacting_commitments: number | null
          total_commitments: number | null
          total_env_cost_impact: number | null
          total_hazmat_cost: number | null
          total_hazmat_findings: number | null
          unpaid_commitment_count: number | null
          work_window_count: number | null
        }
        Relationships: []
      }
      v_bid_feedback_summary: {
        Row: {
          avg_rating: number | null
          avg_time_saved_minutes: number | null
          feedback_type: string | null
          negative_count: number | null
          organization_id: string | null
          positive_count: number | null
          total_feedback: number | null
          would_use_again_count: number | null
          would_use_again_percentage: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_learning_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bid_items_needing_review: {
        Row: {
          assembly_name: string | null
          base_unit_cost: number | null
          bid_project_id: string | null
          description: string | null
          estimation_method:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          extended_value: number | null
          has_assembly: boolean | null
          id: string | null
          item_number: string | null
          linked_questions: number | null
          linked_risks: number | null
          price_source: Database["public"]["Enums"]["price_source_enum"] | null
          project_name: string | null
          quantity: number | null
          review_priority_score: number | null
          review_reason: string | null
          risk_level: Database["public"]["Enums"]["severity_enum"] | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
        ]
      }
      v_bid_line_item_full: {
        Row: {
          ai_categorization_confidence: number | null
          ai_confidence_score: number | null
          ai_suggested_unit_price: number | null
          assembly_ai_suggested: boolean | null
          assembly_calculated_cost: number | null
          assembly_confidence: number | null
          assembly_id: string | null
          assembly_template_code: string | null
          assembly_template_name: string | null
          base_unit_cost: number | null
          bid_project_id: string | null
          contingency_pct: number | null
          description: string | null
          effective_unit_price: number | null
          equipment_cost: number | null
          estimation_method:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          final_extended_price: number | null
          final_unit_price: number | null
          id: string | null
          item_number: string | null
          labor_cost: number | null
          linked_env_count: number | null
          linked_question_count: number | null
          linked_risk_count: number | null
          linked_structure_count: number | null
          material_cost: number | null
          overhead_pct: number | null
          package_code: string | null
          package_name: string | null
          price_source: Database["public"]["Enums"]["price_source_enum"] | null
          pricing_reviewed: boolean | null
          pricing_reviewed_at: string | null
          productivity_factor: number | null
          profit_pct: number | null
          quantity: number | null
          review_priority_score: number | null
          risk_level: Database["public"]["Enums"]["severity_enum"] | null
          structure_id: string | null
          structure_name: string | null
          structure_type: string | null
          sub_cost: number | null
          template_work_category:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
          unit: string | null
          unit_cost_breakdown: Json | null
          work_category:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
          work_package_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
        ]
      }
      v_bid_line_item_links: {
        Row: {
          bid_project_id: string | null
          description: string | null
          env_link_count: number | null
          hazmat_link_count: number | null
          item_number: string | null
          line_item_id: string | null
          linked_risk_titles: string[] | null
          linked_structure_names: string[] | null
          question_link_count: number | null
          risk_link_count: number | null
          structure_link_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_line_items_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
        ]
      }
      v_bid_outcome_analytics: {
        Row: {
          avg_loss_spread: number | null
          avg_predicted_win_prob: number | null
          avg_prediction_accuracy: number | null
          losses: number | null
          no_bids: number | null
          organization_id: string | null
          total_bids: number | null
          total_won_value: number | null
          win_rate_percentage: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bid_price_change_history: {
        Row: {
          change_origin: string | null
          change_reason: string | null
          changed_at: string | null
          changed_by_email: string | null
          description: string | null
          item_number: string | null
          line_item_id: string | null
          new_estimation_method:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          new_unit_price: number | null
          old_estimation_method:
            | Database["public"]["Enums"]["estimation_method_enum"]
            | null
          old_unit_price: number | null
          price_change_pct: number | null
          price_delta: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_line_item_price_changes_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "bid_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_item_price_changes_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_items_needing_review"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_item_price_changes_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_line_item_price_changes_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_line_item_links"
            referencedColumns: ["line_item_id"]
          },
          {
            foreignKeyName: "bid_line_item_price_changes_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "v_bid_scenario_comparison"
            referencedColumns: ["line_item_id"]
          },
        ]
      }
      v_bid_pricing_summary: {
        Row: {
          bid_project_id: string | null
          default_contingency_pct: number | null
          default_overhead_pct: number | null
          default_profit_pct: number | null
          effective_margin_pct: number | null
          is_primary: boolean | null
          items_with_scenario_pricing: number | null
          project_name: string | null
          scenario_id: string | null
          scenario_name: string | null
          scenario_type:
            | Database["public"]["Enums"]["pricing_scenario_type_enum"]
            | null
          total_base_cost: number | null
          total_items: number | null
          total_with_markups: number | null
        }
        Relationships: []
      }
      v_bid_project_dashboard: {
        Row: {
          bid_due_date: string | null
          bid_project_id: string | null
          documents_processed: number | null
          estimated_completion_pct: number | null
          high_critical_risks: number | null
          items_assembly_priced: number | null
          items_manual_priced: number | null
          items_reviewed: number | null
          items_subquote_priced: number | null
          letting_date: string | null
          owner: string | null
          pricing_scenarios_count: number | null
          project_name: string | null
          questions_answered: number | null
          questions_submitted: number | null
          status: Database["public"]["Enums"]["bid_status_enum"] | null
          total_base_cost: number | null
          total_bid_value: number | null
          total_documents: number | null
          total_env_commitments: number | null
          total_hazmat_findings: number | null
          total_line_items: number | null
          total_opportunities: number | null
          total_questions: number | null
          total_risks: number | null
          total_work_packages: number | null
        }
        Relationships: []
      }
      v_bid_projects_summary: {
        Row: {
          ai_analysis_completed_at: string | null
          assigned_estimator_id: string | null
          assigned_pm_id: string | null
          bid_due_date: string | null
          contract_time_days: number | null
          county: string | null
          created_at: string | null
          dbe_goal_percentage: number | null
          document_count: number | null
          estimator_name: string | null
          id: string | null
          letting_date: string | null
          line_item_count: number | null
          liquidated_damages_per_day: number | null
          organization_id: string | null
          overall_complexity:
            | Database["public"]["Enums"]["complexity_enum"]
            | null
          pm_name: string | null
          project_name: string | null
          route: string | null
          state_project_number: string | null
          status: Database["public"]["Enums"]["bid_status_enum"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_projects_assigned_estimator_id_fkey"
            columns: ["assigned_estimator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_projects_assigned_pm_id_fkey"
            columns: ["assigned_pm_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_bid_questions_summary: {
        Row: {
          ai_suggested: number | null
          answered: number | null
          approved: number | null
          bid_project_id: string | null
          project_name: string | null
          submitted: number | null
          total_questions: number | null
        }
        Relationships: []
      }
      v_bid_risk_summary: {
        Row: {
          bid_project_id: string | null
          contractor_risks: number | null
          critical_risks: number | null
          high_risks: number | null
          low_risks: number | null
          medium_risks: number | null
          owner_risks: number | null
          pending_review: number | null
          project_name: string | null
          questions_recommended: number | null
          shared_risks: number | null
          total_opportunities: number | null
          total_opportunity_value_high: number | null
          total_opportunity_value_low: number | null
          total_risks: number | null
        }
        Relationships: []
      }
      v_bid_scenario_comparison: {
        Row: {
          base_unit_cost: number | null
          contingency_pct: number | null
          description: string | null
          item_number: string | null
          line_item_id: string | null
          markup_amount: number | null
          markup_percentage: number | null
          overhead_pct: number | null
          profit_pct: number | null
          quantity: number | null
          scenario_extended_price: number | null
          scenario_name: string | null
          scenario_type:
            | Database["public"]["Enums"]["pricing_scenario_type_enum"]
            | null
          scenario_unit_price: number | null
          unit: string | null
        }
        Relationships: []
      }
      v_bid_summary: {
        Row: {
          bid_due_date: string | null
          contract_months: number | null
          county: string | null
          engineer_estimate: number | null
          grand_total: number | null
          id: string | null
          indirect_total: number | null
          line_item_count: number | null
          our_rank: number | null
          project_name: string | null
          self_perform_total: number | null
          state_project_num: string | null
          status: Database["public"]["Enums"]["bid_status_enum"] | null
          subcontract_total: number | null
          total_bidders: number | null
          total_line_items: number | null
          winning_bid_price: number | null
        }
        Relationships: []
      }
      v_bid_version_comparison: {
        Row: {
          bid_project_id: string | null
          created_at: string | null
          delta_from_previous: number | null
          effective_margin_pct: number | null
          is_current: boolean | null
          prev_total: number | null
          total_base_cost: number | null
          total_items: number | null
          total_with_markups: number | null
          trigger_event: string | null
          version_name: string | null
          version_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_estimate_versions_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
        ]
      }
      v_bid_work_packages_with_items: {
        Row: {
          ai_generated: boolean | null
          assigned_estimator_id: string | null
          bid_project_id: string | null
          estimator_name: string | null
          id: string | null
          items: Json | null
          package_code: string | null
          package_name: string | null
          package_number: number | null
          sort_order: number | null
          status: string | null
          total_items: number | null
          work_category:
            | Database["public"]["Enums"]["work_category_enum"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_work_packages_assigned_estimator_id_fkey"
            columns: ["assigned_estimator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "bid_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_environmental_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_pricing_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_project_dashboard"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_projects_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_questions_summary"
            referencedColumns: ["bid_project_id"]
          },
          {
            foreignKeyName: "bid_work_packages_bid_project_id_fkey"
            columns: ["bid_project_id"]
            isOneToOne: false
            referencedRelation: "v_bid_risk_summary"
            referencedColumns: ["bid_project_id"]
          },
        ]
      }
      v_bid_work_windows: {
        Row: {
          bid_project_id: string | null
          end_date: string | null
          notes: string | null
          project_name: string | null
          restriction_name: string | null
          restriction_type: string | null
          source_type: string | null
          start_date: string | null
        }
        Relationships: []
      }
      v_change_order_log: {
        Row: {
          change_order_number: string | null
          change_type: Database["public"]["Enums"]["change_order_type"] | null
          executed_at: string | null
          id: string | null
          project_name: string | null
          project_number: string | null
          status: Database["public"]["Enums"]["change_order_status"] | null
          this_change_amount: number | null
          this_time_extension: number | null
          title: string | null
        }
        Relationships: []
      }
      v_daily_crew_schedule: {
        Row: {
          assignment_date: string | null
          assignment_id: string | null
          compliance_issues: string[] | null
          compliance_passed: boolean | null
          crew_name: string | null
          crew_size: number | null
          foreman_name: string | null
          organization_id: string | null
          project_id: string | null
          project_name: string | null
          shift: string | null
          status: Database["public"]["Enums"]["crew_assignment_status"] | null
          work_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crew_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_equipment_health_overview: {
        Row: {
          equipment_id: string | null
          equipment_name: string | null
          equipment_type: string | null
          failure_probability: number | null
          health_status: string | null
          project_name: string | null
          recommended_date: string | null
          recommended_maintenance: string | null
          remaining_useful_life_hours: number | null
        }
        Relationships: []
      }
      v_equipment_status: {
        Row: {
          current_hours: number | null
          current_project_id: string | null
          current_project_name: string | null
          equipment_category: string | null
          equipment_number: string | null
          equipment_type: string | null
          id: string | null
          maintenance_status: string | null
          name: string | null
          next_service_due_date: string | null
          next_service_due_hours: number | null
          organization_id: string | null
          ownership_type: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_current_project_id_fkey"
            columns: ["current_project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "equipment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_failed_tests: {
        Row: {
          id: string | null
          organization_id: string | null
          project_id: string | null
          project_name: string | null
          result_unit: string | null
          result_value: number | null
          sample_date: string | null
          specification_max: number | null
          specification_min: number | null
          test_number: string | null
          test_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "test_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_line_item_costing: {
        Row: {
          calculated_unit_price: number | null
          contingency_pct: number | null
          description: string | null
          equipment_cost: number | null
          fulfillment_method:
            | Database["public"]["Enums"]["fulfillment_enum"]
            | null
          item_id: string | null
          labor_cost: number | null
          line_item_id: string | null
          line_number: string | null
          material_cost: number | null
          overhead_pct: number | null
          profit_pct: number | null
          proposal_id: string | null
          quantity: number | null
          subcontractor_cost: number | null
          total_direct_cost: number | null
          total_price_bid: number | null
          unit_of_measure: string | null
          unit_price_bid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_line_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "bid_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_line_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "v_bid_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      v_open_ncrs: {
        Row: {
          corrective_action_due_date: string | null
          discovered_date: string | null
          id: string | null
          is_overdue: boolean | null
          ncr_number: string | null
          organization_id: string | null
          project_id: string | null
          project_name: string | null
          severity: Database["public"]["Enums"]["ncr_severity"] | null
          status: Database["public"]["Enums"]["ncr_status"] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "non_conformances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_conformances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "non_conformances_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_open_rfis: {
        Row: {
          ball_in_court: string | null
          category: Database["public"]["Enums"]["rfi_category"] | null
          days_open: number | null
          id: string | null
          is_overdue: boolean | null
          priority: Database["public"]["Enums"]["rfi_priority"] | null
          project_name: string | null
          project_number: string | null
          response_required_by: string | null
          rfi_number: string | null
          spec_section: string | null
          status: Database["public"]["Enums"]["rfi_status"] | null
          subject: string | null
          submitted_at: string | null
        }
        Relationships: []
      }
      v_pending_ai_confirmations: {
        Row: {
          ai_analyzed_at: string | null
          ai_description: string | null
          ai_mark_colors_detected: string[] | null
          ai_quality_score: number | null
          ai_safety_concerns: string[] | null
          ai_utility_types_visible: string[] | null
          created_at: string | null
          file_name: string | null
          id: string | null
          ticket_id: string | null
          ticket_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wv811_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pending_cors: {
        Row: {
          change_type: Database["public"]["Enums"]["change_order_type"] | null
          cor_number: string | null
          days_open: number | null
          estimated_cost: number | null
          id: string | null
          originated_by: string | null
          origination_date: string | null
          priced_cost: number | null
          project_name: string | null
          project_number: string | null
          status: Database["public"]["Enums"]["pco_status"] | null
          title: string | null
        }
        Relationships: []
      }
      v_pending_report_approvals: {
        Row: {
          created_by_name: string | null
          hours_pending: number | null
          id: string | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
          report_date: string | null
          report_number: string | null
          status: string | null
          submitted_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_pending_sub_payments: {
        Row: {
          agreement_number: string | null
          current_payment_due: number | null
          days_pending: number | null
          invoice_id: string | null
          invoice_number: string | null
          pay_application_number: number | null
          project_name: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subcontractor_name: string | null
          submitted_at: string | null
        }
        Relationships: []
      }
      v_pending_submittals: {
        Row: {
          days_pending: number | null
          id: string | null
          project_name: string | null
          required_date: string | null
          spec_section: string | null
          status: Database["public"]["Enums"]["submittal_status"] | null
          subcontractor_name: string | null
          submittal_number: string | null
          submitted_date: string | null
          title: string | null
        }
        Relationships: []
      }
      v_pending_time_approvals: {
        Row: {
          cost_code: string | null
          crew_member_id: string | null
          entered_by_name: string | null
          entered_by_user_id: string | null
          id: string | null
          overtime_hours: number | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
          regular_hours: number | null
          status: string | null
          submitted_at: string | null
          total_hours: number | null
          trade_classification: string | null
          work_date: string | null
          worker_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "v_active_crew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_entered_by_user_id_fkey"
            columns: ["entered_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_project_change_order_summary: {
        Row: {
          change_percentage: number | null
          current_contract_value: number | null
          executed_cos: number | null
          original_contract_value: number | null
          pending_cors: number | null
          pending_value: number | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
          total_changes: number | null
        }
        Insert: {
          change_percentage?: never
          current_contract_value?: number | null
          executed_cos?: never
          original_contract_value?: number | null
          pending_cors?: never
          pending_value?: never
          project_id?: string | null
          project_name?: string | null
          project_number?: string | null
          total_changes?: never
        }
        Update: {
          change_percentage?: never
          current_contract_value?: number | null
          executed_cos?: never
          original_contract_value?: number | null
          pending_cors?: never
          pending_value?: never
          project_id?: string | null
          project_name?: string | null
          project_number?: string | null
          total_changes?: never
        }
        Relationships: []
      }
      v_project_dbe_summary: {
        Row: {
          current_contract_value: number | null
          dbe_committed: number | null
          dbe_committed_percentage: number | null
          dbe_goal_amount: number | null
          dbe_goal_percentage: number | null
          dbe_paid: number | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
        }
        Relationships: []
      }
      v_project_health_dashboard: {
        Row: {
          active_alerts: number | null
          actual_percent_complete: number | null
          cpi: number | null
          critical_alerts: number | null
          health_score: number | null
          open_ncrs: number | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
          recordable_incidents: number | null
          spi: number | null
          status: string | null
        }
        Relationships: []
      }
      v_project_rfi_stats: {
        Row: {
          avg_response_days: number | null
          closed_rfis: number | null
          cost_impacting: number | null
          critical_rfis: number | null
          open_rfis: number | null
          overdue_rfis: number | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
          schedule_impacting: number | null
          total_rfis: number | null
        }
        Relationships: []
      }
      v_punch_list_summary: {
        Row: {
          completed_items: number | null
          completion_percentage: number | null
          due_date: string | null
          id: string | null
          list_type: string | null
          name: string | null
          organization_id: string | null
          project_id: string | null
          project_name: string | null
          remaining_items: number | null
          status: string | null
          total_items: number | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_purchase_order_summary: {
        Row: {
          id: string | null
          line_count: number | null
          organization_id: string | null
          po_date: string | null
          po_number: string | null
          project_id: string | null
          project_name: string | null
          remaining_amount: number | null
          status: Database["public"]["Enums"]["po_status"] | null
          ticket_count: number | null
          total_amount: number | null
          total_received_amount: number | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_recent_ai_queries: {
        Row: {
          created_at: string | null
          id: string | null
          project_id: string | null
          project_name: string | null
          query: string | null
          query_type: string | null
          user_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_recent_daily_reports: {
        Row: {
          approved_at: string | null
          created_at: string | null
          created_by_name: string | null
          created_by_user_id: string | null
          equipment_count: number | null
          has_voice_recording: boolean | null
          id: string | null
          no_work_reason: string | null
          organization_id: string | null
          photo_count: number | null
          project_id: string | null
          project_name: string | null
          project_number: string | null
          report_date: string | null
          report_number: string | null
          shift_type: string | null
          status: string | null
          submitted_at: string | null
          temperature_high_f: number | null
          total_man_hours: number | null
          total_workers: number | null
          weather_condition: string | null
          work_performed: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "daily_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_recent_documents: {
        Row: {
          created_at: string | null
          document_number: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          file_name: string | null
          id: string | null
          project_name: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          title: string | null
          uploaded_by: string | null
        }
        Relationships: []
      }
      v_rfi_log: {
        Row: {
          category: Database["public"]["Enums"]["rfi_category"] | null
          closed_at: string | null
          cost_impact: boolean | null
          created_by_name: string | null
          drawing_reference: string | null
          id: string | null
          priority: Database["public"]["Enums"]["rfi_priority"] | null
          project_name: string | null
          project_number: string | null
          responded_at: string | null
          response_days: number | null
          response_required_by: string | null
          rfi_number: string | null
          schedule_impact: boolean | null
          spec_section: string | null
          status: Database["public"]["Enums"]["rfi_status"] | null
          subject: string | null
          submitted_at: string | null
        }
        Relationships: []
      }
      v_section_summary: {
        Row: {
          chunk_count: number | null
          division_number: number | null
          division_title: string | null
          document_id: string | null
          document_type:
            | Database["public"]["Enums"]["spec_document_type"]
            | null
          end_page: number | null
          id: string | null
          pay_item_count: number | null
          section_number: string | null
          start_page: number | null
          subsection_count: number | null
          table_count: number | null
          title: string | null
          version_year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spec_sections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "spec_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      v_submittal_log: {
        Row: {
          id: string | null
          project_name: string | null
          project_number: string | null
          required_date: string | null
          review_days: number | null
          revision_number: number | null
          spec_section: string | null
          spec_section_title: string | null
          status: Database["public"]["Enums"]["submittal_status"] | null
          subcontractor_name: string | null
          submittal_number: string | null
          submittal_type: string | null
          submitted_date: string | null
          title: string | null
        }
        Relationships: []
      }
      v_tickets_pending_verification: {
        Row: {
          delivery_date: string | null
          id: string | null
          material_description: string | null
          ocr_status: Database["public"]["Enums"]["ocr_status"] | null
          organization_id: string | null
          project_id: string | null
          project_name: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["ticket_status"] | null
          ticket_number: string | null
          ticket_photo_url: string | null
          unit_of_measure: string | null
          vendor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "material_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_user_accessible_modules: {
        Row: {
          module_group: string | null
          module_icon: string | null
          module_key: string | null
          module_name: string | null
          module_path: string | null
          sort_order: number | null
        }
        Relationships: []
      }
      v_weekly_timesheet_summary: {
        Row: {
          employee_id: string | null
          employee_name: string | null
          employee_number: string | null
          project_id: string | null
          project_name: string | null
          total_double_time: number | null
          total_fringe: number | null
          total_gross: number | null
          total_hours: number | null
          total_overtime: number | null
          total_regular: number | null
          week_end: string | null
          week_start: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_active_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_change_order_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "task_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_dbe_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "task_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_health_dashboard"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "task_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "v_project_rfi_stats"
            referencedColumns: ["project_id"]
          },
        ]
      }
      v_weekly_timesheets: {
        Row: {
          crew_member_id: string | null
          days_worked: number | null
          organization_id: string | null
          project_names: string[] | null
          projects_worked: number | null
          total_double_time: number | null
          total_hours: number | null
          total_overtime: number | null
          total_regular: number | null
          trade_classification: string | null
          week_start: string | null
          worker_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "v_active_crew"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_wv811_active_tickets: {
        Row: {
          created_at: string | null
          dig_site_address: string | null
          dig_site_city: string | null
          dig_site_county: string | null
          dig_urgency: string | null
          excavator_company: string | null
          hours_until_dig: number | null
          id: string | null
          legal_dig_date: string | null
          organization_id: string | null
          pending_utilities: number | null
          project_id: string | null
          responded_utilities: number | null
          status: Database["public"]["Enums"]["wv811_ticket_status"] | null
          ticket_created_at: string | null
          ticket_expires_at: string | null
          ticket_number: string | null
          total_utilities: number | null
          work_type: Database["public"]["Enums"]["wv811_work_type"] | null
        }
        Insert: {
          created_at?: string | null
          dig_site_address?: string | null
          dig_site_city?: string | null
          dig_site_county?: string | null
          dig_urgency?: never
          excavator_company?: string | null
          hours_until_dig?: never
          id?: string | null
          legal_dig_date?: string | null
          organization_id?: string | null
          pending_utilities?: never
          project_id?: string | null
          responded_utilities?: number | null
          status?: Database["public"]["Enums"]["wv811_ticket_status"] | null
          ticket_created_at?: string | null
          ticket_expires_at?: string | null
          ticket_number?: string | null
          total_utilities?: number | null
          work_type?: Database["public"]["Enums"]["wv811_work_type"] | null
        }
        Update: {
          created_at?: string | null
          dig_site_address?: string | null
          dig_site_city?: string | null
          dig_site_county?: string | null
          dig_urgency?: never
          excavator_company?: string | null
          hours_until_dig?: never
          id?: string | null
          legal_dig_date?: string | null
          organization_id?: string | null
          pending_utilities?: never
          project_id?: string | null
          responded_utilities?: number | null
          status?: Database["public"]["Enums"]["wv811_ticket_status"] | null
          ticket_created_at?: string | null
          ticket_expires_at?: string | null
          ticket_number?: string | null
          total_utilities?: number | null
          work_type?: Database["public"]["Enums"]["wv811_work_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "wv811_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_wv811_expiring_soon: {
        Row: {
          alert_count: number | null
          created_at: string | null
          created_by: string | null
          cross_street_1: string | null
          cross_street_2: string | null
          days_until_expiration: number | null
          depth_in_inches: number | null
          dig_area_polygon: unknown
          dig_site_address: string | null
          dig_site_city: string | null
          dig_site_county: string | null
          dig_site_location: unknown
          dig_site_state: string | null
          dig_site_zip: string | null
          excavator_address: string | null
          excavator_company: string | null
          excavator_email: string | null
          excavator_name: string | null
          excavator_phone: string | null
          extent_description: string | null
          id: string | null
          last_alert_sent_at: string | null
          legal_dig_date: string | null
          location_description: string | null
          notes: string | null
          organization_id: string | null
          original_email_id: string | null
          parsed_at: string | null
          parsing_confidence: number | null
          parsing_model: string | null
          project_id: string | null
          raw_parsed_data: Json | null
          responded_utilities: number | null
          status: Database["public"]["Enums"]["wv811_ticket_status"] | null
          status_changed_at: string | null
          ticket_created_at: string | null
          ticket_expires_at: string | null
          ticket_number: string | null
          ticket_type: string | null
          total_utilities: number | null
          updated_at: string | null
          work_description: string | null
          work_end_date: string | null
          work_start_date: string | null
          work_type: Database["public"]["Enums"]["wv811_work_type"] | null
        }
        Insert: {
          alert_count?: number | null
          created_at?: string | null
          created_by?: string | null
          cross_street_1?: string | null
          cross_street_2?: string | null
          days_until_expiration?: never
          depth_in_inches?: number | null
          dig_area_polygon?: unknown
          dig_site_address?: string | null
          dig_site_city?: string | null
          dig_site_county?: string | null
          dig_site_location?: unknown
          dig_site_state?: string | null
          dig_site_zip?: string | null
          excavator_address?: string | null
          excavator_company?: string | null
          excavator_email?: string | null
          excavator_name?: string | null
          excavator_phone?: string | null
          extent_description?: string | null
          id?: string | null
          last_alert_sent_at?: string | null
          legal_dig_date?: string | null
          location_description?: string | null
          notes?: string | null
          organization_id?: string | null
          original_email_id?: string | null
          parsed_at?: string | null
          parsing_confidence?: number | null
          parsing_model?: string | null
          project_id?: string | null
          raw_parsed_data?: Json | null
          responded_utilities?: number | null
          status?: Database["public"]["Enums"]["wv811_ticket_status"] | null
          status_changed_at?: string | null
          ticket_created_at?: string | null
          ticket_expires_at?: string | null
          ticket_number?: string | null
          ticket_type?: string | null
          total_utilities?: number | null
          updated_at?: string | null
          work_description?: string | null
          work_end_date?: string | null
          work_start_date?: string | null
          work_type?: Database["public"]["Enums"]["wv811_work_type"] | null
        }
        Update: {
          alert_count?: number | null
          created_at?: string | null
          created_by?: string | null
          cross_street_1?: string | null
          cross_street_2?: string | null
          days_until_expiration?: never
          depth_in_inches?: number | null
          dig_area_polygon?: unknown
          dig_site_address?: string | null
          dig_site_city?: string | null
          dig_site_county?: string | null
          dig_site_location?: unknown
          dig_site_state?: string | null
          dig_site_zip?: string | null
          excavator_address?: string | null
          excavator_company?: string | null
          excavator_email?: string | null
          excavator_name?: string | null
          excavator_phone?: string | null
          extent_description?: string | null
          id?: string | null
          last_alert_sent_at?: string | null
          legal_dig_date?: string | null
          location_description?: string | null
          notes?: string | null
          organization_id?: string | null
          original_email_id?: string | null
          parsed_at?: string | null
          parsing_confidence?: number | null
          parsing_model?: string | null
          project_id?: string | null
          raw_parsed_data?: Json | null
          responded_utilities?: number | null
          status?: Database["public"]["Enums"]["wv811_ticket_status"] | null
          status_changed_at?: string | null
          ticket_created_at?: string | null
          ticket_expires_at?: string | null
          ticket_number?: string | null
          ticket_type?: string | null
          total_utilities?: number | null
          updated_at?: string | null
          work_description?: string | null
          work_end_date?: string | null
          work_start_date?: string | null
          work_type?: Database["public"]["Enums"]["wv811_work_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "wv811_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_tickets_original_email_id_fkey"
            columns: ["original_email_id"]
            isOneToOne: false
            referencedRelation: "wv811_email_ingests"
            referencedColumns: ["id"]
          },
        ]
      }
      v_wv811_tickets_with_coords: {
        Row: {
          alert_count: number | null
          created_at: string | null
          created_by: string | null
          cross_street_1: string | null
          cross_street_2: string | null
          depth_in_inches: number | null
          dig_area_polygon: unknown
          dig_site_address: string | null
          dig_site_city: string | null
          dig_site_county: string | null
          dig_site_location: unknown
          dig_site_state: string | null
          dig_site_zip: string | null
          done_for: string | null
          excavator_address: string | null
          excavator_company: string | null
          excavator_email: string | null
          excavator_name: string | null
          excavator_phone: string | null
          extent_description: string | null
          has_coordinates: boolean | null
          has_electric_utility: boolean | null
          has_gas_utility: boolean | null
          id: string | null
          is_high_risk: boolean | null
          last_alert_sent_at: string | null
          latitude: number | null
          legal_dig_date: string | null
          location_description: string | null
          longitude: number | null
          notes: string | null
          organization_id: string | null
          original_email_id: string | null
          parent_ticket_id: string | null
          parsed_at: string | null
          parsing_confidence: number | null
          parsing_model: string | null
          portal_url: string | null
          project_id: string | null
          raw_parsed_data: Json | null
          renewal_requested_at: string | null
          responded_utilities: number | null
          risk_score: number | null
          status: Database["public"]["Enums"]["wv811_ticket_status"] | null
          status_changed_at: string | null
          taken_date: string | null
          ticket_created_at: string | null
          ticket_expires_at: string | null
          ticket_number: string | null
          ticket_type: string | null
          total_utilities: number | null
          update_by_date: string | null
          updated_at: string | null
          work_date: string | null
          work_description: string | null
          work_end_date: string | null
          work_start_date: string | null
          work_type: Database["public"]["Enums"]["wv811_work_type"] | null
        }
        Insert: {
          alert_count?: number | null
          created_at?: string | null
          created_by?: string | null
          cross_street_1?: string | null
          cross_street_2?: string | null
          depth_in_inches?: number | null
          dig_area_polygon?: unknown
          dig_site_address?: string | null
          dig_site_city?: string | null
          dig_site_county?: string | null
          dig_site_location?: unknown
          dig_site_state?: string | null
          dig_site_zip?: string | null
          done_for?: string | null
          excavator_address?: string | null
          excavator_company?: string | null
          excavator_email?: string | null
          excavator_name?: string | null
          excavator_phone?: string | null
          extent_description?: string | null
          has_coordinates?: never
          has_electric_utility?: boolean | null
          has_gas_utility?: boolean | null
          id?: string | null
          is_high_risk?: boolean | null
          last_alert_sent_at?: string | null
          latitude?: never
          legal_dig_date?: string | null
          location_description?: string | null
          longitude?: never
          notes?: string | null
          organization_id?: string | null
          original_email_id?: string | null
          parent_ticket_id?: string | null
          parsed_at?: string | null
          parsing_confidence?: number | null
          parsing_model?: string | null
          portal_url?: string | null
          project_id?: string | null
          raw_parsed_data?: Json | null
          renewal_requested_at?: string | null
          responded_utilities?: number | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["wv811_ticket_status"] | null
          status_changed_at?: string | null
          taken_date?: string | null
          ticket_created_at?: string | null
          ticket_expires_at?: string | null
          ticket_number?: string | null
          ticket_type?: string | null
          total_utilities?: number | null
          update_by_date?: string | null
          updated_at?: string | null
          work_date?: string | null
          work_description?: string | null
          work_end_date?: string | null
          work_start_date?: string | null
          work_type?: Database["public"]["Enums"]["wv811_work_type"] | null
        }
        Update: {
          alert_count?: number | null
          created_at?: string | null
          created_by?: string | null
          cross_street_1?: string | null
          cross_street_2?: string | null
          depth_in_inches?: number | null
          dig_area_polygon?: unknown
          dig_site_address?: string | null
          dig_site_city?: string | null
          dig_site_county?: string | null
          dig_site_location?: unknown
          dig_site_state?: string | null
          dig_site_zip?: string | null
          done_for?: string | null
          excavator_address?: string | null
          excavator_company?: string | null
          excavator_email?: string | null
          excavator_name?: string | null
          excavator_phone?: string | null
          extent_description?: string | null
          has_coordinates?: never
          has_electric_utility?: boolean | null
          has_gas_utility?: boolean | null
          id?: string | null
          is_high_risk?: boolean | null
          last_alert_sent_at?: string | null
          latitude?: never
          legal_dig_date?: string | null
          location_description?: string | null
          longitude?: never
          notes?: string | null
          organization_id?: string | null
          original_email_id?: string | null
          parent_ticket_id?: string | null
          parsed_at?: string | null
          parsing_confidence?: number | null
          parsing_model?: string | null
          portal_url?: string | null
          project_id?: string | null
          raw_parsed_data?: Json | null
          renewal_requested_at?: string | null
          responded_utilities?: number | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["wv811_ticket_status"] | null
          status_changed_at?: string | null
          taken_date?: string | null
          ticket_created_at?: string | null
          ticket_expires_at?: string | null
          ticket_number?: string | null
          ticket_type?: string | null
          total_utilities?: number | null
          update_by_date?: string | null
          updated_at?: string | null
          work_date?: string | null
          work_description?: string | null
          work_end_date?: string | null
          work_start_date?: string | null
          work_type?: Database["public"]["Enums"]["wv811_work_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "wv811_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_tickets_original_email_id_fkey"
            columns: ["original_email_id"]
            isOneToOne: false
            referencedRelation: "wv811_email_ingests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_active_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "v_wv811_tickets_with_coords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wv811_tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "wv811_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      add_wv_business_days: {
        Args: { num_days: number; start_date: string }
        Returns: string
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      apply_assembly_template:
        | {
            Args: {
              p_line_item_id: string
              p_template_id: string
              p_wage_determination_id?: string
            }
            Returns: number
          }
        | {
            Args: {
              p_ai_confidence?: number
              p_ai_reason?: string
              p_is_ai_suggested?: boolean
              p_line_item_id: string
              p_productivity_factor?: number
              p_template_id: string
            }
            Returns: string
          }
      auto_expire_tickets: { Args: never; Returns: number }
      auto_match_material_ticket: {
        Args: { p_ticket_id: string }
        Returns: {
          confidence: number
          match_reason: string
          matched: boolean
          po_id: string
          po_line_id: string
        }[]
      }
      calculate_item_assembly_cost: {
        Args: { p_item_assembly_id: string }
        Returns: number
      }
      calculate_legal_dig_date: {
        Args: { ticket_created: string }
        Returns: string
      }
      calculate_line_item_price: {
        Args: { p_line_item_id: string }
        Returns: number
      }
      calculate_percentage_items: {
        Args: { p_proposal_id: string }
        Returns: undefined
      }
      calculate_project_health_score: {
        Args: { p_project_id: string }
        Returns: number
      }
      calculate_response_window_close: {
        Args: { ticket_created_at: string }
        Returns: string
      }
      calculate_ticket_expiration: {
        Args: { legal_dig: string }
        Returns: string
      }
      calculate_ticket_risk_score: {
        Args: { ticket_id: string }
        Returns: number
      }
      calculate_weekly_overtime: {
        Args: { p_crew_member_id: string; p_work_date: string }
        Returns: {
          hours_until_overtime: number
          week_overtime_hours: number
          week_regular_hours: number
        }[]
      }
      check_dig_status: {
        Args: {
          p_check_date: string
          p_check_time?: string
          p_location: string
          p_organization_id: string
        }
        Returns: {
          issues: Json
          result: string
          result_message: string
          ticket_id: string
          ticket_number: string
        }[]
      }
      check_dig_status_v2: {
        Args: {
          p_check_date: string
          p_check_time?: string
          p_location: string
          p_organization_id: string
        }
        Returns: {
          issues: Json
          result: string
          result_message: string
          ticket_id: string
          ticket_number: string
          utility_statuses: Json
        }[]
      }
      check_sms_rate_limit: {
        Args: { p_max_per_hour?: number; p_phone: string; p_type: string }
        Returns: boolean
      }
      check_utility_response_windows: { Args: never; Returns: number }
      compute_daily_material_summary: {
        Args: { p_date: string; p_project_id: string }
        Returns: string
      }
      confirm_ai_analysis: {
        Args: {
          p_attachment_id: string
          p_confirmed?: boolean
          p_modified_data?: Json
        }
        Returns: boolean
      }
      count_tickets_without_coordinates: {
        Args: { p_organization_id?: string }
        Returns: number
      }
      create_default_pricing_scenarios: {
        Args: { p_bid_project_id: string }
        Returns: undefined
      }
      create_estimate_snapshot: {
        Args: {
          p_bid_project_id: string
          p_description?: string
          p_pricing_scenario_id?: string
          p_trigger_event?: string
          p_version_name: string
        }
        Returns: string
      }
      create_predictive_alert: {
        Args: {
          p_actions?: Json
          p_alert_type: string
          p_indicator_id?: string
          p_message: string
          p_org_id: string
          p_prediction_id?: string
          p_project_id: string
          p_severity: Database["public"]["Enums"]["alert_severity"]
          p_title: string
        }
        Returns: string
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_photos_by_utility_type: {
        Args: { p_organization_id?: string; p_utility_type: string }
        Returns: {
          ai_description: string
          ai_utility_types_visible: string[]
          attachment_id: string
          file_name: string
          storage_path: string
          taken_at: string
          ticket_id: string
          ticket_number: string
        }[]
      }
      find_photos_near_location: {
        Args: {
          p_latitude: number
          p_longitude: number
          p_organization_id?: string
          p_radius_meters?: number
        }
        Returns: {
          attachment_id: string
          distance_meters: number
          file_name: string
          latitude: number
          longitude: number
          storage_path: string
          ticket_id: string
          ticket_number: string
        }[]
      }
      generate_change_order_number: {
        Args: { p_project_id: string }
        Returns: string
      }
      generate_cor_number: { Args: { p_project_id: string }; Returns: string }
      generate_document_number: {
        Args: {
          p_doc_type: Database["public"]["Enums"]["document_type"]
          p_project_id: string
        }
        Returns: string
      }
      generate_incident_number: {
        Args: { p_organization_id: string }
        Returns: string
      }
      generate_inspection_number: {
        Args: { p_project_id: string }
        Returns: string
      }
      generate_ncr_number: { Args: { p_project_id: string }; Returns: string }
      generate_opportunity_number: {
        Args: { p_bid_project_id: string }
        Returns: string
      }
      generate_question_number: {
        Args: { p_bid_project_id: string }
        Returns: string
      }
      generate_report_number: {
        Args: { p_project_id: string; p_report_date: string }
        Returns: string
      }
      generate_rfi_number: { Args: { p_project_id: string }; Returns: string }
      generate_risk_number: {
        Args: { p_bid_project_id: string }
        Returns: string
      }
      generate_subcontract_number: {
        Args: { p_org_id: string; p_project_id: string }
        Returns: string
      }
      generate_submittal_number: {
        Args: { p_project_id: string; p_spec_section: string }
        Returns: string
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_ai_available_tables: {
        Args: { p_org_id: string }
        Returns: {
          access_level: string
          allowed_columns: string[]
          description: string
          table_name: string
        }[]
      }
      get_bid_deliverables_status: {
        Args: { p_bid_project_id: string }
        Returns: {
          deliverable_type: string
          export_id: string
          last_generated: string
          status: string
        }[]
      }
      get_bid_document_url: {
        Args: { p_document_id: string; p_expires_in?: number }
        Returns: string
      }
      get_bid_project_metrics: {
        Args: { p_bid_project_id: string }
        Returns: Json
      }
      get_crew_timesheet_summary: {
        Args: {
          p_crew_member_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          cost_code: string
          double_time_hours: number
          overtime_hours: number
          project_name: string
          regular_hours: number
          status: string
          total_hours: number
          work_date: string
        }[]
      }
      get_daily_radar_data: {
        Args: { p_organization_id: string }
        Returns: {
          category: string
          tickets: Json
        }[]
      }
      get_equipment_maintenance_due: {
        Args: { p_days_ahead?: number }
        Returns: {
          current_hours: number
          current_project: string
          equipment_id: string
          equipment_name: string
          equipment_number: string
          next_service_due_date: string
          next_service_due_hours: number
        }[]
      }
      get_expiring_certifications: {
        Args: { p_days_ahead?: number }
        Returns: {
          certification_type: string
          crew_member_id: string
          crew_member_name: string
          days_until_expiration: number
          expiration_date: string
        }[]
      }
      get_expiring_insurance: {
        Args: { p_days_ahead?: number }
        Returns: {
          carrier_name: string
          company_name: string
          days_until_expiration: number
          expiration_date: string
          insurance_type: string
          subcontractor_id: string
        }[]
      }
      get_item_specs: {
        Args: { p_document_id?: string; p_item_number: string }
        Returns: {
          content: string
          is_measurement: boolean
          is_payment: boolean
          page_number: number
          section_id: string
          section_number: string
          section_title: string
          subsection_number: string
          subsection_title: string
        }[]
      }
      get_materials_variance_report: {
        Args: {
          p_end_date?: string
          p_project_id: string
          p_start_date?: string
        }
        Returns: {
          delivery_date: string
          material_description: string
          po_quantity: number
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_id: string
          ticket_number: string
          ticket_quantity: number
          variance_percentage: number
          variance_quantity: number
          vendor_name: string
        }[]
      }
      get_my_org_id: { Args: never; Returns: string }
      get_next_payroll_number: {
        Args: { p_project_id: string }
        Returns: number
      }
      get_project_report_summary: {
        Args: {
          p_end_date?: string
          p_project_id: string
          p_start_date?: string
        }
        Returns: {
          avg_daily_workers: number
          other_delays: number
          total_equipment_hours: number
          total_man_hours: number
          total_reports: number
          total_working_days: number
          weather_delays: number
        }[]
      }
      get_related_sections: {
        Args: { p_section_id: string }
        Returns: {
          related_section_id: string
          relationship_type: string
          section_number: string
          section_title: string
        }[]
      }
      get_rfi_response_time: { Args: { p_rfi_id: string }; Returns: number }
      get_subcontract_completion: {
        Args: { p_subcontract_id: string }
        Returns: number
      }
      get_ticket_coordinates: {
        Args: { p_ticket_id: string }
        Returns: {
          latitude: number
          longitude: number
        }[]
      }
      get_tickets_needing_alerts: {
        Args: never
        Returns: {
          alert_type: Database["public"]["Enums"]["wv811_alert_type"]
          hours_until_dig: number
          legal_dig_date: string
          organization_id: string
          ticket_expires_at: string
          ticket_id: string
          ticket_number: string
        }[]
      }
      get_tickets_needing_alerts_enhanced: {
        Args: never
        Returns: {
          alert_type: Database["public"]["Enums"]["wv811_alert_type"]
          hours_until_expire: number
          hours_until_update: number
          organization_id: string
          priority: Database["public"]["Enums"]["wv811_alert_priority"]
          ticket_expires_at: string
          ticket_id: string
          ticket_number: string
          update_by_date: string
        }[]
      }
      get_tickets_without_coordinates: {
        Args: { p_limit?: number; p_organization_id?: string }
        Returns: {
          dig_site_address: string
          dig_site_city: string
          dig_site_county: string
          dig_site_state: string
          dig_site_zip: string
          id: string
          ticket_number: string
        }[]
      }
      get_unanalyzed_photos: {
        Args: { p_limit?: number }
        Returns: {
          attachment_id: string
          created_at: string
          file_type: string
          storage_path: string
          ticket_id: string
        }[]
      }
      get_user_organization_id: {
        Args: { p_user_id?: string }
        Returns: string
      }
      get_user_project_role: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: string
      }
      get_user_projects: {
        Args: { p_user_id?: string }
        Returns: {
          is_primary: boolean
          project_id: string
          project_name: string
          project_number: string
          project_role: string
        }[]
      }
      get_user_role_level: { Args: { p_user_id?: string }; Returns: number }
      get_wage_rate: {
        Args: {
          p_org_id: string
          p_project_id: string
          p_trade_classification: string
          p_work_date: string
        }
        Returns: {
          base_rate: number
          double_time_multiplier: number
          fringe_rate: number
          overtime_multiplier: number
          total_rate: number
          wage_rate_id: string
        }[]
      }
      get_wage_rate_for_work: {
        Args: {
          p_organization_id: string
          p_project_id: string
          p_work_classification: Database["public"]["Enums"]["work_classification"]
          p_work_date: string
        }
        Returns: {
          base_rate: number
          fringe_rate: number
          wage_determination_number: string
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      is_within_project_geofence: {
        Args: { p_latitude: number; p_longitude: number; p_project_id: string }
        Returns: boolean
      }
      is_wv_business_day: { Args: { check_date: string }; Returns: boolean }
      log_ai_usage: {
        Args: {
          p_completion_tokens: number
          p_conversation_id: string
          p_latency_ms?: number
          p_message_id: string
          p_model: string
          p_prompt_tokens: number
          p_usage_type: string
        }
        Returns: string
      }
      log_document_access: {
        Args: {
          p_access_type: string
          p_document_id: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: string
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      record_ai_correction: {
        Args: {
          p_ai_confidence?: number
          p_bid_project_id: string
          p_corrected_value: string
          p_correction_reason?: string
          p_correction_type?: string
          p_entity_id: string
          p_entity_type: Database["public"]["Enums"]["correction_entity_enum"]
          p_field_name: string
          p_original_value: string
        }
        Returns: string
      }
      search_specs: {
        Args: {
          filter_document_id?: string
          filter_pay_items?: string[]
          filter_section_ids?: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_type: Database["public"]["Enums"]["spec_chunk_type"]
          content: string
          page_number: number
          section_context: string
          section_id: string
          section_number: string
          section_title: string
          similarity: number
        }[]
      }
      search_ticket_photos_by_keywords: {
        Args: { p_keywords: string[]; p_organization_id?: string }
        Returns: {
          ai_description: string
          ai_keywords: string[]
          attachment_id: string
          file_name: string
          relevance_score: number
          storage_path: string
          ticket_id: string
          ticket_number: string
        }[]
      }
      should_user_receive_alert: {
        Args: {
          p_alert_priority: Database["public"]["Enums"]["wv811_alert_priority"]
          p_is_conflict?: boolean
          p_is_emergency?: boolean
          p_is_expired?: boolean
          p_user_id: string
        }
        Returns: boolean
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geom: unknown }; Returns: number }
        | { Args: { geog: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      submit_learning_feedback: {
        Args: {
          p_bid_project_id?: string
          p_entity_id?: string
          p_entity_type?: Database["public"]["Enums"]["correction_entity_enum"]
          p_feedback_text?: string
          p_feedback_type: string
          p_rating: Database["public"]["Enums"]["feedback_rating_enum"]
          p_time_saved_minutes?: number
          p_would_use_again?: boolean
        }
        Returns: string
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_all_ticket_risk_scores: { Args: never; Returns: number }
      update_daily_report_totals: {
        Args: { p_report_id: string }
        Returns: undefined
      }
      update_document_statistics: {
        Args: { p_document_id: string }
        Returns: undefined
      }
      update_proposal_totals: {
        Args: { p_proposal_id: string }
        Returns: undefined
      }
      update_ticket_location: {
        Args: { p_latitude: number; p_longitude: number; p_ticket_id: string }
        Returns: undefined
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      user_belongs_to_org: { Args: { org_id: string }; Returns: boolean }
      user_has_module_access: {
        Args: { p_module_key: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: {
          p_permission_code: string
          p_project_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
      user_is_on_project: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY"
      assembly_resource_type_enum:
        | "LABOR"
        | "EQUIPMENT"
        | "MATERIAL"
        | "SUBCONTRACT"
        | "SMALL_TOOLS"
        | "OTHER"
      bid_result_enum: "WON" | "LOST" | "NO_BID" | "WITHDRAWN" | "PENDING"
      bid_status_enum:
        | "IDENTIFIED"
        | "PURSUING"
        | "DRAFT"
        | "REVIEW"
        | "SUBMITTED"
        | "WON"
        | "LOST"
        | "NO_BID"
        | "WITHDRAWN"
      calculation_method_enum:
        | "ASSEMBLY_SUM"
        | "PERCENT_OF_SUBTOTAL"
        | "PERCENT_OF_TOTAL"
        | "MANUAL_ENTRY"
        | "SUBCONTRACT_QUOTE"
      change_order_status:
        | "DRAFT"
        | "PENDING_INTERNAL_REVIEW"
        | "INTERNAL_APPROVED"
        | "SUBMITTED_TO_OWNER"
        | "UNDER_NEGOTIATION"
        | "OWNER_APPROVED"
        | "EXECUTED"
        | "REJECTED"
        | "VOID"
        | "WITHDRAWN"
      change_order_type:
        | "OWNER_INITIATED"
        | "CONTRACTOR_INITIATED"
        | "DESIGN_CHANGE"
        | "UNFORESEEN_CONDITIONS"
        | "VALUE_ENGINEERING"
        | "REGULATORY_REQUIREMENT"
        | "FORCE_MAJEURE"
        | "CORRECTION"
        | "DEDUCTIVE"
      competent_person_type:
        | "excavation"
        | "scaffolding"
        | "confined_space"
        | "fall_protection"
        | "crane_rigging"
        | "electrical"
        | "hazmat"
        | "traffic_control"
        | "blasting"
        | "asbestos"
        | "lead"
        | "concrete_masonry"
      complexity_enum: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"
      compliance_status:
        | "compliant"
        | "incomplete"
        | "expired"
        | "pending_review"
        | "suspended"
      correction_entity_enum:
        | "LINE_ITEM"
        | "RISK"
        | "OPPORTUNITY"
        | "ENVIRONMENTAL_COMMITMENT"
        | "HAZMAT_FINDING"
        | "PREBID_QUESTION"
        | "WORK_PACKAGE"
        | "PROJECT_METADATA"
        | "BRIDGE_STRUCTURE"
        | "EXECUTIVE_SNAPSHOT"
      crew_assignment_status: "scheduled" | "active" | "completed" | "cancelled"
      document_status:
        | "DRAFT"
        | "PENDING_REVIEW"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "REJECTED"
        | "SUPERSEDED"
        | "VOID"
        | "ARCHIVED"
      document_type:
        | "CONTRACT"
        | "SPECIFICATION"
        | "DRAWING"
        | "SUBMITTAL"
        | "TRANSMITTAL"
        | "CORRESPONDENCE"
        | "MEETING_MINUTES"
        | "INSPECTION_REPORT"
        | "TEST_REPORT"
        | "PERMIT"
        | "INSURANCE_CERTIFICATE"
        | "BOND"
        | "LIEN_WAIVER"
        | "INVOICE"
        | "CHANGE_ORDER"
        | "RFI"
        | "DAILY_REPORT"
        | "PHOTO"
        | "SAFETY_DOCUMENT"
        | "TRAINING_RECORD"
        | "CERTIFIED_PAYROLL"
        | "DBE_REPORT"
        | "CLOSEOUT"
        | "OTHER"
      document_type_enum:
        | "PROPOSAL"
        | "BIDX"
        | "PLANS"
        | "EXISTING_PLANS"
        | "SPECIAL_PROVISIONS"
        | "ENVIRONMENTAL"
        | "ASBESTOS"
        | "HAZMAT"
        | "GEOTECHNICAL"
        | "TRAFFIC_STUDY"
        | "ADDENDUM"
        | "OTHER"
      driver_eligibility:
        | "eligible"
        | "restricted"
        | "suspended"
        | "pending_review"
      employment_status:
        | "active"
        | "inactive"
        | "terminated"
        | "leave_of_absence"
        | "suspended"
      estimation_method_enum:
        | "ASSEMBLY_BASED"
        | "SUBQUOTE"
        | "HISTORICAL_ANALOG"
        | "OWNER_SPECIFIED"
        | "MANUAL_ESTIMATOR_JUDGMENT"
      export_status_enum:
        | "QUEUED"
        | "GENERATING"
        | "COMPLETED"
        | "FAILED"
        | "EXPIRED"
      export_type_enum:
        | "EXECUTIVE_SNAPSHOT_PDF"
        | "RISK_REGISTER_PDF"
        | "RISK_REGISTER_EXCEL"
        | "ENVIRONMENTAL_REPORT_PDF"
        | "WORK_PACKAGES_EXCEL"
        | "LINE_ITEMS_EXCEL"
        | "PREBID_QUESTIONS_PDF"
        | "FULL_BID_PACKAGE_ZIP"
      feedback_rating_enum:
        | "VERY_POOR"
        | "POOR"
        | "NEUTRAL"
        | "GOOD"
        | "EXCELLENT"
      fulfillment_enum:
        | "SELF_PERFORM"
        | "SUBCONTRACT"
        | "MATERIAL_BUY"
        | "COMBINATION"
      incident_classification:
        | "recordable_injury"
        | "first_aid_only"
        | "near_miss"
        | "property_damage"
        | "environmental"
      incident_severity: "minor" | "moderate" | "serious" | "fatal"
      indirect_category_enum:
        | "SUPERINTENDENCE"
        | "PROJECT_MANAGEMENT"
        | "FIELD_OFFICE"
        | "UTILITIES_TEMP"
        | "SAFETY_ENVIRONMENTAL"
        | "QUALITY_CONTROL"
        | "SURVEY"
        | "INSURANCE"
        | "BOND"
        | "PROFIT"
        | "CONTINGENCY"
        | "OTHER"
      inspection_status:
        | "scheduled"
        | "in_progress"
        | "passed"
        | "failed"
        | "conditional"
        | "cancelled"
      inspection_type:
        | "pre_construction"
        | "in_progress"
        | "milestone"
        | "final"
        | "special"
        | "wvdoh"
        | "third_party"
      invoice_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "PARTIALLY_PAID"
        | "PAID"
        | "DISPUTED"
        | "REJECTED"
        | "VOID"
      material_category:
        | "aggregate"
        | "asphalt"
        | "concrete"
        | "steel"
        | "lumber"
        | "pipe"
        | "electrical"
        | "fuel"
        | "equipment_rental"
        | "other"
      ncr_severity: "minor" | "major" | "critical"
      ncr_status:
        | "open"
        | "investigation"
        | "corrective_action"
        | "verification"
        | "closed"
        | "void"
      ocr_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "manual_entry"
      opportunity_type_enum:
        | "VALUE_ENGINEERING"
        | "MEANS_METHODS"
        | "QUANTITY_UPSIDE"
        | "EARLY_COMPLETION"
        | "MATERIAL_SUBSTITUTION"
        | "EQUIPMENT_EFFICIENCY"
        | "CREW_OPTIMIZATION"
      overtime_type: "regular" | "overtime" | "double_time"
      pco_status:
        | "IDENTIFIED"
        | "PRICING"
        | "PRICED"
        | "SUBMITTED"
        | "APPROVED"
        | "REJECTED"
        | "INCORPORATED"
        | "VOID"
      performance_rating:
        | "EXCELLENT"
        | "GOOD"
        | "SATISFACTORY"
        | "NEEDS_IMPROVEMENT"
        | "POOR"
        | "UNACCEPTABLE"
      po_status:
        | "draft"
        | "submitted"
        | "approved"
        | "partially_received"
        | "fully_received"
        | "closed"
        | "cancelled"
      prediction_type:
        | "SCHEDULE_COMPLETION"
        | "COST_AT_COMPLETION"
        | "SAFETY_INCIDENT"
        | "EQUIPMENT_FAILURE"
        | "WEATHER_DELAY"
        | "SUBCONTRACTOR_RISK"
        | "CASH_FLOW"
        | "RESOURCE_SHORTAGE"
      price_source_enum:
        | "AI_GENERATED"
        | "AI_APPROVED"
        | "AI_MODIFIED"
        | "SUBCONTRACT_QUOTE"
        | "HISTORICAL"
        | "MANUAL_ESTIMATOR"
        | "RS_MEANS"
        | "VENDOR_QUOTE"
      pricing_scenario_type_enum: "AGGRESSIVE" | "BALANCED" | "CONSERVATIVE"
      processing_status_enum:
        | "PENDING"
        | "PROCESSING"
        | "COMPLETED"
        | "FAILED"
        | "NEEDS_OCR"
        | "PARTIAL"
      punch_item_priority: "critical" | "high" | "medium" | "low"
      punch_item_status:
        | "open"
        | "in_progress"
        | "ready_for_inspection"
        | "completed"
        | "deferred"
        | "not_applicable"
      question_status_enum:
        | "AI_SUGGESTED"
        | "APPROVED"
        | "MODIFIED"
        | "DISCARDED"
        | "SUBMITTED"
        | "ANSWERED"
      quote_status_enum:
        | "NOT_NEEDED"
        | "PENDING"
        | "RECEIVED"
        | "EXPIRED"
        | "AWARDED"
        | "DECLINED"
      resource_type_enum: "LABOR" | "EQUIPMENT" | "MATERIAL" | "SUBCONTRACTOR"
      rfi_category:
        | "DESIGN_CLARIFICATION"
        | "DESIGN_CONFLICT"
        | "FIELD_CONDITION"
        | "SPECIFICATION_CLARIFICATION"
        | "SUBSTITUTION_REQUEST"
        | "CODE_COMPLIANCE"
        | "CONSTRUCTABILITY"
        | "COORDINATION"
        | "SCHEDULE"
        | "OTHER"
      rfi_priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATION_ONLY"
      rfi_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "RESPONDED"
        | "CLOSED"
        | "VOID"
        | "RESUBMITTED"
      risk_category_enum:
        | "SCOPE"
        | "QUANTITY"
        | "SITE_CONDITIONS"
        | "ENVIRONMENTAL"
        | "MOT"
        | "SCHEDULE"
        | "REGULATORY"
        | "SUBCONTRACTOR"
        | "MATERIAL"
        | "OWNER"
        | "COMPETITIVE"
        | "WEATHER"
        | "HAZMAT"
        | "CONSTRUCTABILITY"
        | "OTHER"
      risk_ownership_enum: "OWNER" | "CONTRACTOR" | "SHARED" | "UNCLEAR"
      risk_type_enum: "RISK" | "OPPORTUNITY"
      severity_enum: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      spec_chunk_type:
        | "SECTION_HEADER"
        | "REQUIREMENT"
        | "PROCEDURE"
        | "MATERIAL_SPEC"
        | "MEASUREMENT"
        | "PAYMENT"
        | "TABLE"
        | "REFERENCE"
        | "DEFINITION"
      spec_document_type:
        | "STANDARD_SPECS"
        | "SUPPLEMENTAL_SPECS"
        | "SPECIAL_PROVISIONS"
        | "TECHNICAL_BULLETIN"
        | "DESIGN_DIRECTIVE"
      spec_processing_status:
        | "PENDING"
        | "EXTRACTING"
        | "PARSING"
        | "CHUNKING"
        | "EMBEDDING"
        | "COMPLETED"
        | "FAILED"
      subcontract_status:
        | "DRAFT"
        | "PENDING_APPROVAL"
        | "APPROVED"
        | "EXECUTED"
        | "IN_PROGRESS"
        | "COMPLETE"
        | "TERMINATED"
        | "SUSPENDED"
      submittal_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "APPROVED_AS_NOTED"
        | "REVISE_AND_RESUBMIT"
        | "REJECTED"
        | "FOR_RECORD_ONLY"
        | "VOID"
      test_category:
        | "concrete"
        | "asphalt"
        | "soil"
        | "aggregate"
        | "steel"
        | "weld"
        | "coating"
        | "compaction"
        | "gradation"
        | "other"
      test_status:
        | "pending"
        | "in_progress"
        | "passed"
        | "failed"
        | "retest_required"
        | "waived"
      ticket_status:
        | "pending_ocr"
        | "ocr_complete"
        | "verified"
        | "matched"
        | "variance_flagged"
        | "disputed"
        | "reconciled"
      work_category_enum:
        | "MOBILIZATION"
        | "DEMOLITION"
        | "EARTHWORK"
        | "DRAINAGE"
        | "SUBSTRUCTURE"
        | "SUPERSTRUCTURE"
        | "DECK"
        | "APPROACH_SLABS"
        | "PAVEMENT"
        | "GUARDRAIL_BARRIER"
        | "SIGNING_STRIPING"
        | "MOT"
        | "ENVIRONMENTAL"
        | "UTILITIES"
        | "LANDSCAPING"
        | "GENERAL_CONDITIONS"
        | "OTHER"
      work_classification:
        | "laborer"
        | "carpenter"
        | "cement_mason"
        | "electrician"
        | "equipment_operator"
        | "ironworker"
        | "painter"
        | "pipefitter"
        | "plumber"
        | "roofer"
        | "sheet_metal_worker"
        | "truck_driver"
        | "welder"
        | "foreman"
        | "superintendent"
        | "other"
      worker_classification: "employee" | "subcontractor" | "temp" | "seasonal"
      wv811_ack_status:
        | "SENT"
        | "DELIVERED"
        | "OPENED"
        | "ACKNOWLEDGED"
        | "ESCALATED"
      wv811_alert_channel: "EMAIL" | "SMS" | "PUSH" | "IN_APP"
      wv811_alert_priority: "INFO" | "WARNING" | "CRITICAL"
      wv811_alert_type:
        | "48_HOUR"
        | "24_HOUR"
        | "SAME_DAY"
        | "OVERDUE"
        | "RESPONSE_RECEIVED"
        | "CONFLICT"
        | "EXPIRING_SOON"
        | "NEW_TICKET"
        | "4_HOUR_UPDATE_BY"
        | "2_HOUR_UPDATE_BY"
        | "AT_UPDATE_BY"
        | "4_HOUR_EXPIRATION"
        | "2_HOUR_EXPIRATION"
        | "DAILY_RADAR"
        | "RENEWAL_REMINDER"
        | "UTILITY_FOLLOWUP"
      wv811_digest_frequency: "NONE" | "DAILY" | "WEEKLY" | "REAL_TIME"
      wv811_email_status:
        | "PENDING"
        | "PROCESSING"
        | "COMPLETED"
        | "FAILED"
        | "DUPLICATE"
      wv811_incident_type:
        | "DIG_UP"
        | "UTILITY_DAMAGE"
        | "NEAR_MISS"
        | "EQUIPMENT_CONTACT"
        | "OTHER"
      wv811_response_status:
        | "PENDING"
        | "CLEAR"
        | "MARKED"
        | "UNVERIFIED"
        | "VERIFIED_ON_SITE"
        | "CONFLICT"
        | "NOT_APPLICABLE"
      wv811_ticket_status:
        | "RECEIVED"
        | "PENDING"
        | "IN_PROGRESS"
        | "CLEAR"
        | "CONFLICT"
        | "EXPIRED"
        | "CANCELLED"
      wv811_user_alert_role: "OFFICE" | "FIELD"
      wv811_utility_response_type:
        | "CLEAR"
        | "MARKED"
        | "CONFLICT"
        | "NO_RESPONSE"
        | "NOT_APPLICABLE"
        | "PENDING"
      wv811_work_type:
        | "EXCAVATION"
        | "BORING"
        | "TRENCHING"
        | "DEMOLITION"
        | "GRADING"
        | "LANDSCAPING"
        | "UTILITY_INSTALL"
        | "UTILITY_REPAIR"
        | "ROAD_WORK"
        | "CONSTRUCTION"
        | "OTHER"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      alert_severity: ["INFO", "WARNING", "CRITICAL", "EMERGENCY"],
      assembly_resource_type_enum: [
        "LABOR",
        "EQUIPMENT",
        "MATERIAL",
        "SUBCONTRACT",
        "SMALL_TOOLS",
        "OTHER",
      ],
      bid_result_enum: ["WON", "LOST", "NO_BID", "WITHDRAWN", "PENDING"],
      bid_status_enum: [
        "IDENTIFIED",
        "PURSUING",
        "DRAFT",
        "REVIEW",
        "SUBMITTED",
        "WON",
        "LOST",
        "NO_BID",
        "WITHDRAWN",
      ],
      calculation_method_enum: [
        "ASSEMBLY_SUM",
        "PERCENT_OF_SUBTOTAL",
        "PERCENT_OF_TOTAL",
        "MANUAL_ENTRY",
        "SUBCONTRACT_QUOTE",
      ],
      change_order_status: [
        "DRAFT",
        "PENDING_INTERNAL_REVIEW",
        "INTERNAL_APPROVED",
        "SUBMITTED_TO_OWNER",
        "UNDER_NEGOTIATION",
        "OWNER_APPROVED",
        "EXECUTED",
        "REJECTED",
        "VOID",
        "WITHDRAWN",
      ],
      change_order_type: [
        "OWNER_INITIATED",
        "CONTRACTOR_INITIATED",
        "DESIGN_CHANGE",
        "UNFORESEEN_CONDITIONS",
        "VALUE_ENGINEERING",
        "REGULATORY_REQUIREMENT",
        "FORCE_MAJEURE",
        "CORRECTION",
        "DEDUCTIVE",
      ],
      competent_person_type: [
        "excavation",
        "scaffolding",
        "confined_space",
        "fall_protection",
        "crane_rigging",
        "electrical",
        "hazmat",
        "traffic_control",
        "blasting",
        "asbestos",
        "lead",
        "concrete_masonry",
      ],
      complexity_enum: ["LOW", "MEDIUM", "HIGH", "EXTREME"],
      compliance_status: [
        "compliant",
        "incomplete",
        "expired",
        "pending_review",
        "suspended",
      ],
      correction_entity_enum: [
        "LINE_ITEM",
        "RISK",
        "OPPORTUNITY",
        "ENVIRONMENTAL_COMMITMENT",
        "HAZMAT_FINDING",
        "PREBID_QUESTION",
        "WORK_PACKAGE",
        "PROJECT_METADATA",
        "BRIDGE_STRUCTURE",
        "EXECUTIVE_SNAPSHOT",
      ],
      crew_assignment_status: ["scheduled", "active", "completed", "cancelled"],
      document_status: [
        "DRAFT",
        "PENDING_REVIEW",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "SUPERSEDED",
        "VOID",
        "ARCHIVED",
      ],
      document_type: [
        "CONTRACT",
        "SPECIFICATION",
        "DRAWING",
        "SUBMITTAL",
        "TRANSMITTAL",
        "CORRESPONDENCE",
        "MEETING_MINUTES",
        "INSPECTION_REPORT",
        "TEST_REPORT",
        "PERMIT",
        "INSURANCE_CERTIFICATE",
        "BOND",
        "LIEN_WAIVER",
        "INVOICE",
        "CHANGE_ORDER",
        "RFI",
        "DAILY_REPORT",
        "PHOTO",
        "SAFETY_DOCUMENT",
        "TRAINING_RECORD",
        "CERTIFIED_PAYROLL",
        "DBE_REPORT",
        "CLOSEOUT",
        "OTHER",
      ],
      document_type_enum: [
        "PROPOSAL",
        "BIDX",
        "PLANS",
        "EXISTING_PLANS",
        "SPECIAL_PROVISIONS",
        "ENVIRONMENTAL",
        "ASBESTOS",
        "HAZMAT",
        "GEOTECHNICAL",
        "TRAFFIC_STUDY",
        "ADDENDUM",
        "OTHER",
      ],
      driver_eligibility: [
        "eligible",
        "restricted",
        "suspended",
        "pending_review",
      ],
      employment_status: [
        "active",
        "inactive",
        "terminated",
        "leave_of_absence",
        "suspended",
      ],
      estimation_method_enum: [
        "ASSEMBLY_BASED",
        "SUBQUOTE",
        "HISTORICAL_ANALOG",
        "OWNER_SPECIFIED",
        "MANUAL_ESTIMATOR_JUDGMENT",
      ],
      export_status_enum: [
        "QUEUED",
        "GENERATING",
        "COMPLETED",
        "FAILED",
        "EXPIRED",
      ],
      export_type_enum: [
        "EXECUTIVE_SNAPSHOT_PDF",
        "RISK_REGISTER_PDF",
        "RISK_REGISTER_EXCEL",
        "ENVIRONMENTAL_REPORT_PDF",
        "WORK_PACKAGES_EXCEL",
        "LINE_ITEMS_EXCEL",
        "PREBID_QUESTIONS_PDF",
        "FULL_BID_PACKAGE_ZIP",
      ],
      feedback_rating_enum: [
        "VERY_POOR",
        "POOR",
        "NEUTRAL",
        "GOOD",
        "EXCELLENT",
      ],
      fulfillment_enum: [
        "SELF_PERFORM",
        "SUBCONTRACT",
        "MATERIAL_BUY",
        "COMBINATION",
      ],
      incident_classification: [
        "recordable_injury",
        "first_aid_only",
        "near_miss",
        "property_damage",
        "environmental",
      ],
      incident_severity: ["minor", "moderate", "serious", "fatal"],
      indirect_category_enum: [
        "SUPERINTENDENCE",
        "PROJECT_MANAGEMENT",
        "FIELD_OFFICE",
        "UTILITIES_TEMP",
        "SAFETY_ENVIRONMENTAL",
        "QUALITY_CONTROL",
        "SURVEY",
        "INSURANCE",
        "BOND",
        "PROFIT",
        "CONTINGENCY",
        "OTHER",
      ],
      inspection_status: [
        "scheduled",
        "in_progress",
        "passed",
        "failed",
        "conditional",
        "cancelled",
      ],
      inspection_type: [
        "pre_construction",
        "in_progress",
        "milestone",
        "final",
        "special",
        "wvdoh",
        "third_party",
      ],
      invoice_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "PARTIALLY_PAID",
        "PAID",
        "DISPUTED",
        "REJECTED",
        "VOID",
      ],
      material_category: [
        "aggregate",
        "asphalt",
        "concrete",
        "steel",
        "lumber",
        "pipe",
        "electrical",
        "fuel",
        "equipment_rental",
        "other",
      ],
      ncr_severity: ["minor", "major", "critical"],
      ncr_status: [
        "open",
        "investigation",
        "corrective_action",
        "verification",
        "closed",
        "void",
      ],
      ocr_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "manual_entry",
      ],
      opportunity_type_enum: [
        "VALUE_ENGINEERING",
        "MEANS_METHODS",
        "QUANTITY_UPSIDE",
        "EARLY_COMPLETION",
        "MATERIAL_SUBSTITUTION",
        "EQUIPMENT_EFFICIENCY",
        "CREW_OPTIMIZATION",
      ],
      overtime_type: ["regular", "overtime", "double_time"],
      pco_status: [
        "IDENTIFIED",
        "PRICING",
        "PRICED",
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
        "INCORPORATED",
        "VOID",
      ],
      performance_rating: [
        "EXCELLENT",
        "GOOD",
        "SATISFACTORY",
        "NEEDS_IMPROVEMENT",
        "POOR",
        "UNACCEPTABLE",
      ],
      po_status: [
        "draft",
        "submitted",
        "approved",
        "partially_received",
        "fully_received",
        "closed",
        "cancelled",
      ],
      prediction_type: [
        "SCHEDULE_COMPLETION",
        "COST_AT_COMPLETION",
        "SAFETY_INCIDENT",
        "EQUIPMENT_FAILURE",
        "WEATHER_DELAY",
        "SUBCONTRACTOR_RISK",
        "CASH_FLOW",
        "RESOURCE_SHORTAGE",
      ],
      price_source_enum: [
        "AI_GENERATED",
        "AI_APPROVED",
        "AI_MODIFIED",
        "SUBCONTRACT_QUOTE",
        "HISTORICAL",
        "MANUAL_ESTIMATOR",
        "RS_MEANS",
        "VENDOR_QUOTE",
      ],
      pricing_scenario_type_enum: ["AGGRESSIVE", "BALANCED", "CONSERVATIVE"],
      processing_status_enum: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "NEEDS_OCR",
        "PARTIAL",
      ],
      punch_item_priority: ["critical", "high", "medium", "low"],
      punch_item_status: [
        "open",
        "in_progress",
        "ready_for_inspection",
        "completed",
        "deferred",
        "not_applicable",
      ],
      question_status_enum: [
        "AI_SUGGESTED",
        "APPROVED",
        "MODIFIED",
        "DISCARDED",
        "SUBMITTED",
        "ANSWERED",
      ],
      quote_status_enum: [
        "NOT_NEEDED",
        "PENDING",
        "RECEIVED",
        "EXPIRED",
        "AWARDED",
        "DECLINED",
      ],
      resource_type_enum: ["LABOR", "EQUIPMENT", "MATERIAL", "SUBCONTRACTOR"],
      rfi_category: [
        "DESIGN_CLARIFICATION",
        "DESIGN_CONFLICT",
        "FIELD_CONDITION",
        "SPECIFICATION_CLARIFICATION",
        "SUBSTITUTION_REQUEST",
        "CODE_COMPLIANCE",
        "CONSTRUCTABILITY",
        "COORDINATION",
        "SCHEDULE",
        "OTHER",
      ],
      rfi_priority: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATION_ONLY"],
      rfi_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "RESPONDED",
        "CLOSED",
        "VOID",
        "RESUBMITTED",
      ],
      risk_category_enum: [
        "SCOPE",
        "QUANTITY",
        "SITE_CONDITIONS",
        "ENVIRONMENTAL",
        "MOT",
        "SCHEDULE",
        "REGULATORY",
        "SUBCONTRACTOR",
        "MATERIAL",
        "OWNER",
        "COMPETITIVE",
        "WEATHER",
        "HAZMAT",
        "CONSTRUCTABILITY",
        "OTHER",
      ],
      risk_ownership_enum: ["OWNER", "CONTRACTOR", "SHARED", "UNCLEAR"],
      risk_type_enum: ["RISK", "OPPORTUNITY"],
      severity_enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      spec_chunk_type: [
        "SECTION_HEADER",
        "REQUIREMENT",
        "PROCEDURE",
        "MATERIAL_SPEC",
        "MEASUREMENT",
        "PAYMENT",
        "TABLE",
        "REFERENCE",
        "DEFINITION",
      ],
      spec_document_type: [
        "STANDARD_SPECS",
        "SUPPLEMENTAL_SPECS",
        "SPECIAL_PROVISIONS",
        "TECHNICAL_BULLETIN",
        "DESIGN_DIRECTIVE",
      ],
      spec_processing_status: [
        "PENDING",
        "EXTRACTING",
        "PARSING",
        "CHUNKING",
        "EMBEDDING",
        "COMPLETED",
        "FAILED",
      ],
      subcontract_status: [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "EXECUTED",
        "IN_PROGRESS",
        "COMPLETE",
        "TERMINATED",
        "SUSPENDED",
      ],
      submittal_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "APPROVED_AS_NOTED",
        "REVISE_AND_RESUBMIT",
        "REJECTED",
        "FOR_RECORD_ONLY",
        "VOID",
      ],
      test_category: [
        "concrete",
        "asphalt",
        "soil",
        "aggregate",
        "steel",
        "weld",
        "coating",
        "compaction",
        "gradation",
        "other",
      ],
      test_status: [
        "pending",
        "in_progress",
        "passed",
        "failed",
        "retest_required",
        "waived",
      ],
      ticket_status: [
        "pending_ocr",
        "ocr_complete",
        "verified",
        "matched",
        "variance_flagged",
        "disputed",
        "reconciled",
      ],
      work_category_enum: [
        "MOBILIZATION",
        "DEMOLITION",
        "EARTHWORK",
        "DRAINAGE",
        "SUBSTRUCTURE",
        "SUPERSTRUCTURE",
        "DECK",
        "APPROACH_SLABS",
        "PAVEMENT",
        "GUARDRAIL_BARRIER",
        "SIGNING_STRIPING",
        "MOT",
        "ENVIRONMENTAL",
        "UTILITIES",
        "LANDSCAPING",
        "GENERAL_CONDITIONS",
        "OTHER",
      ],
      work_classification: [
        "laborer",
        "carpenter",
        "cement_mason",
        "electrician",
        "equipment_operator",
        "ironworker",
        "painter",
        "pipefitter",
        "plumber",
        "roofer",
        "sheet_metal_worker",
        "truck_driver",
        "welder",
        "foreman",
        "superintendent",
        "other",
      ],
      worker_classification: ["employee", "subcontractor", "temp", "seasonal"],
      wv811_ack_status: [
        "SENT",
        "DELIVERED",
        "OPENED",
        "ACKNOWLEDGED",
        "ESCALATED",
      ],
      wv811_alert_channel: ["EMAIL", "SMS", "PUSH", "IN_APP"],
      wv811_alert_priority: ["INFO", "WARNING", "CRITICAL"],
      wv811_alert_type: [
        "48_HOUR",
        "24_HOUR",
        "SAME_DAY",
        "OVERDUE",
        "RESPONSE_RECEIVED",
        "CONFLICT",
        "EXPIRING_SOON",
        "NEW_TICKET",
        "4_HOUR_UPDATE_BY",
        "2_HOUR_UPDATE_BY",
        "AT_UPDATE_BY",
        "4_HOUR_EXPIRATION",
        "2_HOUR_EXPIRATION",
        "DAILY_RADAR",
        "RENEWAL_REMINDER",
        "UTILITY_FOLLOWUP",
      ],
      wv811_digest_frequency: ["NONE", "DAILY", "WEEKLY", "REAL_TIME"],
      wv811_email_status: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "DUPLICATE",
      ],
      wv811_incident_type: [
        "DIG_UP",
        "UTILITY_DAMAGE",
        "NEAR_MISS",
        "EQUIPMENT_CONTACT",
        "OTHER",
      ],
      wv811_response_status: [
        "PENDING",
        "CLEAR",
        "MARKED",
        "UNVERIFIED",
        "VERIFIED_ON_SITE",
        "CONFLICT",
        "NOT_APPLICABLE",
      ],
      wv811_ticket_status: [
        "RECEIVED",
        "PENDING",
        "IN_PROGRESS",
        "CLEAR",
        "CONFLICT",
        "EXPIRED",
        "CANCELLED",
      ],
      wv811_user_alert_role: ["OFFICE", "FIELD"],
      wv811_utility_response_type: [
        "CLEAR",
        "MARKED",
        "CONFLICT",
        "NO_RESPONSE",
        "NOT_APPLICABLE",
        "PENDING",
      ],
      wv811_work_type: [
        "EXCAVATION",
        "BORING",
        "TRENCHING",
        "DEMOLITION",
        "GRADING",
        "LANDSCAPING",
        "UTILITY_INSTALL",
        "UTILITY_REPAIR",
        "ROAD_WORK",
        "CONSTRUCTION",
        "OTHER",
      ],
    },
  },
} as const
