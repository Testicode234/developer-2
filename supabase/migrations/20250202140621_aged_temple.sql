/*
  # Initial Database Schema

  1. New Tables
    - users
      - id (uuid, primary key)
      - email (text, unique)
      - full_name (text)
      - user_type (enum: 'client', 'developer')
      - avatar_url (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - projects
      - id (uuid, primary key)
      - title (text)
      - description (text)
      - client_id (uuid, references users)
      - budget_min (numeric)
      - budget_max (numeric)
      - status (enum: 'draft', 'open', 'in_progress', 'completed', 'cancelled')
      - deadline (timestamp)
      - created_at (timestamp)
      - updated_at (timestamp)

    - project_skills
      - project_id (uuid, references projects)
      - skill_name (text)
      - primary key (project_id, skill_name)

    - project_applications
      - id (uuid, primary key)
      - project_id (uuid, references projects)
      - developer_id (uuid, references users)
      - status (enum: 'pending', 'accepted', 'rejected')
      - cover_letter (text)
      - created_at (timestamp)

    - messages
      - id (uuid, primary key)
      - sender_id (uuid, references users)
      - receiver_id (uuid, references users)
      - content (text)
      - is_read (boolean)
      - created_at (timestamp)

    - payments
      - id (uuid, primary key)
      - project_id (uuid, references projects)
      - sender_id (uuid, references users)
      - receiver_id (uuid, references users)
      - amount (numeric)
      - status (enum: 'pending', 'completed', 'failed')
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
*/

-- Create enums
CREATE TYPE user_type AS ENUM ('client', 'developer');
CREATE TYPE project_status AS ENUM ('draft', 'open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  user_type user_type NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create projects table
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  client_id uuid REFERENCES users(id) NOT NULL,
  budget_min numeric NOT NULL,
  budget_max numeric NOT NULL,
  status project_status DEFAULT 'draft',
  deadline timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_skills table
CREATE TABLE project_skills (
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  PRIMARY KEY (project_id, skill_name)
);

-- Create project_applications table
CREATE TABLE project_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  developer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status application_status DEFAULT 'pending',
  cover_letter text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status payment_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Create policies for projects
CREATE POLICY "Anyone can view projects"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Clients can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() = client_id AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND user_type = 'client'
    )
  );

CREATE POLICY "Clients can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = client_id);

-- Create policies for project_skills
CREATE POLICY "Anyone can view project skills"
  ON project_skills FOR SELECT
  USING (true);

CREATE POLICY "Clients can manage project skills"
  ON project_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.client_id = auth.uid()
    )
  );

-- Create policies for project_applications
CREATE POLICY "Developers can view their applications"
  ON project_applications FOR SELECT
  USING (
    developer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.client_id = auth.uid()
    )
  );

CREATE POLICY "Developers can create applications"
  ON project_applications FOR INSERT
  WITH CHECK (
    developer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND user_type = 'developer'
    )
  );

-- Create policies for messages
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  USING (
    sender_id = auth.uid() OR
    receiver_id = auth.uid()
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Create policies for payments
CREATE POLICY "Users can view their payments"
  ON payments FOR SELECT
  USING (
    sender_id = auth.uid() OR
    receiver_id = auth.uid()
  );

CREATE POLICY "Users can create payments"
  ON payments FOR INSERT
  WITH CHECK (sender_id = auth.uid());