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

async function migrateBulkToIndividual() {
  console.log('🚀 Starting migration from bulk equipment to individual items...');
  
  try {
    // Get all equipment types
    const typesResult = await turso.execute('SELECT * FROM equipment_types');
    const equipmentTypes = typesResult.rows;
    const typeMap = new Map(
      equipmentTypes.map(type => [type.id, type])
    );
    
    // Get all bulk equipment items (excluding direct connections)
    const bulkResult = await turso.execute(`
      SELECT * FROM equipment_items 
      WHERE type_id != 'direct-connection' 
      AND quantity > 0
    `);
    const itemsToMigrate = bulkResult.rows;
    
    console.log(`📦 Found ${itemsToMigrate.length} bulk item groups to migrate`);
    
    let totalIndividualItemsCreated = 0;
    
    // Process each bulk item
    for (const bulkItem of itemsToMigrate) {
      const equipmentType = typeMap.get(bulkItem.type_id);
      if (!equipmentType) {
        console.error(`❌ Unknown equipment type: ${bulkItem.type_id}`);
        continue;
      }
      
      console.log(`\n📦 Migrating ${bulkItem.quantity}x ${equipmentType.name} from ${bulkItem.location_id}`);
      
      // Get existing individual items of this type to determine next ID
      const existingResult = await turso.execute({
        sql: 'SELECT * FROM individual_equipment WHERE type_id = ? ORDER BY equipment_id',
        args: [bulkItem.type_id]
      });
      const existingOfType = existingResult.rows;
      
      // Determine ID prefix
      let idPrefix = '';
      let startNumber = 1;
      
      switch (equipmentType.category) {
        case 'cables':
          if (equipmentType.name.includes('100ft')) idPrefix = 'C100-';
          else if (equipmentType.name.includes('200ft')) idPrefix = 'C200-';
          else if (equipmentType.name.includes('300ft') && equipmentType.name.includes('Old')) idPrefix = 'C300O-';
          else if (equipmentType.name.includes('300ft') && equipmentType.name.includes('New')) idPrefix = 'C300N-';
          break;
        case 'gauges':
          if (equipmentType.name.includes('1502')) idPrefix = 'PG1502-';
          else if (equipmentType.name.includes('Pencil')) idPrefix = 'PGP-';
          break;
        case 'adapters':
          if (equipmentType.name.includes('Y-Adapter')) idPrefix = 'YA-';
          else if (equipmentType.name.includes('Y-Connector')) idPrefix = 'YC-';
          break;
        default:
          idPrefix = equipmentType.default_id_prefix || 'EQ-';
      }
      
      // Find highest existing number for this prefix
      if (existingOfType.length > 0) {
        const numbers = existingOfType
          .map(item => {
            const match = item.equipment_id.match(/(\d+)$/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter(n => n > 0);
        
        if (numbers.length > 0) {
          startNumber = Math.max(...numbers) + 1;
        }
      }
      
      // Create individual items
      for (let i = 0; i < bulkItem.quantity; i++) {
        const equipmentNumber = startNumber + i;
        const equipmentId = `${idPrefix}${String(equipmentNumber).padStart(3, '0')}`;
        
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, job_id, notes, location_type) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipmentId,
            `${equipmentType.name} ${equipmentId}`,
            bulkItem.type_id,
            bulkItem.location_id,
            bulkItem.status || 'available',
            bulkItem.job_id || null,
            bulkItem.notes ? `${bulkItem.notes} (Migrated from bulk)` : 'Migrated from bulk inventory',
            bulkItem.location_type || 'storage'
          ]
        });
        
        console.log(`  ✅ Created ${equipmentId}`);
        totalIndividualItemsCreated++;
      }
      
      // Delete the bulk item after successful migration
      console.log(`  🗑️ Removing bulk item record...`);
      await turso.execute({
        sql: 'DELETE FROM equipment_items WHERE id = ?',
        args: [bulkItem.id]
      });
    }
    
    console.log(`\n✨ Migration complete!`);
    console.log(`  - Total individual items created: ${totalIndividualItemsCreated}`);
    console.log(`  - Bulk item records deleted: ${itemsToMigrate.length}`);
    
    // Verify final state
    const finalBulkResult = await turso.execute('SELECT * FROM equipment_items');
    const finalIndividualResult = await turso.execute('SELECT * FROM individual_equipment');
    
    console.log(`\n📊 Final inventory state:`);
    console.log(`  - Remaining bulk items: ${finalBulkResult.rows.length}`);
    console.log(`  - Total individual items: ${finalIndividualResult.rows.length}`);
    
    // Show breakdown by type
    const typeBreakdown = new Map();
    finalIndividualResult.rows.forEach(item => {
      const count = typeBreakdown.get(item.type_id) || 0;
      typeBreakdown.set(item.type_id, count + 1);
    });
    
    console.log(`\n📋 Individual items by type:`);
    for (const [typeId, count] of typeBreakdown.entries()) {
      const type = typeMap.get(typeId);
      console.log(`  - ${type?.name || typeId}: ${count}`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateBulkToIndividual()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });