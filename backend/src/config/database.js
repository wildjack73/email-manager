const path = require('path');
require('dotenv').config();

// Determine database type: 'postgres' (if DATABASE_URL is set) or 'sqlite' (default/fallback)
const isPostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://');

let pool;
let db; // Shared SQLite instance
let dbType = isPostgres ? 'postgres' : 'sqlite';

if (isPostgres) {
  const { Pool } = require('pg');
  console.log('🐘 Using PostgreSQL database (Railway)');

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Railway
    connectionTimeoutMillis: 10000,
    max: 20
  });

  // Test connection
  pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
  });

} else {
  const Database = require('better-sqlite3');
  console.log('✅ Using SQLite database (Local)');

  const dbPath = path.join(__dirname, '../../email_manager.db');
  db = new Database(dbPath); // Assign to outer variable

  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  // SQLite wrapper to mimic pg pool
  pool = {
    query: (text, params = []) => {
      try {
        // Convert Postgres $1, $2 syntax to SQLite ? syntax
        let sql = text;
        const sqliteParams = params;

        if (params.length > 0) {
          sql = sql.replace(/\$\d+/g, '?');
        }

        if (sql.trim().toLowerCase().startsWith('select')) {
          const stmt = db.prepare(sql);
          const rows = stmt.all(...sqliteParams);
          return Promise.resolve({ rows, rowCount: rows.length });
        } else {
          const stmt = db.prepare(sql);
          const info = stmt.run(...sqliteParams);
          return Promise.resolve({
            rows: [],
            rowCount: info.changes,
            lastID: info.lastInsertRowid
          });
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
  };
}

async function initDatabase() {
  const fs = require('fs');
  // Only load schema file if needed (for Postgres)
  // Logic inside try/catch handles usage

  console.log(`📊 Initializing ${dbType} database...`);

  try {
    if (isPostgres) {
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
    } else {
      // Use existing shared db instance
      db.exec(`
          CREATE TABLE IF NOT EXISTS processed_emails (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            message_id TEXT UNIQUE NOT NULL,
            from_email TEXT NOT NULL,
            subject TEXT,
            classification TEXT NOT NULL CHECK (classification IN ('SPAM', 'INUTILE', 'IMPORTANT')),
            claude_reasoning TEXT,
            action_taken TEXT NOT NULL CHECK (action_taken IN ('KEPT', 'DELETED')),
            processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_message_id ON processed_emails(message_id);
          CREATE INDEX IF NOT EXISTS idx_processed_at ON processed_emails(processed_at);
          CREATE INDEX IF NOT EXISTS idx_classification ON processed_emails(classification);

          CREATE TABLE IF NOT EXISTS whitelist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS keywords (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT NOT NULL,
            case_sensitive INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
       `);
    }
    console.log(`✅ ${dbType} database initialized`);
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    throw err;
  }
}

module.exports = { pool, initDatabase };
