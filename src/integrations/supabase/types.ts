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
      bounty_boosts: {
        Row: {
          amount: number
          booster_id: string
          created_at: string
          id: string
          request_id: string
        }
        Insert: {
          amount: number
          booster_id: string
          created_at?: string
          id?: string
          request_id: string
        }
        Update: {
          amount?: number
          booster_id?: string
          created_at?: string
          id?: string
          request_id?: string
        }
        Relationships: []
      }
      bounty_videos: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          bounty_amount: number
          created_at: string
          duration_seconds: number | null
          id: string
          is_public: boolean
          note: string
          payout_amount: number
          request_id: string
          request_place: string
          request_title: string
          storage_path: string
          thumb_path: string | null
          updated_at: string
          uploader_id: string
          view_count: number
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          bounty_amount?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_public?: boolean
          note?: string
          payout_amount?: number
          request_id: string
          request_place?: string
          request_title?: string
          storage_path: string
          thumb_path?: string | null
          updated_at?: string
          uploader_id: string
          view_count?: number
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          bounty_amount?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_public?: boolean
          note?: string
          payout_amount?: number
          request_id?: string
          request_place?: string
          request_title?: string
          storage_path?: string
          thumb_path?: string | null
          updated_at?: string
          uploader_id?: string
          view_count?: number
        }
        Relationships: []
      }
      cashouts: {
        Row: {
          amount: number
          created_at: string
          environment: string
          error_message: string
          id: string
          status: string
          stripe_transfer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          environment?: string
          error_message?: string
          id?: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          environment?: string
          error_message?: string
          id?: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          claimed_at: string
          created_at: string
          id: string
          request_id: string
          spotter_id: string
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
        }
        Insert: {
          claimed_at?: string
          created_at?: string
          id?: string
          request_id: string
          spotter_id: string
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Update: {
          claimed_at?: string
          created_at?: string
          id?: string
          request_id?: string
          spotter_id?: string
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_evidence: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          request_id: string
          role: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          request_id: string
          role?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      escrows: {
        Row: {
          amount: number
          auto_release_at: string | null
          created_at: string
          dispute_reason: string | null
          disputed_at: string | null
          id: string
          request_id: string
          requester_id: string
          reserved_until: string | null
          spotter_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          auto_release_at?: string | null
          created_at?: string
          dispute_reason?: string | null
          disputed_at?: string | null
          id?: string
          request_id: string
          requester_id: string
          reserved_until?: string | null
          spotter_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          auto_release_at?: string | null
          created_at?: string
          dispute_reason?: string | null
          disputed_at?: string | null
          id?: string
          request_id?: string
          requester_id?: string
          reserved_until?: string | null
          spotter_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrows_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      media_uploads: {
        Row: {
          captured_at: string
          created_at: string
          file_url: string
          id: string
          latitude: number | null
          longitude: number | null
          request_id: string
          spotter_id: string
          updated_at: string
        }
        Insert: {
          captured_at?: string
          created_at?: string
          file_url: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          request_id: string
          spotter_id: string
          updated_at?: string
        }
        Update: {
          captured_at?: string
          created_at?: string
          file_url?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          request_id?: string
          spotter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_uploads_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_accounts: {
        Row: {
          created_at: string
          details_submitted: boolean
          environment: string
          payouts_enabled: boolean
          requirements_note: string
          stripe_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details_submitted?: boolean
          environment?: string
          payouts_enabled?: boolean
          requirements_note?: string
          stripe_account_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details_submitted?: boolean
          environment?: string
          payouts_enabled?: boolean
          requirements_note?: string
          stripe_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          destination: string
          id: string
          note: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          destination: string
          id?: string
          note?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          destination?: string
          id?: string
          note?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_earnings: {
        Row: {
          created_at: string
          fee_amount: number
          gross_amount: number
          id: string
          request_id: string | null
          spotter_id: string | null
        }
        Insert: {
          created_at?: string
          fee_amount: number
          gross_amount: number
          id?: string
          request_id?: string | null
          spotter_id?: string | null
        }
        Update: {
          created_at?: string
          fee_amount?: number
          gross_amount?: number
          id?: string
          request_id?: string | null
          spotter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_earnings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_name: string
          caption: string
          categories: string[]
          created_at: string
          id: string
          is_live: boolean
          media_path: string
          media_type: string
          place: string
          title: string
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          author_name?: string
          caption?: string
          categories?: string[]
          created_at?: string
          id?: string
          is_live?: boolean
          media_path: string
          media_type?: string
          place: string
          title: string
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          author_name?: string
          caption?: string
          categories?: string[]
          created_at?: string
          id?: string
          is_live?: boolean
          media_path?: string
          media_type?: string
          place?: string
          title?: string
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          full_name: string
          id: string
          onboarded: boolean
          rating: number
          terms_accepted_at: string | null
          updated_at: string
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          full_name?: string
          id: string
          onboarded?: boolean
          rating?: number
          terms_accepted_at?: string | null
          updated_at?: string
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          full_name?: string
          id?: string
          onboarded?: boolean
          rating?: number
          terms_accepted_at?: string | null
          updated_at?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          ratee_id: string
          rater_id: string
          request_id: string
          score: number
        }
        Insert: {
          created_at?: string
          id?: string
          ratee_id: string
          rater_id: string
          request_id: string
          score: number
        }
        Update: {
          created_at?: string
          id?: string
          ratee_id?: string
          rater_id?: string
          request_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_access_codes: {
        Row: {
          code: string
          created_at: string
          request_id: string
          requester_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          request_id: string
          requester_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          request_id?: string
          requester_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_access_codes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          bounty_amount: number
          category: string | null
          checklist: string[]
          created_at: string
          expires_at: string
          id: string
          latitude: number
          location_name: string
          longitude: number
          prompt: string
          requester_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          bounty_amount?: number
          category?: string | null
          checklist?: string[]
          created_at?: string
          expires_at?: string
          id?: string
          latitude: number
          location_name?: string
          longitude: number
          prompt: string
          requester_id: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          bounty_amount?: number
          category?: string | null
          checklist?: string[]
          created_at?: string
          expires_at?: string
          id?: string
          latitude?: number
          location_name?: string
          longitude?: number
          prompt?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      topups: {
        Row: {
          amount: number
          created_at: string
          environment: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          environment?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          environment?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "bounty_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_reviews: {
        Row: {
          created_at: string
          id: string
          note: string
          score: number
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          score: number
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          score?: number
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_reviews_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "bounty_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          kind: string
          note: string
          request_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          kind: string
          note?: string
          request_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          kind?: string
          note?: string
          request_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_bounty_video: { Args: { _video_id: string }; Returns: number }
      adjust_wallet: {
        Args: {
          _amount: number
          _kind: string
          _note: string
          _request_id: string
          _user_id: string
        }
        Returns: number
      }
      can_view_dispute: {
        Args: { _request_id: string; _user_id: string }
        Returns: boolean
      }
      close_expired_requests: { Args: never; Returns: number }
      credit_topup: {
        Args: {
          _amount: number
          _environment: string
          _session_id: string
          _user_id: string
        }
        Returns: boolean
      }
      dispute_bounty: {
        Args: { _reason: string; _request_id: string }
        Returns: boolean
      }
      explore_clips: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          average_rating: number
          bounty_amount: number
          comment_count: number
          created_at: string
          duration_seconds: number
          id: string
          note: string
          request_place: string
          request_title: string
          review_count: number
          storage_path: string
          thumb_path: string
          uploader_avatar: string
          uploader_name: string
          view_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_clip_views: { Args: { _video_id: string }; Returns: number }
      list_disputes: {
        Args: never
        Returns: {
          amount: number
          dispute_reason: string
          disputed_at: string
          evidence_count: number
          is_moderator: boolean
          location_name: string
          prompt: string
          request_id: string
          requester_id: string
          spotter_id: string
          status: string
        }[]
      }
      public_request_markers: {
        Args: never
        Returns: {
          approx_latitude: number
          approx_longitude: number
          bounty_amount: number
          category: string
          created_at: string
          expires_at: string
          id: string
          location_name: string
        }[]
      }
      reject_proof: {
        Args: { _reason: string; _request_id: string }
        Returns: boolean
      }
      request_cashout: { Args: { _amount: number }; Returns: string }
      request_is_live: { Args: { _request_id: string }; Returns: boolean }
      resolve_dispute: {
        Args: { _award_spotter: boolean; _request_id: string }
        Returns: boolean
      }
      resolve_payout: {
        Args: { _approve: boolean; _note: string; _payout_id: string }
        Returns: boolean
      }
      settle_escrows: { Args: never; Returns: Json }
      top_reporters: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          clips: number
          display_name: string
          total_earned: number
          user_id: string
        }[]
      }
      top_reporters_weekly: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          clips: number
          display_name: string
          total_earned: number
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "moderator"
      claim_status: "in_progress" | "submitted" | "approved"
      request_status: "open" | "claimed" | "completed" | "expired"
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
      app_role: ["admin", "user", "moderator"],
      claim_status: ["in_progress", "submitted", "approved"],
      request_status: ["open", "claimed", "completed", "expired"],
    },
  },
} as const
