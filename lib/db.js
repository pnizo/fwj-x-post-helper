const { createClient } = require('@supabase/supabase-js');

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize database - Supabase tables should be created via SQL editor
async function initializeDatabase() {
  try {
    // Test connection
    const { data, error } = await supabase.from('posts').select('id').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      console.error('Database connection error:', error);
      return;
    }
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Posts operations
const postsDB = {
  async getAll() {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async create(postData) {
    const { contestName, status, message } = postData;
    const { data, error } = await supabase
      .from('posts')
      .insert({
        contest_name: contestName,
        status: status,
        message: message || ''
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async updateTweetInfo(id, tweetId, tweetText) {
    const { data, error } = await supabase
      .from('posts')
      .update({
        posted: true,
        tweet_id: tweetId,
        tweet_text: tweetText,
        tweeted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async findLatestPostedByContest(contestName, excludeId = null) {
    let query = supabase
      .from('posts')
      .select('*')
      .eq('contest_name', contestName)
      .eq('posted', true)
      .not('tweet_id', 'is', null)
      .order('tweeted_at', { ascending: false })
      .limit(1);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query;
    
    if (error && error.code !== 'PGRST116') throw error;
    return data && data.length > 0 ? data[0] : null;
  }
};

// Status options operations
const statusOptionsDB = {
  async getAll() {
    const { data, error } = await supabase
      .from('status_options')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || [];
  },

  async clear() {
    const { error } = await supabase
      .from('status_options')
      .delete()
      .neq('id', 0); // Delete all records
    
    if (error) throw error;
  },

  async createMany(statusOptions) {
    // Clear existing options first
    await this.clear();
    
    // Insert new options
    if (statusOptions.length > 0) {
      const { error } = await supabase
        .from('status_options')
        .insert(statusOptions.map(option => ({
          status: option.status,
          memo: option.memo
        })));
      
      if (error) throw error;
    }
  }
};

module.exports = {
  initializeDatabase,
  postsDB,
  statusOptionsDB
};