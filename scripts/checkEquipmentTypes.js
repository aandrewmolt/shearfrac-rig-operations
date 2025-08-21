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

async function checkTypes() {
  const types = await turso.execute('SELECT * FROM equipment_types ORDER BY category, name');
  console.log('\n📦 All Equipment Types:');
  console.log('========================');
  
  let currentCategory = '';
  types.rows.forEach(type => {
    if (type.category !== currentCategory) {
      currentCategory = type.category;
      console.log(`\n[${currentCategory}]`);
    }
    console.log(`  - ${type.name} (ID: ${type.id})`);
  });
  
  console.log('\n\nLooking for Y-adapter specifically...');
  const yTypes = await turso.execute({
    sql: "SELECT * FROM equipment_types WHERE LOWER(name) LIKE '%adapter%' OR LOWER(name) LIKE '%splitter%' OR id LIKE '%y%'",
    args: []
  });
  
  if (yTypes.rows.length > 0) {
    console.log('\nFound potential Y-adapter types:');
    yTypes.rows.forEach(type => {
      console.log(`  - ${type.name} (ID: ${type.id})`);
    });
  } else {
    console.log('\n❌ No Y-adapter equipment type found!');
  }
}

checkTypes().then(() => process.exit(0));