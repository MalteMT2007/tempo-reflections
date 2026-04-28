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
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      ensemble_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string | null
          ensemble_id: string
          id: string
          invited_by: string
          invitee_user_id: string | null
          role: Database["public"]["Enums"]["ensemble_role"]
          section_id: string | null
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          ensemble_id: string
          id?: string
          invited_by: string
          invitee_user_id?: string | null
          role?: Database["public"]["Enums"]["ensemble_role"]
          section_id?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          ensemble_id?: string
          id?: string
          invited_by?: string
          invitee_user_id?: string | null
          role?: Database["public"]["Enums"]["ensemble_role"]
          section_id?: string | null
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "ensemble_invites_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ensemble_invites_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "ensemble_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      ensemble_members: {
        Row: {
          ensemble_id: string
          joined_at: string
          role: Database["public"]["Enums"]["ensemble_role"]
          section_id: string | null
          user_id: string
        }
        Insert: {
          ensemble_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["ensemble_role"]
          section_id?: string | null
          user_id: string
        }
        Update: {
          ensemble_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["ensemble_role"]
          section_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ensemble_members_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ensemble_members_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "ensemble_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      ensemble_projects: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          ensemble_id: string
          id: string
          status: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          ensemble_id: string
          id?: string
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          ensemble_id?: string
          id?: string
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ensemble_projects_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
        ]
      }
      ensemble_roster: {
        Row: {
          claimed_by: string | null
          created_at: string
          created_by: string
          ensemble_id: string
          id: string
          instrument: string | null
          name: string
          section_id: string | null
          updated_at: string
        }
        Insert: {
          claimed_by?: string | null
          created_at?: string
          created_by: string
          ensemble_id: string
          id?: string
          instrument?: string | null
          name: string
          section_id?: string | null
          updated_at?: string
        }
        Update: {
          claimed_by?: string | null
          created_at?: string
          created_by?: string
          ensemble_id?: string
          id?: string
          instrument?: string | null
          name?: string
          section_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ensemble_roster_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ensemble_roster_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "ensemble_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      ensemble_sections: {
        Row: {
          created_at: string
          ensemble_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          ensemble_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          ensemble_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ensemble_sections_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
        ]
      }
      ensembles: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reposts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reposts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          byline: string | null
          created_at: string
          duration_sec: number
          ended_at: string | null
          id: string
          started_at: string
          title: string
          user_id: string
        }
        Insert: {
          byline?: string | null
          created_at?: string
          duration_sec?: number
          ended_at?: string | null
          id?: string
          started_at?: string
          title: string
          user_id: string
        }
        Update: {
          byline?: string | null
          created_at?: string
          duration_sec?: number
          ended_at?: string | null
          id?: string
          started_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_experiences: {
        Row: {
          created_at: string
          description: string | null
          end_year: number | null
          id: string
          kind: string
          location: string | null
          organization: string | null
          sort_order: number
          start_year: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_year?: number | null
          id?: string
          kind?: string
          location?: string | null
          organization?: string | null
          sort_order?: number
          start_year?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_year?: number | null
          id?: string
          kind?: string
          location?: string | null
          organization?: string | null
          sort_order?: number
          start_year?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          genre: string | null
          genre_label: string | null
          id: string
          instrument: string | null
          onboarding_complete: boolean
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          genre?: string | null
          genre_label?: string | null
          id: string
          instrument?: string | null
          onboarding_complete?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          genre?: string | null
          genre_label?: string | null
          id?: string
          instrument?: string | null
          onboarding_complete?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      project_events: {
        Row: {
          created_at: string
          id: string
          location: string | null
          notes: string | null
          project_id: string
          starts_at: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          project_id: string
          starts_at: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string
          starts_at?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "project_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ensemble_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_score_assignments: {
        Row: {
          assignee_id: string
          assignee_type: Database["public"]["Enums"]["assignee_type"]
          created_at: string
          id: string
          project_score_id: string
        }
        Insert: {
          assignee_id: string
          assignee_type: Database["public"]["Enums"]["assignee_type"]
          created_at?: string
          id?: string
          project_score_id: string
        }
        Update: {
          assignee_id?: string
          assignee_type?: Database["public"]["Enums"]["assignee_type"]
          created_at?: string
          id?: string
          project_score_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_score_assignments_project_score_id_fkey"
            columns: ["project_score_id"]
            isOneToOne: false
            referencedRelation: "project_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      project_scores: {
        Row: {
          composer: string | null
          created_at: string
          created_by: string
          file_url: string | null
          id: string
          project_id: string
          score_id: string | null
          title: string
        }
        Insert: {
          composer?: string | null
          created_at?: string
          created_by: string
          file_url?: string | null
          id?: string
          project_id: string
          score_id?: string | null
          title: string
        }
        Update: {
          composer?: string | null
          created_at?: string
          created_by?: string
          file_url?: string | null
          id?: string
          project_id?: string
          score_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ensemble_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_scores_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "scores"
            referencedColumns: ["id"]
          },
        ]
      }
      room_invites: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invitee_id: string
          responded_at: string | null
          room_id: string
          status: Database["public"]["Enums"]["room_invite_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invitee_id: string
          responded_at?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["room_invite_status"]
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invitee_id?: string
          responded_at?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["room_invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "room_invites_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          joined_at: string
          role: Database["public"]["Enums"]["room_role"]
          room_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: Database["public"]["Enums"]["room_role"]
          room_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: Database["public"]["Enums"]["room_role"]
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          room_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          room_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      score_annotations: {
        Row: {
          created_at: string
          data: Json
          id: string
          kind: string
          page_index: number
          role: string
          score_id: string
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          kind: string
          page_index?: number
          role?: string
          score_id: string
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          page_index?: number
          role?: string
          score_id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_annotations_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_annotations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      score_ensembles: {
        Row: {
          ensemble_id: string
          score_id: string
          shared_at: string
          shared_by: string
        }
        Insert: {
          ensemble_id: string
          score_id: string
          shared_at?: string
          shared_by: string
        }
        Update: {
          ensemble_id?: string
          score_id?: string
          shared_at?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_ensembles_ensemble_id_fkey"
            columns: ["ensemble_id"]
            isOneToOne: false
            referencedRelation: "ensembles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_ensembles_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "scores"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          composer: string | null
          created_at: string
          favorite: boolean
          file_path: string
          id: string
          instrument: string | null
          owner_id: string
          page_count: number
          size_bytes: number
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          composer?: string | null
          created_at?: string
          favorite?: boolean
          file_path: string
          id?: string
          instrument?: string | null
          owner_id: string
          page_count?: number
          size_bytes?: number
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          composer?: string | null
          created_at?: string
          favorite?: boolean
          file_path?: string
          id?: string
          instrument?: string | null
          owner_id?: string
          page_count?: number
          size_bytes?: number
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_scores: {
        Row: {
          attached_at: string
          score_id: string
          session_id: string
        }
        Insert: {
          attached_at?: string
          score_id: string
          session_id: string
        }
        Update: {
          attached_at?: string
          score_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_scores_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_ensemble_invite: { Args: { _token: string }; Returns: string }
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      can_view_project_score: {
        Args: { _pscore: string; _user: string }
        Returns: boolean
      }
      can_view_score: {
        Args: { _score_id: string; _user: string }
        Returns: boolean
      }
      current_user_email: { Args: never; Returns: string }
      ensemble_member_section: {
        Args: { _ensemble: string; _user: string }
        Returns: string
      }
      is_ensemble_admin: {
        Args: { _ensemble: string; _user: string }
        Returns: boolean
      }
      is_ensemble_member: {
        Args: { _ensemble: string; _user: string }
        Returns: boolean
      }
      is_project_admin: {
        Args: { _project: string; _user: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project: string; _user: string }
        Returns: boolean
      }
      is_room_admin: {
        Args: { _room: string; _user: string }
        Returns: boolean
      }
      is_room_member: {
        Args: { _room: string; _user: string }
        Returns: boolean
      }
      is_score_owner: {
        Args: { _score_id: string; _user: string }
        Returns: boolean
      }
      score_shared_with_user: {
        Args: { _score_id: string; _user: string }
        Returns: boolean
      }
      user_has_room_invite: {
        Args: { _room: string; _user: string }
        Returns: boolean
      }
      username_available: { Args: { _name: string }; Returns: boolean }
    }
    Enums: {
      assignee_type: "section" | "member"
      ensemble_role: "admin" | "member" | "section_member"
      event_type: "rehearsal" | "concert"
      friendship_status: "pending" | "accepted"
      invite_status: "pending" | "accepted" | "revoked" | "declined"
      project_status: "planning" | "rehearsing" | "completed"
      room_invite_status: "pending" | "accepted" | "declined"
      room_role: "admin" | "member"
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
      assignee_type: ["section", "member"],
      ensemble_role: ["admin", "member", "section_member"],
      event_type: ["rehearsal", "concert"],
      friendship_status: ["pending", "accepted"],
      invite_status: ["pending", "accepted", "revoked", "declined"],
      project_status: ["planning", "rehearsing", "completed"],
      room_invite_status: ["pending", "accepted", "declined"],
      room_role: ["admin", "member"],
    },
  },
} as const
