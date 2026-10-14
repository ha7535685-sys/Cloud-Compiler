import path from 'path';
import fs from 'fs';
import os from 'os';
import { Pool } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface SnippetRecord {
  id: string;
  language: string;
  code: string;
  stdin: string;
  createdAt: string;
}

// Database client abstraction supporting SQLite (local dev) and Postgres (Neon/Supabase)
interface DbAdapter {
  init(): Promise<void>;
  createSnippet(snippet: { id: string; language: string; code: string; stdin: string }): Promise<void>;
  findSnippetById(id: string): Promise<SnippetRecord | null>;
  close(): Promise<void>;
}

/**
 * In-Memory Adapter fallback for serverless/read-only environments
 */
class MemoryAdapter implements DbAdapter {
  private snippets = new Map<string, SnippetRecord>();

  async init(): Promise<void> {
    logger.info('In-Memory snippet database initialized successfully');
  }

  async createSnippet(snippet: { id: string; language: string; code: string; stdin: string }): Promise<void> {
    this.snippets.set(snippet.id, {
      id: snippet.id,
      language: snippet.language,
      code: snippet.code,
      stdin: snippet.stdin || '',
      createdAt: new Date().toISOString()
    });
  }

  async findSnippetById(id: string): Promise<SnippetRecord | null> {
    return this.snippets.get(id) || null;
  }

  async close(): Promise<void> {
    this.snippets.clear();
  }
}

/**
 * SQLite Adapter using Node.js built-in DatabaseSync
 */
class SqliteAdapter implements DbAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any = null;
  private dbPath: string;

  constructor(dbUrl: string) {
    if (dbUrl === ':memory:' || dbUrl === 'file::memory:') {
      this.dbPath = ':memory:';
    } else {
      const cleanPath = dbUrl.replace(/^file:/, '');
      const baseDir = process.env.VERCEL ? os.tmpdir() : process.cwd();
      this.dbPath = path.resolve(baseDir, path.basename(cleanPath));
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch {}
      }
    }
  }

  async init(): Promise<void> {
    try {
      // Dynamic require of node:sqlite
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DatabaseSync } = require('node:sqlite');
      this.db = new DatabaseSync(this.dbPath);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS snippets (
          id TEXT PRIMARY KEY,
          language TEXT NOT NULL,
          code TEXT NOT NULL,
          stdin TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      logger.info('SQLite database initialized successfully', { path: this.dbPath });
    } catch (err) {
      logger.error('Failed to initialize SQLite database', { error: String(err) });
      throw err;
    }
  }

  async createSnippet(snippet: { id: string; language: string; code: string; stdin: string }): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO snippets (id, language, code, stdin, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(snippet.id, snippet.language, snippet.code, snippet.stdin || '');
  }

  async findSnippetById(id: string): Promise<SnippetRecord | null> {
    const stmt = this.db.prepare(`
      SELECT id, language, code, stdin, created_at as createdAt
      FROM snippets
      WHERE id = ?
    `);
    const row = stmt.get(id);
    if (!row) return null;
    return {
      id: row.id,
      language: row.language,
      code: row.code,
      stdin: row.stdin,
      createdAt: row.createdAt
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
  }
}

/**
 * PostgreSQL Adapter for Neon / Supabase in Production
 */
class PostgresAdapter implements DbAdapter {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
    });
  }

  async init(): Promise<void> {
    try {
      const client = await this.pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS snippets (
            id VARCHAR(16) PRIMARY KEY,
            language VARCHAR(32) NOT NULL,
            code TEXT NOT NULL,
            stdin TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
        logger.info('Postgres database initialized successfully');
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error('Failed to connect to PostgreSQL database', { error: String(err) });
      throw err;
    }
  }

  async createSnippet(snippet: { id: string; language: string; code: string; stdin: string }): Promise<void> {
    await this.pool.query(
      `INSERT INTO snippets (id, language, code, stdin) VALUES ($1, $2, $3, $4)`,
      [snippet.id, snippet.language, snippet.code, snippet.stdin || '']
    );
  }

  async findSnippetById(id: string): Promise<SnippetRecord | null> {
    const res = await this.pool.query(
      `SELECT id, language, code, stdin, created_at as "createdAt" FROM snippets WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      language: row.language,
      code: row.code,
      stdin: row.stdin,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString()
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Singleton adapter resolution
let activeAdapter: DbAdapter | null = null;

export async function getDb(): Promise<DbAdapter> {
  if (activeAdapter) return activeAdapter;

  const dbUrl = env.DATABASE_URL;
  if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
    activeAdapter = new PostgresAdapter(dbUrl);
  } else {
    try {
      activeAdapter = new SqliteAdapter(dbUrl);
      await activeAdapter.init();
      return activeAdapter;
    } catch (err) {
      logger.warn('SQLite unavailable or failed to initialize, falling back to MemoryAdapter', { error: String(err) });
      activeAdapter = new MemoryAdapter();
    }
  }

  await activeAdapter.init();
  return activeAdapter;
}

export function setDbAdapterOverride(adapter: DbAdapter | null): void {
  activeAdapter = adapter;
}
