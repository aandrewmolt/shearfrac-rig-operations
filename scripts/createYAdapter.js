import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const turso = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN,
});

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function createYAdapter() {
  console.log('🚀 Creating Y-Adapter equipment type and inventory...');
  
  try {
    // Create Y-Adapter equipment type
    console.log('\n📦 Creating Y-Adapter equipment type...');
    await turso.execute({
      sql: `INSERT INTO equipment_types 
            (id, name, category, description, requires_individual_tracking, default_id_prefix) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        'y-adapter',
        'Y-Adapter',
        'cables',
        'Y-shaped adapter for splitting cable connections',
        false,  // Not individually tracked
        null
      ]
    });
    console.log('✅ Created Y-Adapter equipment type');
    
    // Get default location
    const locations = await turso.execute('SELECT * FROM storage_locations WHERE is_default = 1');
    const defaultLocation = locations.rows[0];
    
    console.log(`\n🏢 Using location: ${defaultLocation.name}`);
    
    // Create individual Y-Adapter items
    console.log('\n🔌 Creating Y-Adapter individual items...');
    
    // Find the highest existing YA number
    const existingAdapters = await turso.execute({
      sql: "SELECT equipment_id FROM individual_equipment WHERE equipment_id LIKE 'YA-%' ORDER BY equipment_id DESC LIMIT 1"
    });
    
    let startNumber = 1;
    if (existingAdapters.rows.length > 0) {
      const lastId = existingAdapters.rows[0].equipment_id;
      const match = lastId.match(/YA-(\d+)/);
      if (match) {
        startNumber = parseInt(match[1]) + 1;
      }
    }
    
    // Create 10 individual Y-Adapter items
    for (let i = 0; i < 10; i++) {
      const equipmentId = `YA-${String(startNumber + i).padStart(3, '0')}`;
      const name = `Y-Adapter ${equipmentId}`;
      
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipmentId,
            name,
            'y-adapter',
            defaultLocation.id,
            'available',
            'storage',
            'Y-Adapters for cable splitting'
          ]
        });
        console.log(`✅ Created: ${equipmentId}`);
      } catch (error) {
        if (error.message.includes('UNIQUE')) {
          console.log(`⚠️ Equipment already exists: ${equipmentId}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n🎉 Y-Adapter creation complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createYAdapter().then(() => process.exit(0));