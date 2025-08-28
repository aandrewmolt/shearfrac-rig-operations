#!/usr/bin/env node

/**
 * Run Turso migrations
 * Usage: node scripts/run-migrations.js
 */

import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const turso = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
});

async function runMigrations() {
  console.log('🚀 Running Turso migrations...');
  
  try {
    // Create equipment_sync_log table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS equipment_sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipment_id TEXT NOT NULL,
        action TEXT NOT NULL,
        changes TEXT,
        job_id TEXT,
        synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        resolution TEXT
      )
    `);
    console.log('✅ Created equipment_sync_log table');

    // Create indexes
    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_equipment_sync_equipment ON equipment_sync_log(equipment_id)
    `);
    console.log('✅ Created equipment_id index');

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_equipment_sync_job ON equipment_sync_log(job_id)
    `);
    console.log('✅ Created job_id index');

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_equipment_sync_time ON equipment_sync_log(synced_at)
    `);
    console.log('✅ Created synced_at index');

    // Verify the table was created
    const tables = await turso.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='equipment_sync_log'
    `);
    
    if (tables.rows.length > 0) {
      console.log('✅ Migration completed successfully!');
      
      // Show table structure
      const columns = await turso.execute(`
        PRAGMA table_info(equipment_sync_log)
      `);
      console.log('\n📋 Table structure:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}`);
      });
    } else {
      console.error('❌ Table creation may have failed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();