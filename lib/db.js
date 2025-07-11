const { sql } = require('@vercel/postgres');

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create posts table
    await sql`
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
      )
    `;

    // Create status_options table
    await sql`
      CREATE TABLE IF NOT EXISTS status_options (
        id SERIAL PRIMARY KEY,
        status VARCHAR(255) NOT NULL UNIQUE,
        memo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_posted ON posts(posted)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_status_options_status ON status_options(status)`;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Posts operations
const postsDB = {
  async getAll() {
    const result = await sql`
      SELECT * FROM posts 
      ORDER BY created_at DESC
    `;
    return result.rows;
  },

  async create(postData) {
    const { contestName, status, message } = postData;
    const result = await sql`
      INSERT INTO posts (contest_name, status, message)
      VALUES (${contestName}, ${status}, ${message || ''})
      RETURNING *
    `;
    return result.rows[0];
  },

  async findById(id) {
    const result = await sql`
      SELECT * FROM posts WHERE id = ${id}
    `;
    return result.rows[0];
  },

  async updateTweetInfo(id, tweetId, tweetText) {
    const result = await sql`
      UPDATE posts 
      SET posted = true, tweet_id = ${tweetId}, tweet_text = ${tweetText}, tweeted_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
    return result.rows[0];
  },

  async findLatestPostedByContest(contestName, excludeId = null) {
    let result;
    
    if (excludeId) {
      result = await sql`
        SELECT * FROM posts 
        WHERE contest_name = ${contestName} 
        AND posted = true 
        AND tweet_id IS NOT NULL
        AND id != ${excludeId}
        ORDER BY tweeted_at DESC
        LIMIT 1
      `;
    } else {
      result = await sql`
        SELECT * FROM posts 
        WHERE contest_name = ${contestName} 
        AND posted = true 
        AND tweet_id IS NOT NULL
        ORDER BY tweeted_at DESC
        LIMIT 1
      `;
    }
    
    return result.rows[0];
  }
};

// Status options operations
const statusOptionsDB = {
  async getAll() {
    const result = await sql`
      SELECT * FROM status_options 
      ORDER BY created_at ASC
    `;
    return result.rows;
  },

  async clear() {
    await sql`DELETE FROM status_options`;
  },

  async createMany(statusOptions) {
    // Clear existing options first
    await this.clear();
    
    // Insert new options
    for (const option of statusOptions) {
      await sql`
        INSERT INTO status_options (status, memo)
        VALUES (${option.status}, ${option.memo})
        ON CONFLICT (status) DO UPDATE SET memo = ${option.memo}
      `;
    }
  }
};

module.exports = {
  initializeDatabase,
  postsDB,
  statusOptionsDB
};