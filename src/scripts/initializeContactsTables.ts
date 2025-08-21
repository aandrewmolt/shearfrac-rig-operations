import { createSchema } from '@/lib/turso/schema';

async function initializeContactsTables() {
  console.log('🚀 Initializing contacts tables in Turso...');
  
  try {
    await createSchema();
    console.log('✅ Contacts tables created successfully!');
    console.log('The system will automatically migrate existing contacts from localStorage on first load.');
  } catch (error) {
    console.error('❌ Failed to initialize contacts tables:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeContactsTables();
}