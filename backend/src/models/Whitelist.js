const { pool } = require('../config/database');

class Whitelist {
    static async getAll() {
        const result = await pool.query(
            'SELECT * FROM whitelist ORDER BY domain ASC'
        );
        return result.rows;
    }

    static async add(domain, description = '') {
        const result = await pool.query(
            'INSERT INTO whitelist (domain, description) VALUES ($1, $2) RETURNING *',
            [domain, description]
        );
        return result.rows[0];
    }

    static async delete(id) {
        await pool.query('DELETE FROM whitelist WHERE id = $1', [id]);
    }

    static async exists(domain) {
        const result = await pool.query(
            'SELECT id FROM whitelist WHERE LOWER(domain) = LOWER($1)',
            [domain]
        );
        return result.rows.length > 0;
    }
}

module.exports = Whitelist;
