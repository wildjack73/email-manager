const { pool } = require('../config/database');

class Keyword {
    static async getAll() {
        const result = await pool.query(
            'SELECT * FROM keywords ORDER BY keyword ASC'
        );
        return result.rows;
    }

    static async add(keyword, caseSensitive = false) {
        const result = await pool.query(
            'INSERT INTO keywords (keyword, case_sensitive) VALUES ($1, $2) RETURNING *',
            [keyword, caseSensitive]
        );
        return result.rows[0];
    }

    static async delete(id) {
        await pool.query('DELETE FROM keywords WHERE id = $1', [id]);
    }

    static async exists(keyword) {
        const result = await pool.query(
            'SELECT id FROM keywords WHERE keyword = $1',
            [keyword]
        );
        return result.rows.length > 0;
    }
}

module.exports = Keyword;
