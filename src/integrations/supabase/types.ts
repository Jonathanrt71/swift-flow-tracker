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
      clinical_topics: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_required: boolean
          last_reviewed: string | null
          notes: string | null
          sort_order: number
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_required?: boolean
          last_reviewed?: string | null
          notes?: string | null
          sort_order?: number
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_required?: boolean
          last_reviewed?: string | null
          notes?: string | null
          sort_order?: number
          title?: string
          updated_at?: string | null
          url?: string | null
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
      competency_categories_acgme: {
        Row: {
          code: string
          color: string
          created_at: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          color: string
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      competency_milestones_acgme: {
        Row: {
          created_at: string | null
          description: string
          examples: string[] | null
          id: string
          level: number
          subcategory_id: string
          summary: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          examples?: string[] | null
          id?: string
          level: number
          subcategory_id: string
          summary?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          examples?: string[] | null
          id?: string
          level?: number
          subcategory_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competency_milestones_acgme_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "competency_subcategories_acgme"
            referencedColumns: ["id"]
          },
        ]
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
      competency_subcategories_acgme: {
        Row: {
          category_id: string
          code: string
          created_at: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          category_id: string
          code: string
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "competency_subcategories_acgme_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "competency_categories_acgme"
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
      event_categories: {
        Row: {
          color: string
          created_at: string
          display_order: number
          id: string
          label: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          label: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
      event_evaluations: {
        Row: {
          created_at: string | null
          evaluator_id: string
          event_id: string
          id: string
          notes: string | null
          rating: string
          rating_content: string | null
          rating_overall: string | null
          rating_preparation: string | null
          rating_presentation: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          evaluator_id: string
          event_id: string
          id?: string
          notes?: string | null
          rating: string
          rating_content?: string | null
          rating_overall?: string | null
          rating_preparation?: string | null
          rating_presentation?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          evaluator_id?: string
          event_id?: string
          id?: string
          notes?: string | null
          rating?: string
          rating_content?: string | null
          rating_overall?: string | null
          rating_preparation?: string | null
          rating_presentation?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_evaluations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          archived: boolean
          assigned_to: string | null
          category: string
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          end_time: string | null
          event_date: string
          id: string
          next_occurrence_date: string | null
          operations_section_id: string | null
          recurrence_confirmed: boolean
          recurrence_parent_id: string | null
          recurrence_pattern: string | null
          start_time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          next_occurrence_date?: string | null
          operations_section_id?: string | null
          recurrence_confirmed?: boolean
          recurrence_parent_id?: string | null
          recurrence_pattern?: string | null
          start_time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          next_occurrence_date?: string | null
          operations_section_id?: string | null
          recurrence_confirmed?: boolean
          recurrence_parent_id?: string | null
          recurrence_pattern?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comment: string
          competency_category_id: string | null
          competency_milestone_id: string | null
          competency_subcategory_id: string | null
          created_at: string | null
          faculty_id: string
          id: string
          resident_id: string
          sentiment: string
        }
        Insert: {
          comment: string
          competency_category_id?: string | null
          competency_milestone_id?: string | null
          competency_subcategory_id?: string | null
          created_at?: string | null
          faculty_id: string
          id?: string
          resident_id: string
          sentiment: string
        }
        Update: {
          comment?: string
          competency_category_id?: string | null
          competency_milestone_id?: string | null
          competency_subcategory_id?: string | null
          created_at?: string | null
          faculty_id?: string
          id?: string
          resident_id?: string
          sentiment?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_competency_category_id_fkey"
            columns: ["competency_category_id"]
            isOneToOne: false
            referencedRelation: "competency_categories_acgme"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_competency_milestone_id_fkey"
            columns: ["competency_milestone_id"]
            isOneToOne: false
            referencedRelation: "competency_milestones_acgme"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_competency_subcategory_id_fkey"
            columns: ["competency_subcategory_id"]
            isOneToOne: false
            referencedRelation: "competency_subcategories_acgme"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      handbook_sections: {
        Row: {
          content: string
          display_order: number
          doc_type: string
          fts: unknown
          icon: string
          id: string
          parent_id: string | null
          role_visibility: string
          slug: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content: string
          display_order?: number
          doc_type?: string
          fts?: unknown
          icon?: string
          id?: string
          parent_id?: string | null
          role_visibility?: string
          slug: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          display_order?: number
          doc_type?: string
          fts?: unknown
          icon?: string
          id?: string
          parent_id?: string | null
          role_visibility?: string
          slug?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "handbook_sections_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "handbook_sections"
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
      milestone_reports: {
        Row: {
          comment: string
          created_at: string | null
          date_range_end: string
          date_range_start: string
          faculty_id: string
          finalized: boolean | null
          id: string
          milestone_level: number
          resident_id: string
          subcategory_id: string
          updated_at: string | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          date_range_end: string
          date_range_start: string
          faculty_id: string
          finalized?: boolean | null
          id?: string
          milestone_level: number
          resident_id: string
          subcategory_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          date_range_end?: string
          date_range_start?: string
          faculty_id?: string
          finalized?: boolean | null
          id?: string
          milestone_level?: number
          resident_id?: string
          subcategory_id?: string
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
          graduation_year: number | null
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
          graduation_year?: number | null
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
          graduation_year?: number | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      program_requirements: {
        Row: {
          compliance_narrative: string | null
          compliance_status: string
          created_at: string | null
          evidence_links: Json | null
          id: string
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          parent_requirement_number: string | null
          requirement_number: string
          requirement_text: string
          requirement_type: string
          responsible_person_id: string | null
          section_name: string
          section_number: number
          sort_order: number
          source: string | null
          subsection_key: string
          subsection_name: string
          updated_at: string | null
        }
        Insert: {
          compliance_narrative?: string | null
          compliance_status?: string
          created_at?: string | null
          evidence_links?: Json | null
          id?: string
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          parent_requirement_number?: string | null
          requirement_number: string
          requirement_text: string
          requirement_type: string
          responsible_person_id?: string | null
          section_name: string
          section_number: number
          sort_order: number
          source?: string | null
          subsection_key: string
          subsection_name?: string
          updated_at?: string | null
        }
        Update: {
          compliance_narrative?: string | null
          compliance_status?: string
          created_at?: string | null
          evidence_links?: Json | null
          id?: string
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          parent_requirement_number?: string | null
          requirement_number?: string
          requirement_text?: string
          requirement_type?: string
          responsible_person_id?: string | null
          section_name?: string
          section_number?: number
          sort_order?: number
          source?: string | null
          subsection_key?: string
          subsection_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      resident_milestone_status: {
        Row: {
          created_at: string | null
          current_level: number
          id: string
          resident_id: string
          subcategory_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          current_level?: number
          id?: string
          resident_id: string
          subcategory_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          current_level?: number
          id?: string
          resident_id?: string
          subcategory_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          access_level: string
          created_at: string | null
          id: string
          permission_key: string
          role: string
          updated_at: string | null
        }
        Insert: {
          access_level?: string
          created_at?: string | null
          id?: string
          permission_key: string
          role: string
          updated_at?: string | null
        }
        Update: {
          access_level?: string
          created_at?: string | null
          id?: string
          permission_key?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rotations: {
        Row: {
          attendings_notes: string | null
          attire: string | null
          contact_info: string | null
          display_order: number
          duration: string | null
          emr_notes: string | null
          hours: string | null
          id: string
          learning_goals: string | null
          location: string | null
          logistics: string | null
          name: string
          overview: string | null
          pgy_levels: string[] | null
          preparation: string | null
          procedures: string | null
          rotation_director: string | null
          rotation_type: string
          schedule_details: string | null
          slug: string
          updated_at: string | null
          updated_by: string | null
          vacation_eligible: boolean | null
        }
        Insert: {
          attendings_notes?: string | null
          attire?: string | null
          contact_info?: string | null
          display_order?: number
          duration?: string | null
          emr_notes?: string | null
          hours?: string | null
          id?: string
          learning_goals?: string | null
          location?: string | null
          logistics?: string | null
          name: string
          overview?: string | null
          pgy_levels?: string[] | null
          preparation?: string | null
          procedures?: string | null
          rotation_director?: string | null
          rotation_type?: string
          schedule_details?: string | null
          slug: string
          updated_at?: string | null
          updated_by?: string | null
          vacation_eligible?: boolean | null
        }
        Update: {
          attendings_notes?: string | null
          attire?: string | null
          contact_info?: string | null
          display_order?: number
          duration?: string | null
          emr_notes?: string | null
          hours?: string | null
          id?: string
          learning_goals?: string | null
          location?: string | null
          logistics?: string | null
          name?: string
          overview?: string | null
          pgy_levels?: string[] | null
          preparation?: string | null
          procedures?: string | null
          rotation_director?: string | null
          rotation_type?: string
          schedule_details?: string | null
          slug?: string
          updated_at?: string | null
          updated_by?: string | null
          vacation_eligible?: boolean | null
        }
        Relationships: []
      }
      task_template_items: {
        Row: {
          assignee_id: string | null
          assignee_role: string
          created_at: string | null
          day_offset: number
          description: string | null
          id: string
          sort_order: number
          template_id: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          assignee_role?: string
          created_at?: string | null
          day_offset?: number
          description?: string | null
          id?: string
          sort_order?: number
          template_id: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          assignee_role?: string
          created_at?: string | null
          day_offset?: number
          description?: string | null
          id?: string
          sort_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          operations_section_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          operations_section_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          operations_section_id?: string | null
          updated_at?: string | null
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
      topic_checkoffs: {
        Row: {
          checked_off_at: string
          created_at: string | null
          faculty_id: string
          id: string
          notes: string | null
          resident_id: string
          topic_id: string
        }
        Insert: {
          checked_off_at?: string
          created_at?: string | null
          faculty_id: string
          id?: string
          notes?: string | null
          resident_id: string
          topic_id: string
        }
        Update: {
          checked_off_at?: string
          created_at?: string | null
          faculty_id?: string
          id?: string
          notes?: string | null
          resident_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_checkoffs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "clinical_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_tag_links: {
        Row: {
          tag_id: string
          topic_id: string
        }
        Insert: {
          tag_id: string
          topic_id: string
        }
        Update: {
          tag_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "topic_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_tag_links_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "clinical_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_tags: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          tag_type: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          tag_type?: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          tag_type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          can_edit_handbook: boolean
          can_edit_operations: boolean
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          can_edit_handbook?: boolean
          can_edit_operations?: boolean
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          can_edit_handbook?: boolean
          can_edit_operations?: boolean
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      program_requirements_attention: {
        Row: {
          compliance_narrative: string | null
          compliance_status: string | null
          requirement_number: string | null
          requirement_text: string | null
          section_name: string | null
          subsection_name: string | null
        }
        Insert: {
          compliance_narrative?: string | null
          compliance_status?: string | null
          requirement_number?: string | null
          requirement_text?: string | null
          section_name?: string | null
          subsection_name?: string | null
        }
        Update: {
          compliance_narrative?: string | null
          compliance_status?: string | null
          requirement_number?: string | null
          requirement_text?: string | null
          section_name?: string | null
          subsection_name?: string | null
        }
        Relationships: []
      }
      program_requirements_summary: {
        Row: {
          compliance_status: string | null
          count: number | null
          requirement_type: string | null
          section_name: string | null
          section_number: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_handbook_sections: {
        Args: { doc_type_filter?: string; search_query: string }
        Returns: {
          content: string
          display_order: number
          doc_type: string
          headline: string
          icon: string
          id: string
          parent_id: string
          rank: number
          title: string
          updated_at: string
        }[]
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
