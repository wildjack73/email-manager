const { pool } = require('../config/database');

class ProcessedEmail {
  static async getAll(limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM processed_emails 
       ORDER BY processed_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async getStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN classification = 'SPAM' THEN 1 ELSE 0 END) as spam_count,
        SUM(CASE WHEN classification = 'INUTILE' THEN 1 ELSE 0 END) as useless_count,
        SUM(CASE WHEN classification = 'IMPORTANT' THEN 1 ELSE 0 END) as important_count,
        SUM(CASE WHEN action_taken = 'DELETED' THEN 1 ELSE 0 END) as deleted_count,
        SUM(CASE WHEN action_taken = 'KEPT' THEN 1 ELSE 0 END) as kept_count
      FROM processed_emails
    `);
    return result.rows[0];
  }

  static async getRecentActivity(days = 7) {
    const result = await pool.query(`
      SELECT 
        DATE(processed_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN action_taken = 'DELETED' THEN 1 ELSE 0 END) as deleted
      FROM processed_emails
      WHERE processed_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(processed_at)
      ORDER BY date DESC
    `);
    return result.rows;
  }
}

module.exports = ProcessedEmail;
