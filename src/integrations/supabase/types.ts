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
      alert_preferences: {
        Row: {
          area_label: string
          created_at: string
          email_enabled: boolean
          phone: string
          push_enabled: boolean
          radius_miles: number
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          area_label?: string
          created_at?: string
          email_enabled?: boolean
          phone?: string
          push_enabled?: boolean
          radius_miles?: number
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          area_label?: string
          created_at?: string
          email_enabled?: boolean
          phone?: string
          push_enabled?: boolean
          radius_miles?: number
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          expired_at: string | null
          id: string
          is_instant: boolean
          is_public: boolean
          note: string
          payout_amount: number
          purged_at: string | null
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
          expired_at?: string | null
          id?: string
          is_instant?: boolean
          is_public?: boolean
          note?: string
          payout_amount?: number
          purged_at?: string | null
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
          expired_at?: string | null
          id?: string
          is_instant?: boolean
          is_public?: boolean
          note?: string
          payout_amount?: number
          purged_at?: string | null
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
      coin_purchases: {
        Row: {
          amount_cents: number
          coins: number
          created_at: string
          environment: string
          id: string
          package_id: string
          session_id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          coins: number
          created_at?: string
          environment?: string
          id?: string
          package_id: string
          session_id: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          coins?: number
          created_at?: string
          environment?: string
          id?: string
          package_id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount_gross: number
          amount_net: number
          amount_platform_fee: number
          created_at: string
          id: string
          receiver_wallet_id: string | null
          request_id: string | null
          sender_wallet_id: string | null
          transaction_type: string
        }
        Insert: {
          amount_gross: number
          amount_net: number
          amount_platform_fee?: number
          created_at?: string
          id?: string
          receiver_wallet_id?: string | null
          request_id?: string | null
          sender_wallet_id?: string | null
          transaction_type: string
        }
        Update: {
          amount_gross?: number
          amount_net?: number
          amount_platform_fee?: number
          created_at?: string
          id?: string
          receiver_wallet_id?: string | null
          request_id?: string | null
          sender_wallet_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_transactions_receiver_wallet_id_fkey"
            columns: ["receiver_wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_transactions_sender_wallet_id_fkey"
            columns: ["sender_wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
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
      dmca_notices: {
        Row: {
          content_url: string
          created_at: string
          description: string
          email: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          content_url: string
          created_at?: string
          description: string
          email: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          content_url?: string
          created_at?: string
          description?: string
          email?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      hunter_locations: {
        Row: {
          created_at: string
          latitude: number
          longitude: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          latitude: number
          longitude: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          latitude?: number
          longitude?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      media_purge_queue: {
        Row: {
          bucket: string
          created_at: string
          error_message: string
          id: string
          path: string
          purged_at: string | null
          updated_at: string
          video_id: string | null
        }
        Insert: {
          bucket: string
          created_at?: string
          error_message?: string
          id?: string
          path: string
          purged_at?: string | null
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string
          error_message?: string
          id?: string
          path?: string
          purged_at?: string | null
          updated_at?: string
          video_id?: string | null
        }
        Relationships: []
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
      moderation_flags: {
        Row: {
          created_at: string
          details: string
          id: string
          matched_terms: string[]
          reviewed: boolean
          source: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          matched_terms?: string[]
          reviewed?: boolean
          source?: string
          title?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          matched_terms?: string[]
          reviewed?: boolean
          source?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      moderation_logs: {
        Row: {
          created_at: string
          id: string
          request_payload: Json
          status: string
          triggered_keywords: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_payload?: Json
          status?: string
          triggered_keywords?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_payload?: Json
          status?: string
          triggered_keywords?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          emailed_at: string | null
          id: string
          kind: string
          message_id: string | null
          preview: string
          read_at: string | null
          request_key: string
          sender_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emailed_at?: string | null
          id?: string
          kind?: string
          message_id?: string | null
          preview?: string
          read_at?: string | null
          request_key: string
          sender_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emailed_at?: string | null
          id?: string
          kind?: string
          message_id?: string | null
          preview?: string
          read_at?: string | null
          request_key?: string
          sender_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          cash_amount_usd: number
          coins_redeemed: number
          created_at: string
          destination: string
          id: string
          note: string
          status: string
          stripe_transfer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          cash_amount_usd?: number
          coins_redeemed?: number
          created_at?: string
          destination: string
          id?: string
          note?: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cash_amount_usd?: number
          coins_redeemed?: number
          created_at?: string
          destination?: string
          id?: string
          note?: string
          status?: string
          stripe_transfer_id?: string | null
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
          alias: string | null
          avatar_url: string | null
          banned_at: string | null
          created_at: string
          display_name: string
          full_name: string
          hunter_level: number
          id: string
          is_incognito: boolean
          onboarded: boolean
          rating: number
          terms_accepted_at: string | null
          updated_at: string
          wallet_balance: number
          warning_count: number
          xp: number
        }
        Insert: {
          alias?: string | null
          avatar_url?: string | null
          banned_at?: string | null
          created_at?: string
          display_name?: string
          full_name?: string
          hunter_level?: number
          id: string
          is_incognito?: boolean
          onboarded?: boolean
          rating?: number
          terms_accepted_at?: string | null
          updated_at?: string
          wallet_balance?: number
          warning_count?: number
          xp?: number
        }
        Update: {
          alias?: string | null
          avatar_url?: string | null
          banned_at?: string | null
          created_at?: string
          display_name?: string
          full_name?: string
          hunter_level?: number
          id?: string
          is_incognito?: boolean
          onboarded?: boolean
          rating?: number
          terms_accepted_at?: string | null
          updated_at?: string
          wallet_balance?: number
          warning_count?: number
          xp?: number
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
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
      request_chat_reads: {
        Row: {
          created_at: string
          last_read_at: string
          request_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_read_at?: string
          request_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_read_at?: string
          request_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      request_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          request_key: string
          sender_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          request_key: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          request_key?: string
          sender_id?: string
        }
        Relationships: []
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
      service_tokens: {
        Row: {
          created_at: string
          name: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          name: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          name?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
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
      user_wallets: {
        Row: {
          coin_balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coin_balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coin_balance?: number
          created_at?: string
          id?: string
          updated_at?: string
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
      video_tips: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          id: string
          tipper_id: string
          video_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          id?: string
          tipper_id: string
          video_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          id?: string
          tipper_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_tips_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "bounty_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_balances: {
        Row: {
          available_balance: number
          created_at: string
          lifetime_earnings: number
          pending_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          lifetime_earnings?: number
          pending_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          lifetime_earnings?: number
          pending_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_locations: {
        Row: {
          latitude: number | null
          longitude: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          latitude?: number | null
          longitude?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          latitude?: number | null
          longitude?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      admin_ban_user: {
        Args: { _reason?: string; _user_id: string }
        Returns: boolean
      }
      admin_moderation_log: {
        Args: { _limit?: number }
        Returns: {
          banned_at: string
          created_at: string
          details: string
          display_name: string
          id: string
          matched_terms: string[]
          title: string
          user_id: string
          warning_count: number
        }[]
      }
      admin_payout_queue: {
        Args: never
        Returns: {
          amount: number
          coin_balance: number
          coins_redeemed: number
          created_at: string
          destination: string
          display_name: string
          id: string
          status: string
          stripe_transfer_id: string
          user_id: string
        }[]
      }
      admin_unban_user: { Args: { _user_id: string }; Returns: boolean }
      admin_warn_user: {
        Args: { _reason?: string; _user_id: string }
        Returns: number
      }
      award_xp: { Args: { _amount: number; _user_id: string }; Returns: number }
      build_alias: { Args: { _user_id: string }; Returns: string }
      can_chat_on_request: {
        Args: { _request_key: string; _user_id: string }
        Returns: boolean
      }
      can_view_dispute: {
        Args: { _request_id: string; _user_id: string }
        Returns: boolean
      }
      chat_participants: {
        Args: { _request_key: string }
        Returns: {
          user_id: string
        }[]
      }
      close_expired_requests: { Args: never; Returns: number }
      credit_coin_purchase: {
        Args: {
          _amount_cents: number
          _coins: number
          _environment?: string
          _package_id: string
          _session_id: string
          _user_id: string
        }
        Returns: boolean
      }
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
      ensure_coin_wallet: { Args: { _user_id?: string }; Returns: string }
      expire_stale_media: { Args: never; Returns: Json }
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
      global_feed_clips: {
        Args: { _limit?: number }
        Returns: {
          bounty_amount: number
          created_at: string
          hunter_level: number
          id: string
          latitude: number
          longitude: number
          note: string
          request_place: string
          request_title: string
          storage_path: string
          thumb_path: string
          tip_total: number
          uploader_avatar: string
          uploader_id: string
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
      hunter_trust: {
        Args: { _user_id: string }
        Returns: {
          avg_response_minutes: number
          completed_claims: number
          completion_rate: number
          hunter_level: number
          total_claims: number
          verified: boolean
          xp: number
        }[]
      }
      increment_clip_views: { Args: { _video_id: string }; Returns: number }
      is_review_staff: { Args: { _user_id: string }; Returns: boolean }
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
      mark_chat_notifications_read: {
        Args: { _request_key: string }
        Returns: number
      }
      onlookers_within_radius: {
        Args: {
          _exclude_user_id?: string
          _latitude: number
          _longitude: number
          _radius_miles?: number
        }
        Returns: {
          distance_miles: number
          user_id: string
        }[]
      }
      platform_metrics: {
        Args: never
        Returns: {
          active_pins: number
          expired_clips: number
          gross_usd: number
          pending_payouts_usd: number
          platform_cut_usd: number
        }[]
      }
      public_profile_card: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          hunter_level: number
          is_incognito: boolean
          xp: number
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
      request_coin_cashout: { Args: { _coins: number }; Returns: string }
      request_earnings_payout: {
        Args: { _amount: number; _destination: string }
        Returns: string
      }
      request_is_live: { Args: { _request_id: string }; Returns: boolean }
      resolve_dispute: {
        Args: { _award_spotter: boolean; _request_id: string }
        Returns: boolean
      }
      resolve_payout: {
        Args: { _approve: boolean; _note: string; _payout_id: string }
        Returns: boolean
      }
      set_moderator: {
        Args: { _email: string; _enabled: boolean }
        Returns: boolean
      }
      settle_escrows: { Args: never; Returns: Json }
      submit_instant_snippet: { Args: { _video_id: string }; Returns: number }
      tip_coins: {
        Args: {
          _amount: number
          _receiver_id: string
          _request_id?: string
          _transaction_type?: string
        }
        Returns: {
          amount_net: number
          amount_platform_fee: number
          sender_balance: number
          transaction_id: string
        }[]
      }
      tip_hunter: {
        Args: { _amount: number; _video_id: string }
        Returns: number
      }
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
