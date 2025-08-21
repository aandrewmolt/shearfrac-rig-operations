import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Get credentials from environment
const DATABASE_URL = process.env.VITE_TURSO_DATABASE_URL;
const AUTH_TOKEN = process.env.VITE_TURSO_AUTH_TOKEN;

if (!DATABASE_URL || !AUTH_TOKEN) {
  console.error('Please provide VITE_TURSO_DATABASE_URL and VITE_TURSO_AUTH_TOKEN environment variables');
  process.exit(1);
}

const turso = createClient({
  url: DATABASE_URL,
  authToken: AUTH_TOKEN,
});

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function addYConnector() {
  console.log('🚀 Adding Y-Connector to database...');
  
  try {
    // First, add Y-Connector as equipment type
    console.log('📦 Creating Y-Connector equipment type...');
    try {
      await turso.execute({
        sql: `INSERT INTO equipment_types 
              (id, name, category, description, requires_individual_tracking, default_id_prefix) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          'y-connector',
          'Y-Connector',
          'cables',
          'Y-shaped cable connector for splitting connections',
          false,  // Not individually tracked
          null
        ]
      });
      console.log('✅ Created Y-Connector equipment type');
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        console.log('⚠️ Y-Connector equipment type already exists');
      } else {
        throw error;
      }
    }
    
    // Get default location
    const locations = await turso.execute('SELECT * FROM storage_locations WHERE is_default = 1');
    const defaultLocation = locations.rows[0];
    
    if (!defaultLocation) {
      console.error('No default storage location found!');
      process.exit(1);
    }
    
    // Add Y-Connector inventory
    console.log('\n🔌 Adding Y-Connector inventory...');
    
    // Check if Y-Connector inventory already exists
    const existing = await turso.execute({
      sql: 'SELECT * FROM equipment_items WHERE type_id = ? AND location_id = ?',
      args: ['y-connector', defaultLocation.id]
    });
    
    if (existing.rows.length > 0) {
      // Update quantity to 10
      await turso.execute({
        sql: 'UPDATE equipment_items SET quantity = 10 WHERE id = ?',
        args: [existing.rows[0].id]
      });
      console.log('✅ Updated Y-Connector quantity to 10');
    } else {
      // Create new inventory with 10 units
      await turso.execute({
        sql: `INSERT INTO equipment_items 
              (id, type_id, location_id, quantity, status, location_type, notes) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          generateUUID(),
          'y-connector',
          defaultLocation.id,
          10,
          'available',
          'storage',
          'Y-Connectors for cable splitting'
        ]
      });
      console.log('✅ Created Y-Connector inventory with quantity 10');
    }
    
    // Show final counts
    const yConnectorCount = await turso.execute({
      sql: 'SELECT quantity FROM equipment_items WHERE type_id = ?',
      args: ['y-connector']
    });
    
    console.log(`\n📈 Y-Connector inventory: ${yConnectorCount.rows[0]?.quantity || 0} units`);
    console.log('🎉 Y-Connector addition complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
addYConnector().then(() => process.exit(0));