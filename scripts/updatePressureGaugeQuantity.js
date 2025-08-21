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

async function addMorePressureGauges() {
  console.log('🚀 Adding more individual Pressure Gauges...');
  
  try {
    // Get default location
    const locations = await turso.execute('SELECT * FROM storage_locations WHERE is_default = 1');
    const defaultLocation = locations.rows[0];
    
    // Count existing pressure gauges
    const existingGauges = await turso.execute({
      sql: "SELECT COUNT(*) as count FROM individual_equipment WHERE type_id = 'pressure-gauge-1502'"
    });
    
    const currentCount = existingGauges.rows[0].count;
    console.log(`📊 Current 1502 Pressure Gauge count: ${currentCount}`);
    
    // If we have less than 20, add more to reach 20
    if (currentCount < 20) {
      const toAdd = 20 - currentCount;
      console.log(`📦 Adding ${toAdd} more pressure gauges to reach 20 total...`);
      
      // Find the highest existing PG1502 number
      const lastGauge = await turso.execute({
        sql: "SELECT equipment_id FROM individual_equipment WHERE equipment_id LIKE 'PG1502-%' ORDER BY equipment_id DESC LIMIT 1"
      });
      
      let startNumber = currentCount + 1;
      if (lastGauge.rows.length > 0) {
        const lastId = lastGauge.rows[0].equipment_id;
        const match = lastId.match(/PG1502-(\d+)/);
        if (match) {
          startNumber = parseInt(match[1]) + 1;
        }
      }
      
      // Create additional gauge items
      for (let i = 0; i < toAdd; i++) {
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
              'Additional pressure gauges for multiple jobs'
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
    } else {
      console.log('✅ Already have 20 or more pressure gauges');
    }
    
    console.log('\n📊 This quantity is enough for:');
    console.log('   - A single job with up to 20 wells');
    console.log('   - A job with 19 wells + 1 wellside gauge');
    console.log('   - Multiple smaller jobs running concurrently');
    
    // Show final count
    const finalCount = await turso.execute({
      sql: "SELECT COUNT(*) as count FROM individual_equipment WHERE type_id = 'pressure-gauge-1502'"
    });
    
    console.log(`\n✅ Total 1502 Pressure Gauges: ${finalCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addMorePressureGauges().then(() => process.exit(0));