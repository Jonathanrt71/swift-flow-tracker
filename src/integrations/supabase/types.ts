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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      competencies: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string
          id: string
          title: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          title: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencies_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "competency_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_assessment_grades: {
        Row: {
          assessment_id: string
          grade: number
          id: string
          task_id: string
        }
        Insert: {
          assessment_id: string
          grade: number
          id?: string
          task_id: string
        }
        Update: {
          assessment_id?: string
          grade?: number
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_assessment_grades_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "competency_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_assessment_grades_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "competency_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_assessments: {
        Row: {
          assessor_id: string
          competency_id: string
          created_at: string | null
          id: string
          overall_comment: string | null
          overall_grade: number | null
          resident_id: string
        }
        Insert: {
          assessor_id: string
          competency_id: string
          created_at?: string | null
          id?: string
          overall_comment?: string | null
          overall_grade?: number | null
          resident_id: string
        }
        Update: {
          assessor_id?: string
          competency_id?: string
          created_at?: string | null
          id?: string
          overall_comment?: string | null
          overall_grade?: number | null
          resident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_assessments_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      competency_sections: {
        Row: {
          competency_id: string
          id: string
          name: string
          position: number
        }
        Insert: {
          competency_id: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          competency_id?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "competency_sections_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_tasks: {
        Row: {
          detail: string | null
          id: string
          position: number
          section_id: string
          title: string
        }
        Insert: {
          detail?: string | null
          id?: string
          position?: number
          section_id: string
          title: string
        }
        Update: {
          detail?: string | null
          id?: string
          position?: number
          section_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_tasks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "competency_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          end_time: string | null
          event_date: string
          id: string
          start_time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          start_time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          start_time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          comment: string
          created_at: string | null
          faculty_id: string
          id: string
          resident_id: string
          sentiment: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          faculty_id: string
          id?: string
          resident_id: string
          sentiment: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          faculty_id?: string
          id?: string
          resident_id?: string
          sentiment?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          created_at: string | null
          id: string
          meeting_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_tag_links: {
        Row: {
          id: string
          meeting_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          meeting_id: string
          tag_id: string
        }
        Update: {
          id?: string
          meeting_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_tag_links_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "meeting_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          meeting_date: string
          notes: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          meeting_date: string
          notes?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          meeting_date?: string
          notes?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      milestones: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          position: number
          task_id: string
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          position?: number
          task_id: string
          title: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          position?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          task_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          meeting_id: string | null
          owed_to: string | null
          parent_id: string | null
          position: number
          starred: boolean
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          owed_to?: string | null
          parent_id?: string | null
          position?: number
          starred?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          owed_to?: string | null
          parent_id?: string | null
          position?: number
          starred?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "faculty" | "resident"
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
      app_role: ["admin", "user", "faculty", "resident"],
    },
  },
} as const
