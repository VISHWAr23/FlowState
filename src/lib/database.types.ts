// FlowState Database Types
// This is a placeholder file for Supabase-generated types.
// To generate proper types, run:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts
// For now, this provides the minimal Database type so the app compiles.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          timezone: string;
          preferred_language: string;
          created_at: string;
          updated_at: string;
          level: number;
          xp: number;
          total_focus_minutes: number;
          current_streak: number;
          longest_streak: number;
          daily_xp_cap: number;
          weekly_review_day: number;
          morning_reminder: string | null;
          evening_reminder: string | null;
          password_hash: string | null;
        };
        Insert: Record<string, any> & { id: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
      life_areas: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          description: string | null;
          color: string;
          icon: string;
          sort_order: number;
          is_default: boolean;
          is_active: boolean;
          target_hours_per_week: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, any> & { user_id: string; name: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          life_area_id: string;
          title: string;
          description: string | null;
          status: string;
          priority: number;
          start_date: string;
          target_date: string;
          completed_at: string | null;
          progress: number;
          xp_reward: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, any> & { user_id: string; title: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
      key_results: {
        Row: {
          id: string;
          goal_id: string;
          title: string;
          target_value: number;
          current_value: number;
          unit: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, any> & { goal_id: string; title: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string | null;
          life_area_id: string | null;
          parent_task_id: string | null;
          title: string;
          description: string | null;
          status: string;
          priority: string;
          energy_level: string | null;
          estimated_minutes: number | null;
          actual_minutes: number | null;
          due_date: string | null;
          scheduled_start: string | null;
          scheduled_end: string | null;
          completed_at: string | null;
          is_recurring: boolean;
          recurrence_rule: string | null;
          source: string;
          xp_reward: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, any> & { user_id: string; title: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string | null;
          life_area_id: string | null;
          title: string;
          description: string | null;
          frequency: string;
          specific_days: number[];
          time_of_day: string;
          target_duration_minutes: number | null;
          color: string;
          icon: string;
          streak_current: number;
          streak_longest: number;
          total_completions: number;
          xp_reward: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, any> & { user_id: string; title: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          completed_date: string;
          completed_at: string;
          duration_minutes: number | null;
          notes: string | null;
          mood: number | null;
        };
        Insert: Record<string, any> & { habit_id: string; user_id: string; completed_date: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
      focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string | null;
          goal_id: string | null;
          life_area_id: string | null;
          started_at: string;
          ended_at: string | null;
          planned_duration: number;
          actual_duration: number | null;
          status: string;
          interruptions: number;
          interruption_notes: string[] | null;
          flow_rating: number | null;
          notes: string | null;
          xp_earned: number;
          created_at: string;
        };
        Insert: Record<string, any> & { user_id: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          morning_completed_at: string | null;
          evening_completed_at: string | null;
          day_rating: number | null;
          energy_rating: number | null;
          mood: string | null;
          top_wins: string[] | null;
          lessons_learned: string | null;
          gratitude_note: string | null;
          focus_hours: number;
          tasks_completed: number;
          tasks_planned: number;
          habits_completed: number;
          habits_planned: number;
          xp_earned: number;
          productivity_score: number | null;
        };
        Insert: Record<string, any> & { user_id: string; log_date: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
      weekly_reviews: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          week_end: string;
          completed_at: string | null;
          completion_rate: number | null;
          consistency_score: number | null;
          focus_score: number | null;
          goal_score: number | null;
          productivity_score: number | null;
          wins: string[] | null;
          challenges: string[] | null;
          adjustments: string | null;
          next_week_priorities: string[] | null;
          time_allocation: Json | null;
        };
        Insert: Record<string, any> & { user_id: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
      badges: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          category: string;
          icon: string;
          color: string;
          xp_reward: number;
          requirement_type: string;
          requirement_value: number;
          created_at: string;
        };
        Insert: Record<string, any> & { code: string; name: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
          is_new: boolean;
        };
        Insert: Record<string, any> & { user_id: string; badge_id: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
      xp_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          source: string;
          source_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: Record<string, any> & { user_id: string; amount: number; source: string };
        Update: Record<string, any>;
          Relationships: any[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      add_xp: {
        Args: {
          user_uuid: string;
          xp_amount: number;
          xp_source: string;
          source_uuid: string | null;
          xp_description: string;
        };
        Returns: void;
      };
      check_badges: {
        Args: {
          user_uuid: string;
        };
        Returns: { badge_id: string; badge_name: string; is_new: boolean }[];
      };
    };
    Enums: Record<string, never>;
  };
}
