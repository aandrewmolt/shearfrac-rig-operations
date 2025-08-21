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
  console.error('Run: VITE_TURSO_DATABASE_URL="your-url" VITE_TURSO_AUTH_TOKEN="your-token" node scripts/addEquipment.js');
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

async function addEquipment() {
  console.log('🚀 Adding equipment to Turso database...');
  
  try {
    // First, let's check if we have the equipment types
    const types = await turso.execute('SELECT * FROM equipment_types');
    console.log(`Found ${types.rows.length} equipment types`);
    
    // Check for storage location
    const locations = await turso.execute('SELECT * FROM storage_locations WHERE is_default = 1');
    const defaultLocation = locations.rows[0];
    
    if (!defaultLocation) {
      console.error('No default storage location found!');
      process.exit(1);
    }
    
    console.log(`Using default location: ${defaultLocation.name}`);
    
    // Define all equipment to create
    const equipmentToCreate = [
      // ShearStream boxes (SS001-SS015)
      ...Array.from({ length: 15 }, (_, i) => ({
        equipment_id: `SS${String(i + 1).padStart(3, '0')}`,
        name: `ShearStream Box SS${String(i + 1).padStart(3, '0')}`,
        type_id: 'shearstream-box'
      })),
      
      // Starlink units (SL01-SL15)
      ...Array.from({ length: 15 }, (_, i) => ({
        equipment_id: `SL${String(i + 1).padStart(2, '0')}`,
        name: `Starlink SL${String(i + 1).padStart(2, '0')}`,
        type_id: 'starlink'
      })),
      
      // Customer Tablets (CT01-CT10)
      ...Array.from({ length: 10 }, (_, i) => ({
        equipment_id: `CT${String(i + 1).padStart(2, '0')}`,
        name: `Customer Tablet CT${String(i + 1).padStart(2, '0')}`,
        type_id: 'customer-tablet'
      })),
      
      // Customer Computers (CC01-CC15)
      ...Array.from({ length: 15 }, (_, i) => ({
        equipment_id: `CC${String(i + 1).padStart(2, '0')}`,
        name: `Customer Computer CC${String(i + 1).padStart(2, '0')}`,
        type_id: 'customer-computer'
      }))
    ];
    
    console.log(`\n🔧 Creating ${equipmentToCreate.length} individual equipment items...`);
    
    let created = 0;
    let skipped = 0;
    
    for (const equipment of equipmentToCreate) {
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipment.equipment_id,
            equipment.name,
            equipment.type_id,
            defaultLocation.id,
            'available',
            'storage',
            'Added via script'
          ]
        });
        console.log(`✅ Created: ${equipment.equipment_id}`);
        created++;
      } catch (error) {
        if (error.message.includes('UNIQUE')) {
          console.log(`⚠️  Already exists: ${equipment.equipment_id}`);
          skipped++;
        } else {
          console.error(`❌ Error creating ${equipment.equipment_id}:`, error.message);
        }
      }
    }
    
    console.log(`\n📊 Summary: Created ${created} items, skipped ${skipped} existing items`);
    
    // Now handle cables and other equipment as individual items
    console.log('\n🔌 Creating cable and gauge equipment...');
    
    const cableAndGaugeEquipment = [
      // 100ft Cables
      ...Array.from({ length: 10 }, (_, i) => ({
        equipment_id: `C100-${String(i + 1).padStart(3, '0')}`,
        name: `100ft Cable C100-${String(i + 1).padStart(3, '0')}`,
        type_id: '100ft-cable'
      })),
      // 200ft Cables
      ...Array.from({ length: 10 }, (_, i) => ({
        equipment_id: `C200-${String(i + 1).padStart(3, '0')}`,
        name: `200ft Cable C200-${String(i + 1).padStart(3, '0')}`,
        type_id: '200ft-cable'
      })),
      // 300ft Old Cables
      ...Array.from({ length: 10 }, (_, i) => ({
        equipment_id: `C300O-${String(i + 1).padStart(3, '0')}`,
        name: `300ft Cable (Old) C300O-${String(i + 1).padStart(3, '0')}`,
        type_id: '300ft-cable-old'
      })),
      // 300ft New Cables
      ...Array.from({ length: 10 }, (_, i) => ({
        equipment_id: `C300N-${String(i + 1).padStart(3, '0')}`,
        name: `300ft Cable (New) C300N-${String(i + 1).padStart(3, '0')}`,
        type_id: '300ft-cable-new'
      })),
      // Y-Adapters
      ...Array.from({ length: 10 }, (_, i) => ({
        equipment_id: `YA-${String(i + 1).padStart(3, '0')}`,
        name: `Y-Adapter YA-${String(i + 1).padStart(3, '0')}`,
        type_id: 'y-adapter'
      })),
      // 1502 Pressure Gauges
      ...Array.from({ length: 20 }, (_, i) => ({
        equipment_id: `PG1502-${String(i + 1).padStart(3, '0')}`,
        name: `1502 Pressure Gauge PG1502-${String(i + 1).padStart(3, '0')}`,
        type_id: 'pressure-gauge-1502'
      })),
      // Pencil Gauges
      ...Array.from({ length: 20 }, (_, i) => ({
        equipment_id: `PGP-${String(i + 1).padStart(3, '0')}`,
        name: `Pencil Gauge PGP-${String(i + 1).padStart(3, '0')}`,
        type_id: 'pressure-gauge-pencil'
      }))
    ];
    
    let cableCreated = 0;
    let cableSkipped = 0;
    
    for (const equipment of cableAndGaugeEquipment) {
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipment.equipment_id,
            equipment.name,
            equipment.type_id,
            defaultLocation.id,
            'available',
            'storage',
            'Added via script'
          ]
        });
        console.log(`✅ Created: ${equipment.equipment_id}`);
        cableCreated++;
      } catch (error) {
        if (error.message.includes('UNIQUE')) {
          console.log(`⚠️  Already exists: ${equipment.equipment_id}`);
          cableSkipped++;
        } else {
          console.error(`❌ Error creating ${equipment.equipment_id}:`, error.message);
        }
      }
    }
    
    console.log(`\n📊 Cable/Gauge Summary: Created ${cableCreated} items, skipped ${cableSkipped} existing items`);
    console.log('\n🎉 Equipment addition complete!');
    
    // Show final counts
    const individualCount = await turso.execute('SELECT COUNT(*) as count FROM individual_equipment');
    
    console.log(`\n📈 Final inventory:`);
    console.log(`   - Total individual equipment items: ${individualCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
addEquipment().then(() => process.exit(0));