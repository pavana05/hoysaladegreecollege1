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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      absent_notes: {
        Row: {
          added_by: string | null
          created_at: string
          date: string
          id: string
          note: string
          remarks: string | null
          student_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          date?: string
          id?: string
          note: string
          remarks?: string | null
          student_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          date?: string
          id?: string
          note?: string
          remarks?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absent_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_years: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean | null
          label: string
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          label: string
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          label?: string
          start_date?: string | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      admission_applications: {
        Row: {
          address: string | null
          application_number: string | null
          course: string
          created_at: string
          date_of_birth: string | null
          email: string
          father_name: string | null
          full_name: string
          gender: string | null
          id: string
          mother_name: string | null
          percentage_12th: string | null
          phone: string
          photo_url: string | null
          previous_school: string | null
          review_notes: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          address?: string | null
          application_number?: string | null
          course: string
          created_at?: string
          date_of_birth?: string | null
          email: string
          father_name?: string | null
          full_name: string
          gender?: string | null
          id?: string
          mother_name?: string | null
          percentage_12th?: string | null
          phone: string
          photo_url?: string | null
          previous_school?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          address?: string | null
          application_number?: string | null
          course?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string
          father_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          mother_name?: string | null
          percentage_12th?: string | null
          phone?: string
          photo_url?: string | null
          previous_school?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      admission_seats: {
        Row: {
          course_code: string
          id: string
          total_seats: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          course_code: string
          id?: string
          total_seats?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          course_code?: string
          id?: string
          total_seats?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      alumni_stories: {
        Row: {
          batch_year: string
          company: string
          course: string
          created_at: string
          id: string
          image_url: string | null
          is_featured: boolean | null
          job_title: string
          linkedin_url: string | null
          name: string
          story: string
          updated_at: string
        }
        Insert: {
          batch_year: string
          company: string
          course: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          job_title: string
          linkedin_url?: string | null
          name: string
          story: string
          updated_at?: string
        }
        Update: {
          batch_year?: string
          company?: string
          course?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          job_title?: string
          linkedin_url?: string | null
          name?: string
          story?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          course_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          posted_by: string | null
          semester: number | null
          title: string
        }
        Insert: {
          content?: string
          course_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          posted_by?: string | null
          semester?: number | null
          title: string
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          posted_by?: string | null
          semester?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      attendance: {
        Row: {
          course_id: string | null
          created_at: string
          date: string
          id: string
          marked_by: string | null
          status: string
          student_id: string
          subject: string
          year_level: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          status?: string
          student_id: string
          subject: string
          year_level?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          status?: string
          student_id?: string
          subject?: string
          year_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      birthday_settings: {
        Row: {
          id: string
          principal_name: string
          quote: string
          updated_at: string
          updated_by: string | null
          wishes_message: string
        }
        Insert: {
          id?: string
          principal_name?: string
          quote?: string
          updated_at?: string
          updated_by?: string | null
          wishes_message?: string
        }
        Update: {
          id?: string
          principal_name?: string
          quote?: string
          updated_at?: string
          updated_by?: string | null
          wishes_message?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string
          name: string
          status?: string
          subject?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          department_id: string | null
          duration: string | null
          eligibility: string | null
          fee: string | null
          highlights: string[] | null
          id: string
          is_active: boolean | null
          name: string
          overview: string | null
        }
        Insert: {
          code: string
          created_at?: string
          department_id?: string | null
          duration?: string | null
          eligibility?: string | null
          fee?: string | null
          highlights?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          overview?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string | null
          duration?: string | null
          eligibility?: string | null
          fee?: string | null
          highlights?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          overview?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          description: string | null
          hod_name: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          hod_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          hod_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_read: boolean
          message: string
          parent_message_id: string | null
          receiver_id: string
          sender_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          message: string
          parent_message_id?: string | null
          receiver_id: string
          sender_id: string
          subject?: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          message?: string
          parent_message_id?: string | null
          receiver_id?: string
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          posted_by: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          posted_by?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          posted_by?: string | null
          title?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          exam_date: string
          exam_type: string
          id: string
          is_active: boolean | null
          semester: number | null
          subject: string
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          exam_date: string
          exam_type?: string
          id?: string
          is_active?: boolean | null
          semester?: number | null
          subject: string
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          exam_date?: string
          exam_type?: string
          id?: string
          is_active?: boolean | null
          semester?: number | null
          subject?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_members: {
        Row: {
          created_at: string | null
          department: string
          email: string | null
          experience: string
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          photo_url: string | null
          posted_by: string | null
          qualification: string
          role: string
          sort_order: number | null
          subjects: string[] | null
        }
        Insert: {
          created_at?: string | null
          department?: string
          email?: string | null
          experience?: string
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          photo_url?: string | null
          posted_by?: string | null
          qualification?: string
          role?: string
          sort_order?: number | null
          subjects?: string[] | null
        }
        Update: {
          created_at?: string | null
          department?: string
          email?: string | null
          experience?: string
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          posted_by?: string | null
          qualification?: string
          role?: string
          sort_order?: number | null
          subjects?: string[] | null
        }
        Relationships: []
      }
      fcm_tokens: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fee_concessions: {
        Row: {
          academic_year: string | null
          amount: number
          approved_by: string | null
          concession_name: string
          concession_type: string
          created_at: string
          id: string
          is_active: boolean
          is_percentage: boolean
          reason: string | null
          semester: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          amount?: number
          approved_by?: string | null
          concession_name: string
          concession_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_percentage?: boolean
          reason?: string | null
          semester?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          amount?: number
          approved_by?: string | null
          concession_name?: string
          concession_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_percentage?: boolean
          reason?: string | null
          semester?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_concessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_management_pin: {
        Row: {
          id: string
          pin_hash: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          pin_hash: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          pin_hash?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_date: string
          payment_method: string | null
          receipt_number: string | null
          recorded_by: string | null
          remarks: string | null
          semester: number | null
          student_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          remarks?: string | null
          semester?: number | null
          student_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_date?: string
          payment_method?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          remarks?: string | null
          semester?: number | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_complaints: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          album_name: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_active: boolean | null
          posted_by: string | null
          sort_order: number | null
          title: string
        }
        Insert: {
          album_name?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          posted_by?: string | null
          sort_order?: number | null
          title: string
        }
        Update: {
          album_name?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          posted_by?: string | null
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      hall_ticket_sessions: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string | null
          exam_type: string
          id: string
          is_active: boolean
          semester: number | null
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          exam_type?: string
          id?: string
          is_active?: boolean
          semester?: number | null
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          exam_type?: string
          id?: string
          is_active?: boolean
          semester?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hall_ticket_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      hall_ticket_subjects: {
        Row: {
          created_at: string
          exam_date: string
          exam_time: string | null
          id: string
          session_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          exam_date: string
          exam_time?: string | null
          id?: string
          session_id: string
          subject: string
        }
        Update: {
          created_at?: string
          exam_date?: string
          exam_time?: string | null
          id?: string
          session_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "hall_ticket_subjects_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "hall_ticket_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          application_link: string | null
          company: string
          created_at: string
          deadline: string | null
          description: string
          eligibility_courses: string[] | null
          eligibility_semester: number | null
          id: string
          is_active: boolean
          job_type: string
          location: string | null
          posted_by: string | null
          salary_range: string | null
          title: string
          updated_at: string
        }
        Insert: {
          application_link?: string | null
          company: string
          created_at?: string
          deadline?: string | null
          description?: string
          eligibility_courses?: string[] | null
          eligibility_semester?: number | null
          id?: string
          is_active?: boolean
          job_type?: string
          location?: string | null
          posted_by?: string | null
          salary_range?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          application_link?: string | null
          company?: string
          created_at?: string
          deadline?: string | null
          description?: string
          eligibility_courses?: string[] | null
          eligibility_semester?: number | null
          id?: string
          is_active?: boolean
          job_type?: string
          location?: string | null
          posted_by?: string | null
          salary_range?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_books: {
        Row: {
          author: string
          available_copies: number
          category: string
          cover_url: string | null
          created_at: string
          id: string
          isbn: string | null
          title: string
          total_copies: number
          updated_at: string
        }
        Insert: {
          author: string
          available_copies?: number
          category: string
          cover_url?: string | null
          created_at?: string
          id?: string
          isbn?: string | null
          title: string
          total_copies?: number
          updated_at?: string
        }
        Update: {
          author?: string
          available_copies?: number
          category?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          isbn?: string | null
          title?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: []
      }
      marks: {
        Row: {
          course_id: string | null
          created_at: string
          exam_type: string
          id: string
          max_marks: number
          obtained_marks: number
          semester: number | null
          student_id: string
          subject: string
          uploaded_by: string | null
          year_level: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          exam_type?: string
          id?: string
          max_marks?: number
          obtained_marks?: number
          semester?: number | null
          student_id: string
          subject: string
          uploaded_by?: string | null
          year_level?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          exam_type?: string
          id?: string
          max_marks?: number
          obtained_marks?: number
          semester?: number | null
          student_id?: string
          subject?: string
          uploaded_by?: string | null
          year_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          is_pinned: boolean | null
          posted_by: string | null
          title: string
          type: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          posted_by?: string | null
          title: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          posted_by?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          id: string
          name: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          id?: string
          name?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          id?: string
          name?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      pending_admin_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          otp_code: string | null
          otp_expires_at: string | null
          phone: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requester_id: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          otp_code?: string | null
          otp_expires_at?: string | null
          phone?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requester_id: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          otp_code?: string | null
          otp_expires_at?: string | null
          phone?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requester_id?: string
          status?: string
        }
        Relationships: []
      }
      popup_banners: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          posted_by: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          posted_by?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          posted_by?: string | null
          title?: string
        }
        Relationships: []
      }
      previous_year_papers: {
        Row: {
          course: string
          created_at: string
          file_url: string | null
          id: string
          is_active: boolean | null
          posted_by: string | null
          semester: number | null
          subject: string
          title: string
          year: string
        }
        Insert: {
          course: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          posted_by?: string | null
          semester?: number | null
          subject: string
          title: string
          year: string
        }
        Update: {
          course?: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          posted_by?: string | null
          semester?: number | null
          subject?: string
          title?: string
          year?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      scholarships: {
        Row: {
          amount: string | null
          application_link: string | null
          created_at: string
          deadline: string | null
          description: string
          eligibility: string
          eligible_courses: string[] | null
          id: string
          is_active: boolean
          name: string
          posted_by: string | null
          provider: string
          scholarship_type: string
          updated_at: string
        }
        Insert: {
          amount?: string | null
          application_link?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          eligibility?: string
          eligible_courses?: string[] | null
          id?: string
          is_active?: boolean
          name: string
          posted_by?: string | null
          provider?: string
          scholarship_type?: string
          updated_at?: string
        }
        Update: {
          amount?: string | null
          application_link?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          eligibility?: string
          eligible_courses?: string[] | null
          id?: string
          is_active?: boolean
          name?: string
          posted_by?: string | null
          provider?: string
          scholarship_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      semester_fees: {
        Row: {
          created_at: string
          due_date: string | null
          fee_amount: number
          id: string
          remarks: string | null
          semester: number
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          fee_amount?: number
          id?: string
          remarks?: string | null
          semester: number
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          due_date?: string | null
          fee_amount?: number
          id?: string
          remarks?: string | null
          semester?: number
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "semester_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_badges: {
        Row: {
          badge_description: string
          badge_name: string
          badge_type: string
          earned_at: string
          id: string
          student_id: string
        }
        Insert: {
          badge_description?: string
          badge_name: string
          badge_type: string
          earned_at?: string
          id?: string
          student_id: string
        }
        Update: {
          badge_description?: string
          badge_name?: string
          badge_type?: string
          earned_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_url: string
          id: string
          student_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          student_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_url?: string
          id?: string
          student_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_sensitive_data: {
        Row: {
          aadhaar_number: string | null
          caste: string | null
          category: string | null
          religion: string | null
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aadhaar_number?: string | null
          caste?: string | null
          category?: string | null
          religion?: string | null
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aadhaar_number?: string | null
          caste?: string | null
          category?: string | null
          religion?: string | null
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_sensitive_data_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academic_year_id: string | null
          address: string | null
          admission_year: number | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          blood_group: string | null
          course_id: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          father_name: string | null
          fee_due_date: string | null
          fee_paid: number | null
          fee_remarks: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          joined_at: string | null
          mother_name: string | null
          nationality: string | null
          parent_phone: string | null
          phone: string | null
          previous_school: string | null
          rejected_at: string | null
          rejection_reason: string | null
          roll_number: string | null
          semester: number | null
          total_fee: number | null
          user_id: string
          uucms_id: string | null
          year_level: number | null
        }
        Insert: {
          academic_year_id?: string | null
          address?: string | null
          admission_year?: number | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          blood_group?: string | null
          course_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          father_name?: string | null
          fee_due_date?: string | null
          fee_paid?: number | null
          fee_remarks?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          mother_name?: string | null
          nationality?: string | null
          parent_phone?: string | null
          phone?: string | null
          previous_school?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          roll_number?: string | null
          semester?: number | null
          total_fee?: number | null
          user_id: string
          uucms_id?: string | null
          year_level?: number | null
        }
        Update: {
          academic_year_id?: string | null
          address?: string | null
          admission_year?: number | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          blood_group?: string | null
          course_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          father_name?: string | null
          fee_due_date?: string | null
          fee_paid?: number | null
          fee_remarks?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          mother_name?: string | null
          nationality?: string | null
          parent_phone?: string | null
          phone?: string | null
          previous_school?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          roll_number?: string | null
          semester?: number | null
          total_fee?: number | null
          user_id?: string
          uucms_id?: string | null
          year_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      study_materials: {
        Row: {
          course_id: string | null
          created_at: string
          file_url: string | null
          id: string
          semester: number | null
          subject: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          semester?: number | null
          subject: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          semester?: number | null
          subject?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      study_streaks: {
        Row: {
          id: string
          last_date: string
          streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          last_date?: string
          streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          last_date?: string
          streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          created_at: string
          department_id: string | null
          employee_id: string
          experience: string | null
          id: string
          is_active: boolean | null
          qualification: string | null
          subjects: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          employee_id: string
          experience?: string | null
          id?: string
          is_active?: boolean | null
          qualification?: string | null
          subjects?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          employee_id?: string
          experience?: string | null
          id?: string
          is_active?: boolean | null
          qualification?: string | null
          subjects?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      timetables: {
        Row: {
          course_id: string | null
          created_at: string
          day_of_week: string
          id: string
          period: string
          room: string | null
          semester: number | null
          subject: string
          teacher_name: string | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          day_of_week: string
          id?: string
          period: string
          room?: string | null
          semester?: number | null
          subject: string
          teacher_name?: string | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          day_of_week?: string
          id?: string
          period?: string
          room?: string | null
          semester?: number | null
          subject?: string
          teacher_name?: string | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetables_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      top_students: {
        Row: {
          course: string
          created_at: string
          id: string
          is_active: boolean | null
          photo_url: string | null
          posted_by: string | null
          rank: number
          student_name: string
          year: string
        }
        Insert: {
          course: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          photo_url?: string | null
          posted_by?: string | null
          rank: number
          student_name: string
          year: string
        }
        Update: {
          course?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          photo_url?: string | null
          posted_by?: string | null
          rank?: number
          student_name?: string
          year?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      check_registration_duplicates: {
        Args: { _aadhaar: string; _email: string; _uucms: string }
        Returns: Json
      }
      get_application_status: {
        Args: { _app_number: string; _email: string }
        Returns: {
          address: string | null
          application_number: string | null
          course: string
          created_at: string
          date_of_birth: string | null
          email: string
          father_name: string | null
          full_name: string
          gender: string | null
          id: string
          mother_name: string | null
          percentage_12th: string | null
          phone: string
          photo_url: string | null
          previous_school: string | null
          review_notes: string | null
          reviewed_by: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "admission_applications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_student_peers: {
        Args: { _user_id: string }
        Returns: {
          avatar_url: string
          course_id: string
          email: string
          full_name: string
          id: string
          roll_number: string
          semester: number
          user_id: string
          year_level: number
        }[]
      }
      get_students_for_teacher: {
        Args: never
        Returns: {
          academic_year_id: string
          address: string
          admission_year: number
          avatar_url: string
          blood_group: string
          category: string
          course_id: string
          created_at: string
          date_of_birth: string
          father_name: string
          gender: string
          id: string
          is_active: boolean
          mother_name: string
          nationality: string
          parent_phone: string
          phone: string
          roll_number: string
          semester: number
          user_id: string
          year_level: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_receipt_number: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "student" | "teacher" | "principal" | "admin"
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
      app_role: ["student", "teacher", "principal", "admin"],
    },
  },
} as const
