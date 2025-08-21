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

async function addPressureGauge() {
  console.log('🚀 Adding 1502 Pressure Gauge to database...');
  
  try {
    // Create Pressure Gauge equipment type
    console.log('\n📦 Creating 1502 Pressure Gauge equipment type...');
    await turso.execute({
      sql: `INSERT INTO equipment_types 
            (id, name, category, description, requires_individual_tracking, default_id_prefix) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        'pressure-gauge-1502',
        '1502 Pressure Gauge',
        'gauges',
        'Pressure monitoring device for wellside operations',
        false,  // Not individually tracked
        null
      ]
    });
    console.log('✅ Created 1502 Pressure Gauge equipment type');
    
    // Get default location
    const locations = await turso.execute('SELECT * FROM storage_locations WHERE is_default = 1');
    const defaultLocation = locations.rows[0];
    
    console.log(`\n🏢 Using location: ${defaultLocation.name}`);
    
    // Create individual Pressure Gauge items
    console.log('\n🔌 Creating 1502 Pressure Gauge individual items...');
    
    // Find the highest existing PG1502 number
    const existingGauges = await turso.execute({
      sql: "SELECT equipment_id FROM individual_equipment WHERE equipment_id LIKE 'PG1502-%' ORDER BY equipment_id DESC LIMIT 1"
    });
    
    let startNumber = 1;
    if (existingGauges.rows.length > 0) {
      const lastId = existingGauges.rows[0].equipment_id;
      const match = lastId.match(/PG1502-(\d+)/);
      if (match) {
        startNumber = parseInt(match[1]) + 1;
      }
    }
    
    // Create 10 individual gauge items
    for (let i = 0; i < 10; i++) {
      const equipmentId = `PG1502-${String(startNumber + i).padStart(3, '0')}`;
      const name = `1502 Pressure Gauge ${equipmentId}`;
      
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipmentId,
            name,
            'pressure-gauge-1502',
            defaultLocation.id,
            'available',
            'storage',
            'Pressure gauges for wellside operations'
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
    
    console.log('\n🎉 Pressure Gauge creation complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addPressureGauge().then(() => process.exit(0));