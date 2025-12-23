# TutorTalk Data Model

This document describes the database schema for the TutorTalk personalized tutor app.

## Overview

The app uses Supabase for authentication and database. The data model consists of:

- **profiles** - User profile data (extends Supabase Auth)
- **modules** - 5-minute learning units
- **sections** - Parts of a module with learning content
- **quizzes** - Questions for each section (text/voice/multiple choice)
- **quiz_results** - User responses and scores
- **user_module_progress** - Track module completion

## Entity Relationship Diagram

```
profiles (User)
    |
    +--< user_module_progress >-- modules
    |                               |
    +--< quiz_results              sections
             |                      |
             +--------> quizzes ----+
```

---

## Tables

### profiles

Extends Supabase Auth user with app-specific data.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, references auth.users(id) ON DELETE CASCADE |
| email | text | NOT NULL |
| display_name | text | |
| avatar_url | text | |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

---

### modules

A 5-minute learning unit on a specific topic.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| title | text | NOT NULL |
| description | text | NOT NULL |
| topic | text | NOT NULL |
| difficulty | text | NOT NULL, CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) |
| estimated_duration_mins | integer | NOT NULL, DEFAULT 5 |
| thumbnail_url | text | |
| is_published | boolean | DEFAULT false |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

---

### sections

A part of a module containing learning content.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| module_id | uuid | FK references modules(id) ON DELETE CASCADE |
| title | text | NOT NULL |
| content | text | NOT NULL |
| order_index | integer | NOT NULL |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

**Indexes:**
- `(module_id, order_index)` UNIQUE

---

### quizzes

Questions attached to a section. One quiz per section.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| section_id | uuid | FK references sections(id) ON DELETE CASCADE, UNIQUE |
| title | text | NOT NULL |
| questions | jsonb | NOT NULL, DEFAULT '[]' |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

**questions JSONB structure:**
```json
[
  {
    "id": "uuid",
    "question_text": "What is the Spanish word for hello?",
    "input_type": "text | voice | multiple_choice",
    "options": ["Hola", "Adios", "Gracias"],
    "correct_answer": "Hola",
    "order_index": 0
  }
]
```

---

### quiz_results

Stores user responses and scores.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| user_id | uuid | FK references profiles(id) ON DELETE CASCADE |
| quiz_id | uuid | FK references quizzes(id) ON DELETE CASCADE |
| score | integer | NOT NULL, CHECK (score >= 0 AND score <= 100) |
| answers | jsonb | NOT NULL, DEFAULT '[]' |
| completed_at | timestamptz | NOT NULL |
| created_at | timestamptz | DEFAULT now() |

**answers JSONB structure:**
```json
[
  {
    "question_id": "uuid",
    "user_response": "Hola",
    "is_correct": true
  }
]
```

**Indexes:**
- `(user_id, quiz_id)` for lookup

---

### user_module_progress

Tracks which modules a user has started/completed.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| user_id | uuid | FK references profiles(id) ON DELETE CASCADE |
| module_id | uuid | FK references modules(id) ON DELETE CASCADE |
| status | text | NOT NULL, CHECK (status IN ('in_progress', 'completed')) |
| current_section_index | integer | NOT NULL, DEFAULT 0 |
| started_at | timestamptz | DEFAULT now() |
| completed_at | timestamptz | |

**Indexes:**
- `(user_id, module_id)` UNIQUE

---

## Row Level Security (RLS)

Enable RLS on all tables. Example policies:

```sql
-- profiles: users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- modules: all authenticated users can read published modules
CREATE POLICY "Anyone can view published modules"
  ON modules FOR SELECT
  USING (is_published = true);

-- quiz_results: users can only access their own results
CREATE POLICY "Users can view own quiz results"
  ON quiz_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz results"
  ON quiz_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## Triggers

### Auto-update `updated_at` timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Auto-create profile on signup (with OAuth support)

When a user signs up (email/password or social login), a profile is automatically created. For social logins (Google, GitHub, etc.), the name and avatar are pulled from the OAuth provider:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',  -- Google
      NEW.raw_user_meta_data ->> 'name',       -- GitHub
      NEW.raw_user_meta_data ->> 'user_name'   -- Other providers
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url', -- GitHub
      NEW.raw_user_meta_data ->> 'picture'     -- Google
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```
