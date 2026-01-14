const { pool } = require('../config/database');

class ProcessedEmail {
  static async getAll(limit = 50, offset = 0) {
    // Ensuring limit and offset are safe integers
    const safeLimit = parseInt(limit) || 50;
    const safeOffset = parseInt(offset) || 0;

    const result = await pool.query(
      `SELECT * FROM processed_emails 
       ORDER BY processed_at DESC 
       LIMIT ${safeLimit} OFFSET ${safeOffset}`
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

    const stats = result.rows[0];
    // Ensure numbers are returned as integers, handle nulls from SUM
    return {
      total: parseInt(stats.total) || 0,
      spam_count: parseInt(stats.spam_count) || 0,
      useless_count: parseInt(stats.useless_count) || 0,
      important_count: parseInt(stats.important_count) || 0,
      deleted_count: parseInt(stats.deleted_count) || 0,
      kept_count: parseInt(stats.kept_count) || 0
    };
  }

  static async getRecentActivity(days = 7) {
    const safeDays = parseInt(days) || 7;
    const result = await pool.query(`
      SELECT
        DATE(processed_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN action_taken = 'DELETED' THEN 1 ELSE 0 END) as deleted
      FROM processed_emails
      WHERE processed_at >= NOW() - INTERVAL '${safeDays} days'
      GROUP BY DATE(processed_at)
      ORDER BY date DESC
    `);
    return result.rows;
  }

  /**
   * Clean up old deleted emails from database
   * @param {number} days - Delete emails older than this many days (default 7)
   * @returns {number} Number of emails deleted
   */
  static async cleanupDeletedEmails(days = 7) {
    const safeDays = parseInt(days) || 7;
    const result = await pool.query(`
      DELETE FROM processed_emails
      WHERE action_taken = 'DELETED'
        AND processed_at < NOW() - INTERVAL '${safeDays} days'
    `);
    return result.rowCount || 0;
  }
}

module.exports = ProcessedEmail;
