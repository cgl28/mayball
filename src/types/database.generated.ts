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
            foreignKeyName: "budget_transfers_event_id_from_department_id_fkey"
            columns: ["event_id", "from_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
          },
          {
            foreignKeyName: "budget_transfers_event_id_to_department_id_fkey"
            columns: ["event_id", "to_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
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
            foreignKeyName: "department_budget_allocations_event_id_department_id_fkey"
            columns: ["event_id", "department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
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
        ]
      }
      documents: {
        Row: {
          bucket_id: string
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          event_id: string
          id: string
          mime_type: string
          object_path: string
          original_filename: string
          payment_id: string | null
          request_id: string | null
          revision_id: string | null
          sha256: string | null
          size_bytes: number
          uploaded_by: string
        }
        Insert: {
          bucket_id?: string
          category: Database["public"]["Enums"]["document_category"]
          created_at?: string
          event_id: string
          id?: string
          mime_type: string
          object_path: string
          original_filename: string
          payment_id?: string | null
          request_id?: string | null
          revision_id?: string | null
          sha256?: string | null
          size_bytes: number
          uploaded_by: string
        }
        Update: {
          bucket_id?: string
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          event_id?: string
          id?: string
          mime_type?: string
          object_path?: string
          original_filename?: string
          payment_id?: string | null
          request_id?: string | null
          revision_id?: string | null
          sha256?: string | null
          size_bytes?: number
          uploaded_by?: string
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
            foreignKeyName: "documents_event_id_payment_id_fkey"
            columns: ["event_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["event_id", "id"]
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
            referencedRelation: "v_request_payment_positions"
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
        ]
      }
      events: {
        Row: {
          archived_at: string | null
          code: string
          completed_at: string | null
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
          reopened_at: string | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          code: string
          completed_at?: string | null
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
          reopened_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          code?: string
          completed_at?: string | null
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
          reopened_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Relationships: [
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
            referencedRelation: "v_request_payment_positions"
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
            referencedRelation: "v_request_payment_positions"
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
            foreignKeyName: "spending_requests_event_id_primary_department_id_fkey"
            columns: ["event_id", "primary_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["event_id", "id"]
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
            foreignKeyName: "ticket_type_sales_snapshots_event_id_ticket_type_id_fkey"
            columns: ["event_id", "ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["event_id", "id"]
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
        ]
      }
    }
    Views: {
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
            foreignKeyName: "ticket_sales_snapshots_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_request_payment_positions: {
        Row: {
          approved_gross_minor: number | null
          approved_net_minor: number | null
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
        ]
      }
    }
    Functions: {
      activate_budget_version: {
        Args: { p_budget_version_id: string }
        Returns: undefined
      }
      assert_revision_balanced: {
        Args: { p_revision_id: string }
        Returns: undefined
      }
      can_edit_request_revision: {
        Args: { p_revision_id: string }
        Returns: boolean
      }
      can_view_event: { Args: { p_event_id: string }; Returns: boolean }
      can_view_historical_event: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      can_view_request_revision: {
        Args: { p_revision_id: string }
        Returns: boolean
      }
      complete_event: {
        Args: { p_acknowledge_warnings?: boolean; p_event_id: string }
        Returns: Json
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
      decide_spending_request: {
        Args: {
          p_decision: Database["public"]["Enums"]["review_decision"]
          p_reason?: string
          p_request_id: string
          p_revision_id: string
        }
        Returns: undefined
      }
      has_event_role: {
        Args: {
          p_event_id: string
          p_role: Database["public"]["Enums"]["event_role"]
        }
        Returns: boolean
      }
      is_active_event_member: { Args: { p_event_id: string }; Returns: boolean }
      is_event_president: { Args: { p_event_id: string }; Returns: boolean }
      is_event_treasurer: { Args: { p_event_id: string }; Returns: boolean }
      is_event_writable: { Args: { p_event_id: string }; Returns: boolean }
      is_request_owner: { Args: { p_request_id: string }; Returns: boolean }
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
      reopen_event: {
        Args: { p_event_id: string; p_reason: string }
        Returns: undefined
      }
      reverse_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: undefined
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

