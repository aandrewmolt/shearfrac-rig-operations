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

async function addYAdapters() {
  console.log('🚀 Adding Y-Adapters to inventory...');
  
  try {
    // First, let's find Y-adapter equipment types
    const types = await turso.execute("SELECT * FROM equipment_types WHERE name LIKE '%Y%' OR name LIKE '%y%'");
    console.log(`\nFound ${types.rows.length} Y-related equipment types:`);
    types.rows.forEach(type => {
      console.log(`  - ${type.name} (${type.id})`);
    });
    
    // Get default location
    const locations = await turso.execute('SELECT * FROM storage_locations WHERE is_default = 1');
    const defaultLocation = locations.rows[0];
    
    if (!defaultLocation) {
      console.error('No default storage location found!');
      process.exit(1);
    }
    
    console.log(`\nUsing location: ${defaultLocation.name}`);
    
    // Add inventory for each Y-adapter type
    for (const type of types.rows) {
      console.log(`\n🔌 Processing ${type.name}...`);
      
      // Check if inventory already exists
      const existing = await turso.execute({
        sql: 'SELECT * FROM equipment_items WHERE type_id = ? AND location_id = ?',
        args: [type.id, defaultLocation.id]
      });
      
      if (existing.rows.length > 0) {
        // Update quantity to 10
        await turso.execute({
          sql: 'UPDATE equipment_items SET quantity = 10 WHERE id = ?',
          args: [existing.rows[0].id]
        });
        console.log(`✅ Updated ${type.name} quantity to 10`);
      } else {
        // Create new inventory with 10 units
        await turso.execute({
          sql: `INSERT INTO equipment_items 
                (id, type_id, location_id, quantity, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            type.id,
            defaultLocation.id,
            10,
            'available',
            'storage',
            'Y-Adapter inventory'
          ]
        });
        console.log(`✅ Created ${type.name} inventory with quantity 10`);
      }
    }
    
    // Show final Y-adapter inventory
    const yInventory = await turso.execute({
      sql: `SELECT et.name, ei.quantity 
            FROM equipment_items ei 
            JOIN equipment_types et ON ei.type_id = et.id 
            WHERE et.name LIKE '%Y%' OR et.name LIKE '%y%'`,
      args: []
    });
    
    console.log('\n📈 Final Y-adapter inventory:');
    yInventory.rows.forEach(item => {
      console.log(`   - ${item.name}: ${item.quantity} units`);
    });
    
    console.log('\n🎉 Y-Adapter inventory update complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
addYAdapters().then(() => process.exit(0));