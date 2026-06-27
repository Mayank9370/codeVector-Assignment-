// ─────────────────────────────────────────────────────────────
// Database Schema Runner
// ─────────────────────────────────────────────────────────────
//
// Reads the schema.sql file and executes it against the PostgreSQL database.
// This handles schema migrations programmatically.
// ─────────────────────────────────────────────────────────────

import { db } from '../config';
import * as fs from 'fs';
import * as path from 'path';

async function runSchema() {
  // eslint-disable-next-line no-console
  console.log('⏳ Connecting to database to apply schema...');
  const sqlPath = path.join(__dirname, 'schema.sql');
  
  if (!fs.existsSync(sqlPath)) {
    // eslint-disable-next-line no-console
    console.error(`🔴 Schema file not found at: ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    // eslint-disable-next-line no-console
    console.log('🚀 Executing SQL queries inside schema.sql...');
    await db.query(sql);
    // eslint-disable-next-line no-console
    console.log('✅ Database schema and composite indexes applied successfully!');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('🔴 Failed to apply schema queries:', error);
    process.exit(1);
  } finally {
    // Cleanly close the pool to exit the process
    await db.end();
  }
}

runSchema();
