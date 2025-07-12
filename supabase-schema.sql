-- FWJ Contest Progress Tweeter Database Schema for Supabase
-- Execute this SQL in your Supabase SQL Editor

-- Enable Row Level Security
ALTER TABLE IF EXISTS posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS status_options DISABLE ROW LEVEL SECURITY;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS status_options;

-- Create posts table
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    contest_name VARCHAR(255) NOT NULL,
    status VARCHAR(100) NOT NULL,
    message TEXT,
    posted BOOLEAN DEFAULT FALSE,
    tweet_id VARCHAR(255),
    tweet_text TEXT,
    tweeted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create status_options table
CREATE TABLE status_options (
    id BIGSERIAL PRIMARY KEY,
    status VARCHAR(255) NOT NULL UNIQUE,
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_posted ON posts(posted);
CREATE INDEX idx_posts_contest_name ON posts(contest_name);
CREATE INDEX idx_posts_tweeted_at ON posts(tweeted_at DESC);
CREATE INDEX idx_status_options_status ON status_options(status);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default status options
INSERT INTO status_options (status, memo) VALUES
    ('開始', ''),
    ('進行中', ''),
    ('終了', ''),
    ('延期', ''),
    ('中止', '');

-- Disable Row Level Security for public access
-- Note: In production, you may want to enable RLS and set appropriate policies
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE status_options DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to anon role
GRANT ALL ON posts TO anon;
GRANT ALL ON status_options TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Verification queries (optional - you can run these to check the setup)
-- SELECT 'Posts table created' as status, count(*) as record_count FROM posts;
-- SELECT 'Status options table created' as status, count(*) as record_count FROM status_options;