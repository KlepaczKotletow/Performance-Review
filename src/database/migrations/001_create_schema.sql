-- Create workspaces table for storing Slack workspace installations
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id VARCHAR(255) UNIQUE NOT NULL,
  team_name VARCHAR(255),
  bot_token TEXT NOT NULL,
  bot_user_id VARCHAR(255),
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table for storing Slack user information
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  slack_user_id VARCHAR(255) NOT NULL,
  slack_email VARCHAR(255),
  slack_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- 'user', 'manager', 'hr', 'admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, slack_user_id)
);

-- Create templates table for review question templates
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  questions JSONB NOT NULL, -- Array of question objects
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create review_cycles table for tracking review cycles
CREATE TABLE IF NOT EXISTS review_cycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES users(id), -- Person being reviewed
  manager_id UUID REFERENCES users(id), -- Manager
  template_id UUID REFERENCES templates(id),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  due_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  summary TEXT, -- AI-generated summary
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create participants table for tracking who needs to provide feedback
CREATE TABLE IF NOT EXISTS participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_cycle_id UUID REFERENCES review_cycles(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id), -- Person providing feedback
  role VARCHAR(50) NOT NULL, -- 'self', 'manager', 'peer'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_cycle_id, reviewer_id)
);

-- Create feedback table for storing feedback responses
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  review_cycle_id UUID REFERENCES review_cycles(id) ON DELETE CASCADE,
  question_id VARCHAR(255) NOT NULL, -- Reference to question in template
  question_text TEXT NOT NULL,
  response TEXT NOT NULL,
  rating INTEGER, -- Optional rating (1-5, etc.)
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create continuous_feedback table for ad-hoc feedback
CREATE TABLE IF NOT EXISTS continuous_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id) NOT NULL,
  message TEXT NOT NULL,
  feedback_type VARCHAR(50) DEFAULT 'general', -- 'general', 'praise', 'improvement', 'question'
  is_anonymous BOOLEAN DEFAULT false,
  slack_message_ts VARCHAR(255), -- Reference to Slack message if from message action
  slack_channel_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_workspace_slack_id ON users(workspace_id, slack_user_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_workspace ON review_cycles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_employee ON review_cycles(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_status ON review_cycles(status);
CREATE INDEX IF NOT EXISTS idx_participants_cycle ON participants(review_cycle_id);
CREATE INDEX IF NOT EXISTS idx_participants_reviewer ON participants(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_feedback_cycle ON feedback(review_cycle_id);
CREATE INDEX IF NOT EXISTS idx_continuous_feedback_to_user ON continuous_feedback(to_user_id);
CREATE INDEX IF NOT EXISTS idx_continuous_feedback_workspace ON continuous_feedback(workspace_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_cycles_updated_at BEFORE UPDATE ON review_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
