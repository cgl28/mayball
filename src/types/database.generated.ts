export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_id: string
          id: number
          metadata: Json
          summary: string
          visibility: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_id: string
          id?: never
          metadata?: Json
          summary: string
          visibility?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_id?: string
          id?: never
          metadata?: Json
          summary?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      budget_transfers: {
        Row: {
          amount_minor: number
          budget_version_id: string
          created_at: string
          created_by: string
          effective_at: string
          event_id: string
          from_department_id: string | null
          id: string
          reason: string
          reverses_transfer_id: string | null
          to_department_id: string | null
        }
        Insert: {
          amount_minor: number
          budget_version_id: string
          created_at?: string
          created_by: string
          effective_at?: string
          event_id: string
          from_department_id?: string | null
          id?: string
          reason: string
          reverses_transfer_id?: string | null
          to_department_id?: string | null
        }
        Update: {
          amount_minor?: number
          budget_version_id?: string
          created_at?: string
          created_by?: string
          effective_at?: string
          event_id?: string
          from_department_id?: string | null
          id?: string
          reason?: string
          reverses_transfer_id?: string | null
          to_department_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_transfers_event_id_budget_version_id_fkey"
            columns: ["event_id", "budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "budget_transfers_event_id_budget_version_id_fkey"
            columns: ["event_id", "budget_version_id"]
            isOneToOne: false
            referencedRelation: "v_active_budget_summaries"
            referencedColumns: ["event_id", "budget_version_id"]
          },
          {
            foreignKeyName: "budget_transfers_event_id_budget_version_id_fkey"
            columns: ["event_id", "budget_version_id"]
            isOneToOne: false
            referencedRelation: "v_budget_version_summaries"
            referencedColumns: ["event_id", "budget_version_id"]
          },
          {
            foreignKeyName: "budget_transfers_event_id_from_department_id_fkey"
            columns: ["event_id", "from_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "budget_transfers_event_id_from_department_id_fkey"
            columns: ["event_id", "from_department_id"]
            isOneToOne: false
            referencedRelation: "v_event_department_financial_positions"
            referencedColumns: ["event_id", "department_id"]
          },
          {
            foreignKeyName: "budget_transfers_event_id_to_department_id_fkey"
            columns: ["event_id", "to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "budget_transfers_event_id_to_department_id_fkey"
            columns: ["event_id", "to_department_id"]
            isOneToOne: false
            referencedRelation: "v_event_department_financial_positions"
            referencedColumns: ["event_id", "department_id"]
          },
          {
            foreignKeyName: "budget_transfers_reverses_transfer_id_fkey"
            columns: ["reverses_transfer_id"]
            isOneToOne: true
            referencedRelation: "budget_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_versions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string
          created_by: string
          effective_date: string | null
          event_id: string
          id: string
          name: string
          notes: string | null
          original_contingency_minor: number
          status: Database["public"]["Enums"]["budget_version_status"]
          updated_at: string
          version_number: number
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          created_by: string
          effective_date?: string | null
          event_id: string
          id?: string
          name: string
          notes?: string | null
          original_contingency_minor?: number
          status?: Database["public"]["Enums"]["budget_version_status"]
          updated_at?: string
          version_number: number
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          created_by?: string
          effective_date?: string | null
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          original_contingency_minor?: number
          status?: Database["public"]["Enums"]["budget_version_status"]
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "budget_versions_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      department_budget_allocations: {
        Row: {
          budget_version_id: string
          created_at: string
          department_id: string
          event_id: string
          id: string
          original_gross_minor: number | null
          original_net_minor: number
          updated_at: string
        }
        Insert: {
          budget_version_id: string
          created_at?: string
          department_id: string
          event_id: string
          id?: string
          original_gross_minor?: number | null
          original_net_minor: number
          updated_at?: string
        }
        Update: {
          budget_version_id?: string
          created_at?: string
          department_id?: string
          event_id?: string
          id?: string
          original_gross_minor?: number | null
          original_net_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_budget_allocations_event_id_budget_version_id_fkey"
            columns: ["event_id", "budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "department_budget_allocations_event_id_budget_version_id_fkey"
            columns: ["event_id", "budget_version_id"]
            isOneToOne: false
            referencedRelation: "v_active_budget_summaries"
            referencedColumns: ["event_id", "budget_version_id"]
          },
          {
            foreignKeyName: "department_budget_allocations_event_id_budget_version_id_fkey"
            columns: ["event_id", "budget_version_id"]
            isOneToOne: false
            referencedRelation: "v_budget_version_summaries"
            referencedColumns: ["event_id", "budget_version_id"]
          },
          {
            foreignKeyName: "department_budget_allocations_event_id_department_id_fkey"
            columns: ["event_id", "department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "department_budget_allocations_event_id_department_id_fkey"
            columns: ["event_id", "department_id"]
            isOneToOne: false
            referencedRelation: "v_event_department_financial_positions"
            referencedColumns: ["event_id", "department_id"]
          },
        ]
      }
      department_members: {
        Row: {
          assigned_by: string
          created_at: string
          department_id: string
          event_id: string
          event_member_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          department_id: string
          event_id: string
          event_member_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          department_id?: string
          event_id?: string
          event_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_members_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_members_event_id_department_id_fkey"
            columns: ["event_id", "department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "department_members_event_id_department_id_fkey"
            columns: ["event_id", "department_id"]
            isOneToOne: false
            referencedRelation: "v_event_department_financial_positions"
            referencedColumns: ["event_id", "department_id"]
          },
          {
            foreignKeyName: "department_members_event_id_event_member_id_fkey"
            columns: ["event_id", "event_member_id"]
            isOneToOne: false
            referencedRelation: "event_members"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      department_reference_counters: {
        Row: {
          department_id: string
          event_id: string
          next_request_number: number
          updated_at: string
        }
        Insert: {
          department_id: string
          event_id: string
          next_request_number?: number
          updated_at?: string
        }
        Update: {
          department_id?: string
          event_id?: string
          next_request_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_reference_counters_event_id_department_id_fkey"
            columns: ["event_id", "department_id"]
            isOneToOne: true
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "department_reference_counters_event_id_department_id_fkey"
            columns: ["event_id", "department_id"]
            isOneToOne: true
            referencedRelation: "v_event_department_financial_positions"
            referencedColumns: ["event_id", "department_id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          colour: string | null
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          event_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          colour?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          event_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          colour?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          event_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      documents: {
        Row: {
          bucket_id: string
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          description: string | null
          event_id: string
          finalized_at: string | null
          id: string
          mime_type: string
          object_path: string
          original_filename: string
          payment_id: string | null
          replaced_by_document_id: string | null
          request_id: string | null
          revision_id: string | null
          sha256: string | null
          size_bytes: number
          status: Database["public"]["Enums"]["document_upload_status"]
          uploaded_by: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          bucket_id?: string
          category: Database["public"]["Enums"]["document_category"]
          created_at?: string
          description?: string | null
          event_id: string
          finalized_at?: string | null
          id?: string
          mime_type: string
          object_path: string
          original_filename: string
          payment_id?: string | null
          replaced_by_document_id?: string | null
          request_id?: string | null
          revision_id?: string | null
          sha256?: string | null
          size_bytes: number
          status?: Database["public"]["Enums"]["document_upload_status"]
          uploaded_by: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          bucket_id?: string
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          description?: string | null
          event_id?: string
          finalized_at?: string | null
          id?: string
          mime_type?: string
          object_path?: string
          original_filename?: string
          payment_id?: string | null
          replaced_by_document_id?: string | null
          request_id?: string | null
          revision_id?: string | null
          sha256?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["document_upload_status"]
          uploaded_by?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "documents_event_id_payment_id_fkey"
            columns: ["event_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "documents_event_id_payment_id_fkey"
            columns: ["event_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "v_payment_details"
            referencedColumns: ["event_id", "payment_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "spending_requests"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_queue"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_event_dashboard_pending_approvals"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_component_payment_positions"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_department_impacts"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_payment_positions"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_revision_history"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_spending_request_current_revisions"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_revision_id_fkey"
            columns: ["event_id", "revision_id"]
            isOneToOne: false
            referencedRelation: "spending_request_revisions"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "documents_replaced_by_document_id_fkey"
            columns: ["replaced_by_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_replaced_by_document_id_fkey"
            columns: ["replaced_by_document_id"]
            isOneToOne: false
            referencedRelation: "v_visible_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_lifecycle_history: {
        Row: {
          acknowledged_warnings: Json
          action: string
          actor_user_id: string
          created_at: string
          event_id: string
          id: string
          metadata: Json
          new_status: Database["public"]["Enums"]["event_status"]
          previous_status: Database["public"]["Enums"]["event_status"]
          reason: string | null
        }
        Insert: {
          acknowledged_warnings?: Json
          action: string
          actor_user_id: string
          created_at?: string
          event_id: string
          id?: string
          metadata?: Json
          new_status: Database["public"]["Enums"]["event_status"]
          previous_status: Database["public"]["Enums"]["event_status"]
          reason?: string | null
        }
        Update: {
          acknowledged_warnings?: Json
          action?: string
          actor_user_id?: string
          created_at?: string
          event_id?: string
          id?: string
          metadata?: Json
          new_status?: Database["public"]["Enums"]["event_status"]
          previous_status?: Database["public"]["Enums"]["event_status"]
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_lifecycle_history_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_lifecycle_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_lifecycle_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_lifecycle_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_lifecycle_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_lifecycle_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_lifecycle_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_lifecycle_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      event_member_roles: {
        Row: {
          assigned_by: string
          created_at: string
          event_id: string
          event_member_id: string
          role: Database["public"]["Enums"]["event_role"]
        }
        Insert: {
          assigned_by: string
          created_at?: string
          event_id: string
          event_member_id: string
          role: Database["public"]["Enums"]["event_role"]
        }
        Update: {
          assigned_by?: string
          created_at?: string
          event_id?: string
          event_member_id?: string
          role?: Database["public"]["Enums"]["event_role"]
        }
        Relationships: [
          {
            foreignKeyName: "event_member_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_member_roles_event_id_event_member_id_fkey"
            columns: ["event_id", "event_member_id"]
            isOneToOne: false
            referencedRelation: "event_members"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      event_members: {
        Row: {
          created_at: string
          event_id: string
          id: string
          invited_by: string | null
          joined_at: string
          left_at: string | null
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          left_at?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          left_at?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reference_counters: {
        Row: {
          event_id: string
          next_payment_number: number
          updated_at: string
        }
        Insert: {
          event_id: string
          next_payment_number?: number
          updated_at?: string
        }
        Update: {
          event_id?: string
          next_payment_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reference_counters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_reference_counters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_reference_counters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_reference_counters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_reference_counters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_reference_counters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "event_reference_counters_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      events: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          code: string
          completed_at: string | null
          completed_by: string | null
          completion_note: string | null
          created_at: string
          created_by: string
          currency: string
          default_vat_rate: number
          event_date: string | null
          event_year: number
          id: string
          is_vat_registered: boolean
          name: string
          organisation_id: string
          planning_start_date: string | null
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          code: string
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          created_at?: string
          created_by: string
          currency?: string
          default_vat_rate?: number
          event_date?: string | null
          event_year: number
          id?: string
          is_vat_registered?: boolean
          name: string
          organisation_id: string
          planning_start_date?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by?: string | null
          code?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          default_vat_rate?: number
          event_date?: string | null
          event_year?: number
          id?: string
          is_vat_registered?: boolean
          name?: string
          organisation_id?: string
          planning_start_date?: string | null
          reopen_reason?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_departments: {
        Row: {
          department_id: string
          event_id: string
          invitation_id: string
        }
        Insert: {
          department_id: string
          event_id: string
          invitation_id: string
        }
        Update: {
          department_id?: string
          event_id?: string
          invitation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_departments_event_id_department_id_fkey"
            columns: ["event_id", "department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "invitation_departments_event_id_department_id_fkey"
            columns: ["event_id", "department_id"]
            isOneToOne: false
            referencedRelation: "v_event_department_financial_positions"
            referencedColumns: ["event_id", "department_id"]
          },
          {
            foreignKeyName: "invitation_departments_invitation_event_fk"
            columns: ["invitation_id", "event_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id", "event_id"]
          },
          {
            foreignKeyName: "invitation_departments_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_roles: {
        Row: {
          invitation_id: string
          role: Database["public"]["Enums"]["event_role"]
        }
        Insert: {
          invitation_id: string
          role: Database["public"]["Enums"]["event_role"]
        }
        Update: {
          invitation_id?: string
          role?: Database["public"]["Enums"]["event_role"]
        }
        Relationships: [
          {
            foreignKeyName: "invitation_roles_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          event_id: string
          expires_at: string
          id: string
          invited_by: string
          organisation_id: string
          revoked_at: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          event_id: string
          expires_at: string
          id?: string
          invited_by: string
          organisation_id: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          event_id?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organisation_id?: string
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_event_id_organisation_id_fkey"
            columns: ["event_id", "organisation_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "organisation_id"]
          },
          {
            foreignKeyName: "invitations_event_id_organisation_id_fkey"
            columns: ["event_id", "organisation_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id", "organisation_id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_id: string
          id: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_id: string
          id?: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_id?: string
          id?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          left_at: string | null
          organisation_id: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          organisation_id: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          organisation_id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organisation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          legal_name: string | null
          name: string
          slug: string
          status: Database["public"]["Enums"]["organisation_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          legal_name?: string | null
          name: string
          slug: string
          status?: Database["public"]["Enums"]["organisation_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          legal_name?: string | null
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["organisation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      other_revenue_items: {
        Row: {
          actual_gross_minor: number
          actual_net_minor: number
          actual_vat_minor: number
          category: Database["public"]["Enums"]["revenue_item_category"]
          created_at: string
          created_by: string
          event_id: string
          expected_date: string | null
          forecast_gross_minor: number
          forecast_net_minor: number
          forecast_vat_minor: number
          id: string
          notes: string | null
          owner_user_id: string | null
          received_date: string | null
          status: Database["public"]["Enums"]["revenue_item_status"]
          title: string
          updated_at: string
          vat_rate: number | null
          vat_treatment: Database["public"]["Enums"]["vat_treatment"]
        }
        Insert: {
          actual_gross_minor?: number
          actual_net_minor?: number
          actual_vat_minor?: number
          category: Database["public"]["Enums"]["revenue_item_category"]
          created_at?: string
          created_by: string
          event_id: string
          expected_date?: string | null
          forecast_gross_minor: number
          forecast_net_minor: number
          forecast_vat_minor: number
          id?: string
          notes?: string | null
          owner_user_id?: string | null
          received_date?: string | null
          status?: Database["public"]["Enums"]["revenue_item_status"]
          title: string
          updated_at?: string
          vat_rate?: number | null
          vat_treatment: Database["public"]["Enums"]["vat_treatment"]
        }
        Update: {
          actual_gross_minor?: number
          actual_net_minor?: number
          actual_vat_minor?: number
          category?: Database["public"]["Enums"]["revenue_item_category"]
          created_at?: string
          created_by?: string
          event_id?: string
          expected_date?: string | null
          forecast_gross_minor?: number
          forecast_net_minor?: number
          forecast_vat_minor?: number
          id?: string
          notes?: string | null
          owner_user_id?: string | null
          received_date?: string | null
          status?: Database["public"]["Enums"]["revenue_item_status"]
          title?: string
          updated_at?: string
          vat_rate?: number | null
          vat_treatment?: Database["public"]["Enums"]["vat_treatment"]
        }
        Relationships: [
          {
            foreignKeyName: "other_revenue_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "other_revenue_items_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          created_at: string
          event_id: string
          gross_minor: number
          id: string
          net_minor: number | null
          payment_id: string
          request_component_id: string
          request_id: string
          vat_minor: number | null
        }
        Insert: {
          created_at?: string
          event_id: string
          gross_minor: number
          id?: string
          net_minor?: number | null
          payment_id: string
          request_component_id: string
          request_id: string
          vat_minor?: number | null
        }
        Update: {
          created_at?: string
          event_id?: string
          gross_minor?: number
          id?: string
          net_minor?: number | null
          payment_id?: string
          request_component_id?: string
          request_id?: string
          vat_minor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_event_id_payment_id_fkey"
            columns: ["event_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_payment_id_fkey"
            columns: ["event_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "v_payment_details"
            referencedColumns: ["event_id", "payment_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_component_id_fkey"
            columns: ["event_id", "request_component_id"]
            isOneToOne: false
            referencedRelation: "request_components"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "spending_requests"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_queue"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_event_dashboard_pending_approvals"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_component_payment_positions"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_department_impacts"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_payment_positions"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_revision_history"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_spending_request_current_revisions"
            referencedColumns: ["event_id", "request_id"]
          },
        ]
      }
      payments: {
        Row: {
          bank_reference: string | null
          code: string
          created_at: string
          entered_by: string
          event_id: string
          gross_minor: number
          id: string
          idempotency_key: string | null
          method: Database["public"]["Enums"]["payment_method"]
          net_minor: number | null
          note: string | null
          payee: string
          payment_date: string
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: Database["public"]["Enums"]["payment_record_status"]
          vat_minor: number | null
        }
        Insert: {
          bank_reference?: string | null
          code: string
          created_at?: string
          entered_by: string
          event_id: string
          gross_minor: number
          id?: string
          idempotency_key?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          net_minor?: number | null
          note?: string | null
          payee: string
          payment_date: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["payment_record_status"]
          vat_minor?: number | null
        }
        Update: {
          bank_reference?: string | null
          code?: string
          created_at?: string
          entered_by?: string
          event_id?: string
          gross_minor?: number
          id?: string
          idempotency_key?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          net_minor?: number | null
          note?: string | null
          payee?: string
          payment_date?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["payment_record_status"]
          vat_minor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          preferred_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          preferred_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          preferred_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      request_components: {
        Row: {
          code: string
          created_at: string
          description: string
          event_id: string
          expected_payment_date: string | null
          gross_minor: number
          id: string
          net_minor: number
          revision_id: string
          sequence_number: number
          supplier_name: string | null
          updated_at: string
          vat_minor: number
          vat_rate: number | null
          vat_treatment: Database["public"]["Enums"]["vat_treatment"]
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          event_id: string
          expected_payment_date?: string | null
          gross_minor: number
          id?: string
          net_minor: number
          revision_id: string
          sequence_number: number
          supplier_name?: string | null
          updated_at?: string
          vat_minor: number
          vat_rate?: number | null
          vat_treatment: Database["public"]["Enums"]["vat_treatment"]
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          event_id?: string
          expected_payment_date?: string | null
          gross_minor?: number
          id?: string
          net_minor?: number
          revision_id?: string
          sequence_number?: number
          supplier_name?: string | null
          updated_at?: string
          vat_minor?: number
          vat_rate?: number | null
          vat_treatment?: Database["public"]["Enums"]["vat_treatment"]
        }
        Relationships: [
          {
            foreignKeyName: "request_components_event_id_revision_id_fkey"
            columns: ["event_id", "revision_id"]
            isOneToOne: false
            referencedRelation: "spending_request_revisions"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      request_reviews: {
        Row: {
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          event_id: string
          id: string
          reason: string | null
          request_id: string
          reviewer_user_id: string
          revision_id: string
        }
        Insert: {
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          event_id: string
          id?: string
          reason?: string | null
          request_id: string
          reviewer_user_id: string
          revision_id: string
        }
        Update: {
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          event_id?: string
          id?: string
          reason?: string | null
          request_id?: string
          reviewer_user_id?: string
          revision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_reviews_event_id_request_id_revision_id_fkey"
            columns: ["event_id", "request_id", "revision_id"]
            isOneToOne: false
            referencedRelation: "spending_request_revisions"
            referencedColumns: ["event_id", "request_id", "id"]
          },
          {
            foreignKeyName: "request_reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spending_request_department_allocations: {
        Row: {
          created_at: string
          department_id: string
          event_id: string
          gross_minor: number
          id: string
          net_minor: number
          revision_id: string
          updated_at: string
          vat_minor: number
        }
        Insert: {
          created_at?: string
          department_id: string
          event_id: string
          gross_minor: number
          id?: string
          net_minor: number
          revision_id: string
          updated_at?: string
          vat_minor: number
        }
        Update: {
          created_at?: string
          department_id?: string
          event_id?: string
          gross_minor?: number
          id?: string
          net_minor?: number
          revision_id?: string
          updated_at?: string
          vat_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "spending_request_department_allocat_event_id_department_id_fkey"
            columns: ["event_id", "department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "spending_request_department_allocat_event_id_department_id_fkey"
            columns: ["event_id", "department_id"]
            isOneToOne: false
            referencedRelation: "v_event_department_financial_positions"
            referencedColumns: ["event_id", "department_id"]
          },
          {
            foreignKeyName: "spending_request_department_allocatio_event_id_revision_id_fkey"
            columns: ["event_id", "revision_id"]
            isOneToOne: false
            referencedRelation: "spending_request_revisions"
            referencedColumns: ["event_id", "id"]
          },
        ]
      }
      spending_request_revisions: {
        Row: {
          business_justification: string | null
          calculation_overridden: boolean
          calculation_override_reason: string | null
          change_summary: string | null
          created_at: string
          created_by: string
          decided_at: string | null
          description: string | null
          event_id: string
          expected_payment_date: string | null
          gross_minor: number
          id: string
          net_minor: number
          request_id: string
          revision_number: number
          status: Database["public"]["Enums"]["revision_status"]
          submitted_at: string | null
          supplier_name: string | null
          title: string
          updated_at: string
          vat_minor: number
          vat_rate: number | null
          vat_recoverable: boolean | null
          vat_treatment: Database["public"]["Enums"]["vat_treatment"]
        }
        Insert: {
          business_justification?: string | null
          calculation_overridden?: boolean
          calculation_override_reason?: string | null
          change_summary?: string | null
          created_at?: string
          created_by: string
          decided_at?: string | null
          description?: string | null
          event_id: string
          expected_payment_date?: string | null
          gross_minor: number
          id?: string
          net_minor: number
          request_id: string
          revision_number: number
          status?: Database["public"]["Enums"]["revision_status"]
          submitted_at?: string | null
          supplier_name?: string | null
          title: string
          updated_at?: string
          vat_minor: number
          vat_rate?: number | null
          vat_recoverable?: boolean | null
          vat_treatment: Database["public"]["Enums"]["vat_treatment"]
        }
        Update: {
          business_justification?: string | null
          calculation_overridden?: boolean
          calculation_override_reason?: string | null
          change_summary?: string | null
          created_at?: string
          created_by?: string
          decided_at?: string | null
          description?: string | null
          event_id?: string
          expected_payment_date?: string | null
          gross_minor?: number
          id?: string
          net_minor?: number
          request_id?: string
          revision_number?: number
          status?: Database["public"]["Enums"]["revision_status"]
          submitted_at?: string | null
          supplier_name?: string | null
          title?: string
          updated_at?: string
          vat_minor?: number
          vat_rate?: number | null
          vat_recoverable?: boolean | null
          vat_treatment?: Database["public"]["Enums"]["vat_treatment"]
        }
        Relationships: [
          {
            foreignKeyName: "spending_request_revisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_request_revisions_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "spending_requests"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "spending_request_revisions_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_queue"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "spending_request_revisions_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_event_dashboard_pending_approvals"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "spending_request_revisions_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_component_payment_positions"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "spending_request_revisions_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_department_impacts"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "spending_request_revisions_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_payment_positions"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "spending_request_revisions_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_revision_history"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "spending_request_revisions_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_spending_request_current_revisions"
            referencedColumns: ["event_id", "request_id"]
          },
        ]
      }
      spending_requests: {
        Row: {
          approval_status: Database["public"]["Enums"]["request_approval_status"]
          approved_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          code: string
          created_at: string
          current_approved_revision_id: string | null
          current_draft_revision_id: string | null
          event_id: string
          id: string
          owner_user_id: string
          primary_department_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["request_approval_status"]
          approved_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          code: string
          created_at?: string
          current_approved_revision_id?: string | null
          current_draft_revision_id?: string | null
          event_id: string
          id?: string
          owner_user_id: string
          primary_department_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["request_approval_status"]
          approved_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          code?: string
          created_at?: string
          current_approved_revision_id?: string | null
          current_draft_revision_id?: string | null
          event_id?: string
          id?: string
          owner_user_id?: string
          primary_department_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spending_requests_approved_revision_fk"
            columns: ["event_id", "id", "current_approved_revision_id"]
            isOneToOne: false
            referencedRelation: "spending_request_revisions"
            referencedColumns: ["event_id", "request_id", "id"]
          },
          {
            foreignKeyName: "spending_requests_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_requests_draft_revision_fk"
            columns: ["event_id", "id", "current_draft_revision_id"]
            isOneToOne: false
            referencedRelation: "spending_request_revisions"
            referencedColumns: ["event_id", "request_id", "id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_primary_department_id_fkey"
            columns: ["event_id", "primary_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_primary_department_id_fkey"
            columns: ["event_id", "primary_department_id"]
            isOneToOne: false
            referencedRelation: "v_event_department_financial_positions"
            referencedColumns: ["event_id", "department_id"]
          },
          {
            foreignKeyName: "spending_requests_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_sales_snapshots: {
        Row: {
          booking_fees_to_date_minor: number
          captured_at: string
          created_at: string
          entered_by: string
          event_id: string
          gross_sales_minor: number
          id: string
          is_void: boolean
          net_sales_minor: number | null
          notes: string | null
          refunds_to_date_minor: number
          source: Database["public"]["Enums"]["snapshot_source"]
          tickets_sold_to_date: number | null
          vat_minor: number | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          booking_fees_to_date_minor?: number
          captured_at: string
          created_at?: string
          entered_by: string
          event_id: string
          gross_sales_minor: number
          id?: string
          is_void?: boolean
          net_sales_minor?: number | null
          notes?: string | null
          refunds_to_date_minor?: number
          source: Database["public"]["Enums"]["snapshot_source"]
          tickets_sold_to_date?: number | null
          vat_minor?: number | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          booking_fees_to_date_minor?: number
          captured_at?: string
          created_at?: string
          entered_by?: string
          event_id?: string
          gross_sales_minor?: number
          id?: string
          is_void?: boolean
          net_sales_minor?: number | null
          notes?: string | null
          refunds_to_date_minor?: number
          source?: Database["public"]["Enums"]["snapshot_source"]
          tickets_sold_to_date?: number | null
          vat_minor?: number | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sales_snapshots_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_type_sales_snapshots: {
        Row: {
          created_at: string
          event_id: string
          gross_sales_minor: number
          id: string
          quantity_to_date: number
          snapshot_id: string
          ticket_type_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          gross_sales_minor: number
          id?: string
          quantity_to_date: number
          snapshot_id: string
          ticket_type_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          gross_sales_minor?: number
          id?: string
          quantity_to_date?: number
          snapshot_id?: string
          ticket_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_type_sales_snapshots_event_id_snapshot_id_fkey"
            columns: ["event_id", "snapshot_id"]
            isOneToOne: false
            referencedRelation: "ticket_sales_snapshots"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "ticket_type_sales_snapshots_event_id_snapshot_id_fkey"
            columns: ["event_id", "snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_latest_ticket_sales_snapshot"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "ticket_type_sales_snapshots_event_id_snapshot_id_fkey"
            columns: ["event_id", "snapshot_id"]
            isOneToOne: false
            referencedRelation: "v_ticket_actual_summaries"
            referencedColumns: ["event_id", "latest_snapshot_id"]
          },
          {
            foreignKeyName: "ticket_type_sales_snapshots_event_id_ticket_type_id_fkey"
            columns: ["event_id", "ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "ticket_type_sales_snapshots_event_id_ticket_type_id_fkey"
            columns: ["event_id", "ticket_type_id"]
            isOneToOne: false
            referencedRelation: "v_ticket_type_forecast_positions"
            referencedColumns: ["event_id", "ticket_type_id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          complimentary_quantity: number
          created_at: string
          created_by: string
          description: string | null
          display_order: number
          event_id: string
          forecast_quantity: number
          gross_price_minor: number
          id: string
          is_active: boolean
          maximum_quantity: number
          name: string
          net_price_minor: number
          updated_at: string
          vat_minor: number
          vat_rate: number | null
          vat_treatment: Database["public"]["Enums"]["vat_treatment"]
        }
        Insert: {
          complimentary_quantity?: number
          created_at?: string
          created_by: string
          description?: string | null
          display_order?: number
          event_id: string
          forecast_quantity: number
          gross_price_minor: number
          id?: string
          is_active?: boolean
          maximum_quantity: number
          name: string
          net_price_minor: number
          updated_at?: string
          vat_minor: number
          vat_rate?: number | null
          vat_treatment?: Database["public"]["Enums"]["vat_treatment"]
        }
        Update: {
          complimentary_quantity?: number
          created_at?: string
          created_by?: string
          description?: string | null
          display_order?: number
          event_id?: string
          forecast_quantity?: number
          gross_price_minor?: number
          id?: string
          is_active?: boolean
          maximum_quantity?: number
          name?: string
          net_price_minor?: number
          updated_at?: string
          vat_minor?: number
          vat_rate?: number | null
          vat_treatment?: Database["public"]["Enums"]["vat_treatment"]
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
    }
    Views: {
      v_active_budget_department_positions: {
        Row: {
          budget_version_id: string | null
          current_budget_minor: number | null
          department_code: string | null
          department_id: string | null
          department_name: string | null
          event_id: string | null
          original_allocation_minor: number | null
          transfers_received_minor: number | null
          transfers_released_minor: number | null
          version_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "department_budget_allocations_event_id_budget_version_id_fkey"
            columns: ["event_id", "budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "department_budget_allocations_event_id_budget_version_id_fkey"
            columns: ["event_id", "budget_version_id"]
            isOneToOne: false
            referencedRelation: "v_active_budget_summaries"
            referencedColumns: ["event_id", "budget_version_id"]
          },
          {
            foreignKeyName: "department_budget_allocations_event_id_budget_version_id_fkey"
            columns: ["event_id", "budget_version_id"]
            isOneToOne: false
            referencedRelation: "v_budget_version_summaries"
            referencedColumns: ["event_id", "budget_version_id"]
          },
        ]
      }
      v_active_budget_summaries: {
        Row: {
          budget_version_id: string | null
          effective_date: string | null
          event_id: string | null
          name: string | null
          original_contingency_minor: number | null
          status: Database["public"]["Enums"]["budget_version_status"] | null
          total_cost_budget_minor: number | null
          total_department_original_minor: number | null
          unallocated_contingency_minor: number | null
          version_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_approval_queue: {
        Row: {
          approval_status:
            | Database["public"]["Enums"]["request_approval_status"]
            | null
          can_decide: boolean | null
          code: string | null
          event_id: string | null
          gross_minor: number | null
          net_minor: number | null
          owner_display_name: string | null
          owner_preferred_name: string | null
          owner_user_id: string | null
          primary_department_code: string | null
          primary_department_id: string | null
          primary_department_name: string | null
          request_id: string | null
          request_type: string | null
          revision_id: string | null
          revision_number: number | null
          submitted_at: string | null
          supplier_name: string | null
          title: string | null
          vat_minor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_primary_department_id_fkey"
            columns: ["event_id", "primary_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_primary_department_id_fkey"
            columns: ["event_id", "primary_department_id"]
            isOneToOne: false
            referencedRelation: "v_event_department_financial_positions"
            referencedColumns: ["event_id", "department_id"]
          },
          {
            foreignKeyName: "spending_requests_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_budget_version_summaries: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          budget_version_id: string | null
          created_at: string | null
          created_by: string | null
          effective_date: string | null
          event_id: string | null
          name: string | null
          notes: string | null
          original_contingency_minor: number | null
          status: Database["public"]["Enums"]["budget_version_status"] | null
          total_cost_budget_minor: number | null
          total_department_original_minor: number | null
          updated_at: string | null
          version_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_versions_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "budget_versions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_department_spending_positions: {
        Row: {
          approved_gross_minor: number | null
          approved_net_minor: number | null
          budget_version_id: string | null
          current_budget_minor: number | null
          department_code: string | null
          department_id: string | null
          department_name: string | null
          event_id: string | null
          pending_gross_minor: number | null
          pending_net_minor: number | null
          potential_remaining_minor: number | null
          remaining_approved_minor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "department_budget_allocations_event_id_budget_version_id_fkey"
            columns: ["event_id", "budget_version_id"]
            isOneToOne: false
            referencedRelation: "budget_versions"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "department_budget_allocations_event_id_budget_version_id_fkey"
            columns: ["event_id", "budget_version_id"]
            isOneToOne: false
            referencedRelation: "v_active_budget_summaries"
            referencedColumns: ["event_id", "budget_version_id"]
          },
          {
            foreignKeyName: "department_budget_allocations_event_id_budget_version_id_fkey"
            columns: ["event_id", "budget_version_id"]
            isOneToOne: false
            referencedRelation: "v_budget_version_summaries"
            referencedColumns: ["event_id", "budget_version_id"]
          },
        ]
      }
      v_event_activity_feed: {
        Row: {
          action: string | null
          activity_id: number | null
          actor_display_name: string | null
          actor_preferred_name: string | null
          actor_user_id: string | null
          category: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_id: string | null
          summary: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_event_approval_context: {
        Row: {
          approved_net_spending_minor: number | null
          event_id: string | null
          forecast_net_revenue_minor: number | null
          formal_net_position_minor: number | null
          pending_net_spending_minor: number | null
          potential_net_position_minor: number | null
          total_cost_budget_minor: number | null
          unallocated_contingency_minor: number | null
        }
        Relationships: []
      }
      v_event_dashboard_activity: {
        Row: {
          action: string | null
          activity_id: number | null
          actor_display_name: string | null
          actor_user_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_id: string | null
          summary: string | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "activity_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_event_dashboard_draft_exposures: {
        Row: {
          draft_scope: string | null
          event_id: string | null
          visible_draft_gross_minor: number | null
          visible_draft_net_minor: number | null
          visible_draft_request_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_event_dashboard_pending_approvals: {
        Row: {
          budget_warning: boolean | null
          event_id: string | null
          gross_minor: number | null
          net_minor: number | null
          owner_display_name: string | null
          owner_preferred_name: string | null
          primary_department_code: string | null
          primary_department_id: string | null
          primary_department_name: string | null
          request_code: string | null
          request_id: string | null
          request_type: string | null
          revision_id: string | null
          submitted_at: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_primary_department_id_fkey"
            columns: ["event_id", "primary_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_primary_department_id_fkey"
            columns: ["event_id", "primary_department_id"]
            isOneToOne: false
            referencedRelation: "v_event_department_financial_positions"
            referencedColumns: ["event_id", "department_id"]
          },
        ]
      }
      v_event_dashboard_warnings: {
        Row: {
          code: string | null
          event_id: string | null
          message: string | null
          severity: string | null
          target_module: string | null
          title: string | null
        }
        Relationships: []
      }
      v_event_department_draft_exposures: {
        Row: {
          department_id: string | null
          event_id: string | null
          visible_draft_gross_minor: number | null
          visible_draft_net_minor: number | null
          visible_draft_request_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_event_department_financial_positions: {
        Row: {
          active_budget_version_number: number | null
          approved_gross_minor: number | null
          approved_net_minor: number | null
          approved_over_budget: boolean | null
          budget_version_id: string | null
          current_budget_minor: number | null
          department_code: string | null
          department_id: string | null
          department_name: string | null
          display_order: number | null
          event_id: string | null
          has_active_allocation: boolean | null
          original_allocation_minor: number | null
          pending_gross_minor: number | null
          pending_net_minor: number | null
          potential_over_budget: boolean | null
          potential_remaining_minor: number | null
          remaining_approved_minor: number | null
          transfers_received_minor: number | null
          transfers_released_minor: number | null
          visible_draft_gross_minor: number | null
          visible_draft_net_minor: number | null
          visible_draft_request_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "departments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_event_financial_positions: {
        Row: {
          active_budget_effective_date: string | null
          active_budget_name: string | null
          active_budget_version_id: string | null
          active_budget_version_number: number | null
          active_ticket_type_count: number | null
          approved_gross_spending_minor: number | null
          approved_net_spending_minor: number | null
          approved_payable_gross_minor: number | null
          approved_request_count: number | null
          draft_scope: string | null
          event_date: string | null
          event_id: string | null
          event_name: string | null
          event_status: Database["public"]["Enums"]["event_status"] | null
          event_year: number | null
          formal_forecast_net_position_minor: number | null
          has_active_budget: boolean | null
          latest_captured_at: string | null
          latest_snapshot_id: string | null
          organisation_id: string | null
          original_contingency_minor: number | null
          other_actual_gross_minor: number | null
          other_actual_net_minor: number | null
          other_forecast_gross_minor: number | null
          other_forecast_net_minor: number | null
          paid_gross_spending_minor: number | null
          paid_request_count: number | null
          partially_paid_request_count: number | null
          pending_gross_spending_minor: number | null
          pending_net_position_delta_minor: number | null
          pending_net_spending_minor: number | null
          pending_request_count: number | null
          potential_forecast_net_position_minor: number | null
          recorded_gross_cash_movement_minor: number | null
          recorded_payment_count: number | null
          recorded_payment_gross_minor: number | null
          reversed_payment_count: number | null
          reversed_payment_gross_minor: number | null
          ticket_actual_gross_minor: number | null
          ticket_actual_net_minor: number | null
          ticket_booking_fees_to_date_minor: number | null
          ticket_forecast_gross_minor: number | null
          ticket_forecast_net_minor: number | null
          ticket_refunds_to_date_minor: number | null
          tickets_sold_to_date: number | null
          total_actual_gross_minor: number | null
          total_current_department_budget_minor: number | null
          total_forecast_gross_minor: number | null
          total_forecast_net_minor: number | null
          unallocated_contingency_minor: number | null
          unpaid_approved_gross_minor: number | null
          unpaid_request_count: number | null
          visible_draft_gross_minor: number | null
          visible_draft_net_minor: number | null
          visible_draft_request_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_event_lifecycle_summary: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          archived_by_display_name: string | null
          completed_at: string | null
          completed_by: string | null
          completed_by_display_name: string | null
          completion_note: string | null
          event_id: string | null
          is_read_only: boolean | null
          lifecycle_history_count: number | null
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          reopened_by_display_name: string | null
          status: Database["public"]["Enums"]["event_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "events_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_event_payment_summaries: {
        Row: {
          event_id: string | null
          recorded_gross_minor: number | null
          recorded_payment_count: number | null
          reversed_gross_minor: number | null
          reversed_payment_count: number | null
        }
        Relationships: []
      }
      v_event_revenue_summaries: {
        Row: {
          event_id: string | null
          forecast_ticket_quantity: number | null
          latest_captured_at: string | null
          latest_snapshot_id: string | null
          maximum_ticket_capacity: number | null
          other_actual_gross_minor: number | null
          other_actual_net_minor: number | null
          other_actual_vat_minor: number | null
          other_forecast_gross_minor: number | null
          other_forecast_net_minor: number | null
          other_forecast_vat_minor: number | null
          other_outstanding_gross_minor: number | null
          ticket_actual_gross_minor: number | null
          ticket_actual_net_minor: number | null
          ticket_actual_vat_minor: number | null
          ticket_booking_fees_to_date_minor: number | null
          ticket_forecast_gross_minor: number | null
          ticket_forecast_net_minor: number | null
          ticket_forecast_vat_minor: number | null
          ticket_maximum_gross_minor: number | null
          ticket_maximum_net_minor: number | null
          ticket_maximum_vat_minor: number | null
          ticket_refunds_to_date_minor: number | null
          tickets_sold_to_date: number | null
          total_actual_gross_minor: number | null
          total_forecast_gross_minor: number | null
          total_forecast_net_minor: number | null
          total_forecast_vat_minor: number | null
        }
        Relationships: []
      }
      v_event_spending_summaries: {
        Row: {
          approved_gross_minor: number | null
          approved_net_minor: number | null
          approved_payable_gross_minor: number | null
          approved_request_count: number | null
          event_id: string | null
          paid_gross_minor: number | null
          paid_request_count: number | null
          partially_paid_request_count: number | null
          pending_gross_minor: number | null
          pending_net_minor: number | null
          pending_request_count: number | null
          unpaid_approved_gross_minor: number | null
          unpaid_request_count: number | null
        }
        Relationships: []
      }
      v_latest_ticket_sales_snapshot: {
        Row: {
          booking_fees_to_date_minor: number | null
          captured_at: string | null
          created_at: string | null
          entered_by: string | null
          event_id: string | null
          gross_sales_minor: number | null
          id: string | null
          is_void: boolean | null
          net_sales_minor: number | null
          notes: string | null
          refunds_to_date_minor: number | null
          source: Database["public"]["Enums"]["snapshot_source"] | null
          tickets_sold_to_date: number | null
          vat_minor: number | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sales_snapshots_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_other_revenue_summaries: {
        Row: {
          actual_gross_minor: number | null
          actual_net_minor: number | null
          actual_vat_minor: number | null
          event_id: string | null
          forecast_gross_minor: number | null
          forecast_net_minor: number | null
          forecast_vat_minor: number | null
          outstanding_gross_minor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "other_revenue_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_payment_allocation_details: {
        Row: {
          component_code: string | null
          component_description: string | null
          created_at: string | null
          event_id: string | null
          gross_minor: number | null
          net_minor: number | null
          payment_allocation_id: string | null
          payment_code: string | null
          payment_date: string | null
          payment_id: string | null
          payment_status:
            | Database["public"]["Enums"]["payment_record_status"]
            | null
          request_code: string | null
          request_component_id: string | null
          request_id: string | null
          revision_id: string | null
          revision_number: number | null
          vat_minor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_event_id_payment_id_fkey"
            columns: ["event_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_payment_id_fkey"
            columns: ["event_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "v_payment_details"
            referencedColumns: ["event_id", "payment_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_component_id_fkey"
            columns: ["event_id", "request_component_id"]
            isOneToOne: false
            referencedRelation: "request_components"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "spending_requests"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_queue"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_event_dashboard_pending_approvals"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_component_payment_positions"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_department_impacts"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_payment_positions"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_revision_history"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "payment_allocations_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_spending_request_current_revisions"
            referencedColumns: ["event_id", "request_id"]
          },
        ]
      }
      v_payment_details: {
        Row: {
          allocated_gross_minor: number | null
          allocation_count: number | null
          bank_reference: string | null
          code: string | null
          created_at: string | null
          entered_by: string | null
          entered_by_display_name: string | null
          event_id: string | null
          gross_minor: number | null
          method: Database["public"]["Enums"]["payment_method"] | null
          net_minor: number | null
          note: string | null
          payee: string | null
          payment_date: string | null
          payment_id: string | null
          request_codes: string | null
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          reversed_by_display_name: string | null
          status: Database["public"]["Enums"]["payment_record_status"] | null
          vat_minor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "payments_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_request_component_payment_positions: {
        Row: {
          approved_gross_minor: number | null
          approved_net_minor: number | null
          approved_vat_minor: number | null
          component_code: string | null
          description: string | null
          event_id: string | null
          expected_payment_date: string | null
          outstanding_gross_minor: number | null
          paid_gross_minor: number | null
          payment_status: string | null
          request_code: string | null
          request_component_id: string | null
          request_id: string | null
          revision_id: string | null
          revision_number: number | null
          supplier_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_request_department_impacts: {
        Row: {
          approved_net_minor: number | null
          baseline_net_minor: number | null
          current_budget_minor: number | null
          department_code: string | null
          department_id: string | null
          department_name: string | null
          event_id: string | null
          incremental_net_minor: number | null
          over_budget: boolean | null
          potential_remaining_after_minor: number | null
          proposed_net_minor: number | null
          request_id: string | null
          request_type: string | null
          revision_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_request_payment_positions: {
        Row: {
          approved_gross_minor: number | null
          approved_net_minor: number | null
          approved_revision_id: string | null
          approved_revision_number: number | null
          code: string | null
          event_id: string | null
          outstanding_gross_minor: number | null
          paid_gross_minor: number | null
          payment_status: string | null
          request_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_request_review_history: {
        Row: {
          created_at: string | null
          decision: Database["public"]["Enums"]["review_decision"] | null
          event_id: string | null
          reason: string | null
          request_id: string | null
          review_id: string | null
          reviewer_display_name: string | null
          reviewer_preferred_name: string | null
          reviewer_user_id: string | null
          revision_id: string | null
          revision_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "request_reviews_event_id_request_id_revision_id_fkey"
            columns: ["event_id", "request_id", "revision_id"]
            isOneToOne: false
            referencedRelation: "spending_request_revisions"
            referencedColumns: ["event_id", "request_id", "id"]
          },
          {
            foreignKeyName: "request_reviews_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_request_revision_history: {
        Row: {
          approval_status:
            | Database["public"]["Enums"]["request_approval_status"]
            | null
          business_justification: string | null
          change_summary: string | null
          created_at: string | null
          created_by: string | null
          created_by_display_name: string | null
          created_by_preferred_name: string | null
          current_approved_revision_id: string | null
          current_draft_revision_id: string | null
          decided_at: string | null
          description: string | null
          event_id: string | null
          expected_payment_date: string | null
          gross_minor: number | null
          is_current_approved: boolean | null
          is_current_draft: boolean | null
          is_pending_review: boolean | null
          net_minor: number | null
          request_code: string | null
          request_id: string | null
          revision_id: string | null
          revision_number: number | null
          revision_status: Database["public"]["Enums"]["revision_status"] | null
          submitted_at: string | null
          supplier_name: string | null
          title: string | null
          vat_minor: number | null
          vat_treatment: Database["public"]["Enums"]["vat_treatment"] | null
        }
        Relationships: [
          {
            foreignKeyName: "spending_request_revisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_requests_approved_revision_fk"
            columns: ["event_id", "request_id", "current_approved_revision_id"]
            isOneToOne: false
            referencedRelation: "spending_request_revisions"
            referencedColumns: ["event_id", "request_id", "id"]
          },
          {
            foreignKeyName: "spending_requests_draft_revision_fk"
            columns: ["event_id", "request_id", "current_draft_revision_id"]
            isOneToOne: false
            referencedRelation: "spending_request_revisions"
            referencedColumns: ["event_id", "request_id", "id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_spending_request_current_revisions: {
        Row: {
          approval_status:
            | Database["public"]["Enums"]["request_approval_status"]
            | null
          business_justification: string | null
          can_edit_draft: boolean | null
          code: string | null
          current_approved_revision_id: string | null
          current_draft_revision_id: string | null
          description: string | null
          event_id: string | null
          expected_payment_date: string | null
          gross_minor: number | null
          net_minor: number | null
          owner_display_name: string | null
          owner_preferred_name: string | null
          owner_user_id: string | null
          primary_department_code: string | null
          primary_department_id: string | null
          primary_department_name: string | null
          request_created_at: string | null
          request_id: string | null
          request_submitted_at: string | null
          request_updated_at: string | null
          revision_created_at: string | null
          revision_id: string | null
          revision_number: number | null
          revision_status: Database["public"]["Enums"]["revision_status"] | null
          revision_submitted_at: string | null
          revision_updated_at: string | null
          supplier_name: string | null
          title: string | null
          vat_minor: number | null
          vat_rate: number | null
          vat_recoverable: boolean | null
          vat_treatment: Database["public"]["Enums"]["vat_treatment"] | null
        }
        Relationships: [
          {
            foreignKeyName: "spending_requests_approved_revision_fk"
            columns: ["event_id", "request_id", "current_approved_revision_id"]
            isOneToOne: false
            referencedRelation: "spending_request_revisions"
            referencedColumns: ["event_id", "request_id", "id"]
          },
          {
            foreignKeyName: "spending_requests_draft_revision_fk"
            columns: ["event_id", "request_id", "current_draft_revision_id"]
            isOneToOne: false
            referencedRelation: "spending_request_revisions"
            referencedColumns: ["event_id", "request_id", "id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_primary_department_id_fkey"
            columns: ["event_id", "primary_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "spending_requests_event_id_primary_department_id_fkey"
            columns: ["event_id", "primary_department_id"]
            isOneToOne: false
            referencedRelation: "v_event_department_financial_positions"
            referencedColumns: ["event_id", "department_id"]
          },
          {
            foreignKeyName: "spending_requests_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ticket_actual_summaries: {
        Row: {
          booking_fees_to_date_minor: number | null
          entered_by: string | null
          event_id: string | null
          gross_sales_minor: number | null
          latest_captured_at: string | null
          latest_snapshot_id: string | null
          net_sales_minor: number | null
          refunds_to_date_minor: number | null
          source: Database["public"]["Enums"]["snapshot_source"] | null
          tickets_sold_to_date: number | null
          vat_minor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sales_snapshots_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_sales_snapshots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_ticket_forecast_summaries: {
        Row: {
          complimentary_ticket_quantity: number | null
          event_id: string | null
          forecast_gross_minor: number | null
          forecast_net_minor: number | null
          forecast_ticket_quantity: number | null
          forecast_vat_minor: number | null
          maximum_gross_minor: number | null
          maximum_net_minor: number | null
          maximum_ticket_capacity: number | null
          maximum_vat_minor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_ticket_type_forecast_positions: {
        Row: {
          complimentary_quantity: number | null
          description: string | null
          display_order: number | null
          event_id: string | null
          forecast_gross_minor: number | null
          forecast_net_minor: number | null
          forecast_quantity: number | null
          forecast_vat_minor: number | null
          gross_price_minor: number | null
          is_active: boolean | null
          maximum_gross_minor: number | null
          maximum_net_minor: number | null
          maximum_quantity: number | null
          maximum_vat_minor: number | null
          name: string | null
          net_price_minor: number | null
          ticket_type_id: string | null
          vat_minor: number | null
          vat_rate: number | null
          vat_treatment: Database["public"]["Enums"]["vat_treatment"] | null
        }
        Insert: {
          complimentary_quantity?: number | null
          description?: string | null
          display_order?: number | null
          event_id?: string | null
          forecast_gross_minor?: never
          forecast_net_minor?: never
          forecast_quantity?: number | null
          forecast_vat_minor?: never
          gross_price_minor?: number | null
          is_active?: boolean | null
          maximum_gross_minor?: never
          maximum_net_minor?: never
          maximum_quantity?: number | null
          maximum_vat_minor?: never
          name?: string | null
          net_price_minor?: number | null
          ticket_type_id?: string | null
          vat_minor?: number | null
          vat_rate?: number | null
          vat_treatment?: Database["public"]["Enums"]["vat_treatment"] | null
        }
        Update: {
          complimentary_quantity?: number | null
          description?: string | null
          display_order?: number | null
          event_id?: string | null
          forecast_gross_minor?: never
          forecast_net_minor?: never
          forecast_quantity?: number | null
          forecast_vat_minor?: never
          gross_price_minor?: number | null
          is_active?: boolean | null
          maximum_gross_minor?: never
          maximum_net_minor?: never
          maximum_quantity?: number | null
          maximum_vat_minor?: never
          name?: string | null
          net_price_minor?: number | null
          ticket_type_id?: string | null
          vat_minor?: number | null
          vat_rate?: number | null
          vat_treatment?: Database["public"]["Enums"]["vat_treatment"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
        ]
      }
      v_visible_documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"] | null
          created_at: string | null
          description: string | null
          document_id: string | null
          event_id: string | null
          finalized_at: string | null
          mime_type: string | null
          original_filename: string | null
          payment_code: string | null
          payment_id: string | null
          request_code: string | null
          request_id: string | null
          revision_id: string | null
          revision_number: number | null
          revision_status: Database["public"]["Enums"]["revision_status"] | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["document_upload_status"] | null
          uploaded_by: string | null
          uploaded_by_display_name: string | null
          uploaded_by_preferred_name: string | null
          visibility_scope: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          voided_by_display_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_approval_context"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_financial_positions"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_lifecycle_summary"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_payment_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_revenue_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "v_event_spending_summaries"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "documents_event_id_payment_id_fkey"
            columns: ["event_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "documents_event_id_payment_id_fkey"
            columns: ["event_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "v_payment_details"
            referencedColumns: ["event_id", "payment_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "spending_requests"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_approval_queue"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_event_dashboard_pending_approvals"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_component_payment_positions"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_department_impacts"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_payment_positions"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_request_revision_history"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_request_id_fkey"
            columns: ["event_id", "request_id"]
            isOneToOne: false
            referencedRelation: "v_spending_request_current_revisions"
            referencedColumns: ["event_id", "request_id"]
          },
          {
            foreignKeyName: "documents_event_id_revision_id_fkey"
            columns: ["event_id", "revision_id"]
            isOneToOne: false
            referencedRelation: "spending_request_revisions"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: { Args: { p_raw_token: string }; Returns: string }
      activate_budget_version: {
        Args: { p_budget_version_id: string }
        Returns: undefined
      }
      archive_event: {
        Args: { p_event_id: string; p_reason: string }
        Returns: Json
      }
      assert_budget_editable: {
        Args: { p_budget_version_id: string }
        Returns: {
          activated_at: string | null
          activated_by: string | null
          created_at: string
          created_by: string
          effective_date: string | null
          event_id: string
          id: string
          name: string
          notes: string | null
          original_contingency_minor: number
          status: Database["public"]["Enums"]["budget_version_status"]
          updated_at: string
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "budget_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_document_parent: {
        Args: {
          p_event_id: string
          p_payment_id: string
          p_request_id: string
          p_revision_id: string
        }
        Returns: {
          parent_summary: string
          request_id: string
        }[]
      }
      assert_event_retains_active_president: {
        Args: { p_event_id: string; p_excluding_event_member_id?: string }
        Returns: undefined
      }
      assert_president_can_manage_event: {
        Args: { p_event_id: string }
        Returns: {
          archive_reason: string | null
          archived_at: string | null
          archived_by: string | null
          code: string
          completed_at: string | null
          completed_by: string | null
          completion_note: string | null
          created_at: string
          created_by: string
          currency: string
          default_vat_rate: number
          event_date: string | null
          event_year: number
          id: string
          is_vat_registered: boolean
          name: string
          organisation_id: string
          planning_start_date: string | null
          reopen_reason: string | null
          reopened_at: string | null
          reopened_by: string | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_revision_balanced: {
        Args: { p_revision_id: string }
        Returns: undefined
      }
      assign_department_member: {
        Args: { p_department_id: string; p_event_member_id: string }
        Returns: undefined
      }
      assign_event_role: {
        Args: {
          p_event_member_id: string
          p_role: Database["public"]["Enums"]["event_role"]
        }
        Returns: undefined
      }
      begin_document_upload: {
        Args: {
          p_category: Database["public"]["Enums"]["document_category"]
          p_description?: string
          p_event_id: string
          p_mime_type: string
          p_original_filename: string
          p_payment_id: string
          p_request_id: string
          p_revision_id: string
          p_size_bytes: number
        }
        Returns: {
          bucket_id: string
          document_id: string
          object_path: string
        }[]
      }
      can_edit_request_revision: {
        Args: { p_revision_id: string }
        Returns: boolean
      }
      can_insert_document_object: {
        Args: { p_bucket_id: string; p_object_path: string }
        Returns: boolean
      }
      can_view_document: { Args: { p_document_id: string }; Returns: boolean }
      can_view_event: { Args: { p_event_id: string }; Returns: boolean }
      can_view_historical_event: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      can_view_request: { Args: { p_request_id: string }; Returns: boolean }
      can_view_request_revision: {
        Args: { p_revision_id: string }
        Returns: boolean
      }
      complete_event: {
        Args: {
          p_acknowledge_warnings?: boolean
          p_event_id: string
          p_reason?: string
        }
        Returns: Json
      }
      create_budget_version: {
        Args: {
          p_allocations?: Json
          p_effective_date?: string
          p_event_id: string
          p_name: string
          p_notes?: string
          p_original_contingency_minor?: number
        }
        Returns: string
      }
      create_department: {
        Args: {
          p_code: string
          p_colour?: string
          p_description?: string
          p_display_order?: number
          p_event_id: string
          p_name: string
        }
        Returns: string
      }
      create_organisation_and_event: {
        Args: {
          p_assign_treasurer?: boolean
          p_event_code: string
          p_event_date?: string
          p_event_name: string
          p_event_year: number
          p_initial_status?: Database["public"]["Enums"]["event_status"]
          p_legal_name?: string
          p_organisation_name: string
          p_organisation_slug: string
          p_planning_start_date?: string
        }
        Returns: {
          event_id: string
          organisation_id: string
        }[]
      }
      create_recurring_event: {
        Args: {
          p_event_code: string
          p_event_date?: string
          p_event_name: string
          p_event_year: number
          p_initial_status?: Database["public"]["Enums"]["event_status"]
          p_organisation_id: string
          p_planning_start_date?: string
        }
        Returns: string
      }
      create_spending_request: {
        Args: {
          p_description: string
          p_event_id: string
          p_expected_date?: string
          p_net_minor: number
          p_primary_department_id: string
          p_title: string
          p_vat_minor: number
          p_vat_treatment: Database["public"]["Enums"]["vat_treatment"]
        }
        Returns: {
          request_code: string
          request_id: string
          revision_id: string
        }[]
      }
      create_spending_request_draft: {
        Args: {
          p_allocations?: Json
          p_business_justification?: string
          p_components?: Json
          p_description?: string
          p_event_id: string
          p_expected_payment_date?: string
          p_gross_minor?: number
          p_net_minor?: number
          p_primary_department_id: string
          p_supplier_name?: string
          p_title: string
          p_vat_minor?: number
          p_vat_rate?: number
          p_vat_recoverable?: boolean
          p_vat_treatment?: Database["public"]["Enums"]["vat_treatment"]
        }
        Returns: {
          request_code: string
          request_id: string
          revision_id: string
        }[]
      }
      decide_spending_request: {
        Args: {
          p_decision: Database["public"]["Enums"]["review_decision"]
          p_reason?: string
          p_request_id: string
          p_revision_id: string
        }
        Returns: undefined
      }
      document_activity_visibility: {
        Args: { p_payment_id: string; p_revision_id: string }
        Returns: string
      }
      event_completion_readiness: {
        Args: { p_event_id: string }
        Returns: {
          acknowledgement_allowed: boolean
          amount_minor: number
          blocks_completion: boolean
          category: string
          code: string
          item_count: number
          severity: string
          target_route: string
        }[]
      }
      event_lifecycle_readiness: {
        Args: {
          p_event_id: string
          p_to_status?: Database["public"]["Enums"]["event_status"]
        }
        Returns: {
          acknowledgement_allowed: boolean
          amount_minor: number
          blocks_completion: boolean
          category: string
          code: string
          item_count: number
          severity: string
          target_route: string
        }[]
      }
      finalise_document_upload: {
        Args: {
          p_document_id: string
          p_mime_type: string
          p_size_bytes: number
        }
        Returns: string
      }
      get_invitation_preview: {
        Args: { p_raw_token: string }
        Returns: {
          already_member: boolean
          departments: string[]
          event_date: string
          event_id: string
          event_name: string
          event_year: number
          expires_at: string
          invitation_status: Database["public"]["Enums"]["invitation_status"]
          invited_email: string
          organisation_name: string
          roles: Database["public"]["Enums"]["event_role"][]
        }[]
      }
      has_event_role: {
        Args: {
          p_event_id: string
          p_role: Database["public"]["Enums"]["event_role"]
        }
        Returns: boolean
      }
      insert_budget_allocations: {
        Args: {
          p_allocations: Json
          p_budget_version_id: string
          p_event_id: string
        }
        Returns: undefined
      }
      insert_request_allocations: {
        Args: { p_allocations: Json; p_event_id: string; p_revision_id: string }
        Returns: undefined
      }
      insert_request_components: {
        Args: {
          p_components: Json
          p_event_id: string
          p_request_code: string
          p_revision_id: string
        }
        Returns: undefined
      }
      is_active_event_member: { Args: { p_event_id: string }; Returns: boolean }
      is_event_president: { Args: { p_event_id: string }; Returns: boolean }
      is_event_treasurer: { Args: { p_event_id: string }; Returns: boolean }
      is_event_writable: { Args: { p_event_id: string }; Returns: boolean }
      is_request_owner: { Args: { p_request_id: string }; Returns: boolean }
      issue_invitation: {
        Args: {
          p_department_ids?: string[]
          p_email: string
          p_event_id: string
          p_expires_in_days?: number
          p_roles?: Database["public"]["Enums"]["event_role"][]
        }
        Returns: {
          invitation_id: string
          invitation_token: string
        }[]
      }
      next_custom_department_display_order: {
        Args: { p_event_id: string }
        Returns: number
      }
      normal_lifecycle_target: {
        Args: { p_status: Database["public"]["Enums"]["event_status"] }
        Returns: Database["public"]["Enums"]["event_status"]
      }
      normalise_document_extension: {
        Args: { p_mime_type: string }
        Returns: string
      }
      normalise_email: { Args: { p_email: string }; Returns: string }
      normalise_event_code: { Args: { p_code: string }; Returns: string }
      normalise_slug: { Args: { p_slug: string }; Returns: string }
      progress_event_lifecycle: {
        Args: {
          p_acknowledge_warnings?: boolean
          p_event_id: string
          p_reason?: string
          p_to_status: Database["public"]["Enums"]["event_status"]
        }
        Returns: Json
      }
      record_component_payment: {
        Args: {
          p_allocations: Json
          p_bank_reference: string
          p_event_id: string
          p_gross_minor: number
          p_idempotency_key?: string
          p_method: Database["public"]["Enums"]["payment_method"]
          p_note: string
          p_payee: string
          p_payment_date: string
        }
        Returns: string
      }
      record_payment: {
        Args: {
          p_allocation_gross_minor: number[]
          p_bank_reference: string
          p_component_ids: string[]
          p_event_id: string
          p_gross_minor: number
          p_payee: string
          p_payment_date: string
        }
        Returns: string
      }
      record_ticket_sales_snapshot: {
        Args: {
          p_booking_fees_to_date_minor?: number
          p_breakdown?: Json
          p_captured_at: string
          p_event_id: string
          p_gross_sales_minor?: number
          p_net_sales_minor?: number
          p_notes?: string
          p_refunds_to_date_minor?: number
          p_source?: Database["public"]["Enums"]["snapshot_source"]
          p_tickets_sold_to_date?: number
          p_vat_minor?: number
        }
        Returns: string
      }
      remove_department_member: {
        Args: { p_department_id: string; p_event_member_id: string }
        Returns: undefined
      }
      remove_event_role: {
        Args: {
          p_event_member_id: string
          p_role: Database["public"]["Enums"]["event_role"]
        }
        Returns: undefined
      }
      reopen_event: {
        Args: { p_event_id: string; p_reason: string }
        Returns: Json
      }
      reverse_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: undefined
      }
      revoke_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      save_other_revenue_item: {
        Args: {
          p_actual_gross_minor?: number
          p_actual_net_minor?: number
          p_actual_vat_minor?: number
          p_category?: Database["public"]["Enums"]["revenue_item_category"]
          p_event_id: string
          p_expected_date?: string
          p_forecast_gross_minor?: number
          p_forecast_net_minor?: number
          p_forecast_vat_minor?: number
          p_item_id?: string
          p_notes?: string
          p_owner_user_id?: string
          p_received_date?: string
          p_status?: Database["public"]["Enums"]["revenue_item_status"]
          p_title?: string
          p_vat_rate?: number
          p_vat_treatment?: Database["public"]["Enums"]["vat_treatment"]
        }
        Returns: string
      }
      save_ticket_type: {
        Args: {
          p_complimentary_quantity?: number
          p_description?: string
          p_display_order?: number
          p_event_id: string
          p_forecast_quantity?: number
          p_gross_price_minor?: number
          p_is_active?: boolean
          p_maximum_quantity?: number
          p_name?: string
          p_net_price_minor?: number
          p_ticket_type_id?: string
          p_vat_minor?: number
          p_vat_rate?: number
          p_vat_treatment?: Database["public"]["Enums"]["vat_treatment"]
        }
        Returns: string
      }
      standard_department_display_order: {
        Args: { p_code: string }
        Returns: number
      }
      start_request_variation: {
        Args: { p_request_id: string }
        Returns: string
      }
      submit_spending_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      transfer_contingency: {
        Args: {
          p_amount_minor: number
          p_budget_version_id: string
          p_department_id: string
          p_reason: string
        }
        Returns: string
      }
      transfer_event_contingency: {
        Args: {
          p_amount_minor: number
          p_department_id: string
          p_event_id: string
          p_reason: string
        }
        Returns: string
      }
      update_department: {
        Args: {
          p_code: string
          p_colour?: string
          p_department_id: string
          p_description?: string
          p_display_order?: number
          p_is_active?: boolean
          p_name: string
        }
        Returns: undefined
      }
      update_draft_budget_version: {
        Args: {
          p_allocations?: Json
          p_budget_version_id: string
          p_effective_date?: string
          p_name: string
          p_notes?: string
          p_original_contingency_minor?: number
        }
        Returns: undefined
      }
      update_event_member_status: {
        Args: {
          p_event_member_id: string
          p_status: Database["public"]["Enums"]["membership_status"]
        }
        Returns: undefined
      }
      update_event_settings: {
        Args: {
          p_code: string
          p_event_date?: string
          p_event_id: string
          p_event_year: number
          p_name: string
          p_planning_start_date?: string
        }
        Returns: undefined
      }
      update_spending_request_draft: {
        Args: {
          p_allocations?: Json
          p_business_justification?: string
          p_change_summary?: string
          p_components?: Json
          p_description?: string
          p_expected_payment_date?: string
          p_gross_minor?: number
          p_net_minor?: number
          p_primary_department_id: string
          p_request_id: string
          p_supplier_name?: string
          p_title: string
          p_vat_minor?: number
          p_vat_rate?: number
          p_vat_recoverable?: boolean
          p_vat_treatment?: Database["public"]["Enums"]["vat_treatment"]
        }
        Returns: undefined
      }
      void_document: {
        Args: { p_document_id: string; p_reason: string }
        Returns: string
      }
      void_ticket_sales_snapshot: {
        Args: { p_reason: string; p_snapshot_id: string }
        Returns: undefined
      }
    }
    Enums: {
      budget_version_status: "draft" | "active" | "superseded" | "final"
      document_category:
        | "quote"
        | "contract"
        | "invoice"
        | "receipt"
        | "supporting"
        | "other"
      document_upload_status: "pending" | "finalised" | "voided"
      event_role: "president" | "treasurer" | "committee_member" | "read_only"
      event_status:
        | "setup"
        | "planning"
        | "live"
        | "reconciliation"
        | "completed"
        | "archived"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      membership_status: "invited" | "active" | "suspended" | "left" | "removed"
      notification_type:
        | "invitation"
        | "request_submitted"
        | "changes_requested"
        | "request_approved"
        | "request_rejected"
        | "variation_submitted"
        | "variation_decided"
        | "payment_recorded"
        | "role_changed"
        | "event_status_changed"
      organisation_status: "active" | "inactive"
      payment_method:
        | "bank_transfer"
        | "card"
        | "cash"
        | "direct_debit"
        | "other"
      payment_record_status: "recorded" | "reversed"
      request_approval_status:
        | "draft"
        | "submitted"
        | "changes_requested"
        | "approved"
        | "variation_pending"
        | "rejected"
        | "cancelled"
      revenue_item_category:
        | "sponsorship"
        | "college_contribution"
        | "donation"
        | "merchandise"
        | "interest"
        | "other"
      revenue_item_status:
        | "forecast"
        | "confirmed"
        | "part_received"
        | "received"
        | "cancelled"
      review_decision:
        | "approved"
        | "changes_requested"
        | "rejected"
        | "cancelled"
      revision_status:
        | "draft"
        | "submitted"
        | "approved"
        | "changes_requested"
        | "rejected"
        | "superseded"
        | "cancelled"
      snapshot_source:
        | "manual_ticket_tailor"
        | "manual_other"
        | "ticket_tailor_api"
        | "csv_import"
      vat_treatment:
        | "standard"
        | "reduced"
        | "zero_rated"
        | "exempt"
        | "outside_scope"
        | "unknown"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      budget_version_status: ["draft", "active", "superseded", "final"],
      document_category: [
        "quote",
        "contract",
        "invoice",
        "receipt",
        "supporting",
        "other",
      ],
      document_upload_status: ["pending", "finalised", "voided"],
      event_role: ["president", "treasurer", "committee_member", "read_only"],
      event_status: [
        "setup",
        "planning",
        "live",
        "reconciliation",
        "completed",
        "archived",
      ],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      membership_status: ["invited", "active", "suspended", "left", "removed"],
      notification_type: [
        "invitation",
        "request_submitted",
        "changes_requested",
        "request_approved",
        "request_rejected",
        "variation_submitted",
        "variation_decided",
        "payment_recorded",
        "role_changed",
        "event_status_changed",
      ],
      organisation_status: ["active", "inactive"],
      payment_method: [
        "bank_transfer",
        "card",
        "cash",
        "direct_debit",
        "other",
      ],
      payment_record_status: ["recorded", "reversed"],
      request_approval_status: [
        "draft",
        "submitted",
        "changes_requested",
        "approved",
        "variation_pending",
        "rejected",
        "cancelled",
      ],
      revenue_item_category: [
        "sponsorship",
        "college_contribution",
        "donation",
        "merchandise",
        "interest",
        "other",
      ],
      revenue_item_status: [
        "forecast",
        "confirmed",
        "part_received",
        "received",
        "cancelled",
      ],
      review_decision: [
        "approved",
        "changes_requested",
        "rejected",
        "cancelled",
      ],
      revision_status: [
        "draft",
        "submitted",
        "approved",
        "changes_requested",
        "rejected",
        "superseded",
        "cancelled",
      ],
      snapshot_source: [
        "manual_ticket_tailor",
        "manual_other",
        "ticket_tailor_api",
        "csv_import",
      ],
      vat_treatment: [
        "standard",
        "reduced",
        "zero_rated",
        "exempt",
        "outside_scope",
        "unknown",
      ],
    },
  },
} as const

