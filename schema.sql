-- Sports Contest Tweeter Database Schema

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    contest_name VARCHAR(255) NOT NULL,
    status VARCHAR(100) NOT NULL,
    message TEXT,
    posted BOOLEAN DEFAULT FALSE,
    tweet_id VARCHAR(255),
    tweet_text TEXT,
    tweeted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Status options table (from CSV uploads)
CREATE TABLE IF NOT EXISTS status_options (
    id SERIAL PRIMARY KEY,
    status VARCHAR(255) NOT NULL UNIQUE,
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_posted ON posts(posted);
CREATE INDEX IF NOT EXISTS idx_status_options_status ON status_options(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();