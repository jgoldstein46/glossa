/**
 * Database types for TutorTalk
 * These interfaces match the Supabase database schema
 */

// ============================================
// Core Entities
// ============================================

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  topic: string;
  difficulty: Difficulty;
  language: string;
  estimated_duration_mins: number;
  thumbnail_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  module_id: string;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  section_id: string;
  title: string;
  questions: QuizQuestion[];
  created_at: string;
  updated_at: string;
}

export interface QuizResult {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  answers: QuizAnswer[];
  completed_at: string;
  created_at: string;
}

export interface UserModuleProgress {
  id: string;
  user_id: string;
  module_id: string;
  status: ProgressStatus;
  current_section_index: number;
  started_at: string;
  completed_at: string | null;
}

// ============================================
// Nested Types (JSONB)
// ============================================

export interface QuizQuestion {
  id: string;
  question_text: string;
  input_type: QuestionInputType;
  options?: string[];
  correct_answer?: string;
  order_index: number;
}

export interface QuizAnswer {
  question_id: string;
  user_response: string;
  is_correct: boolean | null;
}

// ============================================
// Enums / Union Types
// ============================================

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type QuestionInputType = 'text' | 'voice' | 'multiple_choice';

export type ProgressStatus = 'in_progress' | 'completed';

// ============================================
// Insert Types (for creating new records)
// ============================================

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;

export type ModuleInsert = Omit<Module, 'id' | 'created_at' | 'updated_at'>;

export type SectionInsert = Omit<Section, 'id' | 'created_at' | 'updated_at'>;

export type QuizInsert = Omit<Quiz, 'id' | 'created_at' | 'updated_at'>;

export type QuizResultInsert = Omit<QuizResult, 'id' | 'created_at'>;

export type UserModuleProgressInsert = Omit<UserModuleProgress, 'id' | 'started_at'>;

// ============================================
// Update Types (for partial updates)
// ============================================

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;

export type ModuleUpdate = Partial<Omit<Module, 'id' | 'created_at' | 'updated_at'>>;

export type SectionUpdate = Partial<Omit<Section, 'id' | 'created_at' | 'updated_at'>>;

export type QuizUpdate = Partial<Omit<Quiz, 'id' | 'created_at' | 'updated_at'>>;

export type UserModuleProgressUpdate = Partial<Omit<UserModuleProgress, 'id' | 'user_id' | 'module_id' | 'started_at'>>;

// ============================================
// Joined Types (for queries with relations)
// ============================================

export interface ModuleWithSections extends Module {
  sections: Section[];
}

export interface SectionWithQuiz extends Section {
  quiz: Quiz | null;
}

export interface ModuleWithSectionsAndQuizzes extends Module {
  sections: SectionWithQuiz[];
}

export interface QuizResultWithQuiz extends QuizResult {
  quiz: Quiz;
}

export interface UserModuleProgressWithModule extends UserModuleProgress {
  module: Module;
}

// ============================================
// Supabase Database Type
// ============================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      modules: {
        Row: Module
        Insert: ModuleInsert
        Update: ModuleUpdate
      }
      sections: {
        Row: Section
        Insert: SectionInsert
        Update: SectionUpdate
      }
      quizzes: {
        Row: Quiz
        Insert: QuizInsert
        Update: QuizUpdate
      }
      quiz_results: {
        Row: QuizResult
        Insert: QuizResultInsert
        Update: never
      }
      user_module_progress: {
        Row: UserModuleProgress
        Insert: UserModuleProgressInsert
        Update: UserModuleProgressUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      difficulty: Difficulty
      question_input_type: QuestionInputType
      progress_status: ProgressStatus
    }
  }
}
