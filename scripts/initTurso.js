import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Create Turso client - in Node.js we use process.env
const turso = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.VITE_TURSO_AUTH_TOKEN,
});

async function createSchema() {
  console.log('🔨 Creating database schema...');
  
  try {
    // Users table (for simple auth)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Equipment Types table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS equipment_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        requires_individual_tracking BOOLEAN DEFAULT FALSE,
        default_id_prefix TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Storage Locations table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS storage_locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Equipment Items table (bulk inventory)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS equipment_items (
        id TEXT PRIMARY KEY,
        type_id TEXT NOT NULL,
        location_id TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        status TEXT DEFAULT 'available',
        job_id TEXT,
        notes TEXT,
        red_tag_reason TEXT,
        red_tag_photo TEXT,
        location_type TEXT DEFAULT 'storage',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (type_id) REFERENCES equipment_types(id),
        FOREIGN KEY (location_id) REFERENCES storage_locations(id)
      )
    `);

    // Individual Equipment table (tracked items)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS individual_equipment (
        id TEXT PRIMARY KEY,
        equipment_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type_id TEXT NOT NULL,
        location_id TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        job_id TEXT,
        serial_number TEXT,
        purchase_date DATE,
        warranty_expiry DATE,
        notes TEXT,
        red_tag_reason TEXT,
        red_tag_photo TEXT,
        location_type TEXT DEFAULT 'storage',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (type_id) REFERENCES equipment_types(id),
        FOREIGN KEY (location_id) REFERENCES storage_locations(id)
      )
    `);

    // Jobs table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        well_count INTEGER DEFAULT 0,
        has_wellside_gauge BOOLEAN DEFAULT FALSE,
        nodes TEXT,
        edges TEXT,
        company_computer_names TEXT,
        equipment_assignment TEXT,
        equipment_allocated BOOLEAN DEFAULT FALSE,
        main_box_name TEXT,
        satellite_name TEXT,
        wellside_gauge_name TEXT,
        selected_cable_type TEXT DEFAULT 'default_cable',
        frac_baud_rate TEXT DEFAULT 'RS485-19200',
        gauge_baud_rate TEXT DEFAULT 'RS232-38400',
        frac_com_port TEXT DEFAULT 'COM1',
        gauge_com_port TEXT DEFAULT 'COM2',
        enhanced_config TEXT,
        photos TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Job Photos table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS job_photos (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        section_label TEXT NOT NULL,
        photo_url TEXT NOT NULL,
        caption TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await turso.execute('CREATE INDEX IF NOT EXISTS idx_equipment_items_type ON equipment_items(type_id)');
    await turso.execute('CREATE INDEX IF NOT EXISTS idx_equipment_items_location ON equipment_items(location_id)');
    await turso.execute('CREATE INDEX IF NOT EXISTS idx_individual_equipment_type ON individual_equipment(type_id)');
    await turso.execute('CREATE INDEX IF NOT EXISTS idx_individual_equipment_location ON individual_equipment(location_id)');
    await turso.execute('CREATE INDEX IF NOT EXISTS idx_job_photos_job ON job_photos(job_id)');

    console.log('✅ Database schema created successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to create schema:', error);
    throw error;
  }
}

// Default equipment types
const DEFAULT_EQUIPMENT_TYPES = [
  {
    id: 'shearstream-box',
    name: 'ShearStream Box',
    category: 'control-units',
    description: 'ShearStream control box for well operations',
    requires_individual_tracking: true,
    default_id_prefix: 'SS'
  },
  {
    id: 'customer-tablet',
    name: 'Customer Tablet',
    category: 'it-equipment',
    description: 'Tablet for customer use',
    requires_individual_tracking: true,
    default_id_prefix: 'CT'
  },
  {
    id: 'starlink',
    name: 'Starlink',
    category: 'it-equipment',
    description: 'Starlink satellite internet equipment',
    requires_individual_tracking: true,
    default_id_prefix: 'SL'
  },
  {
    id: 'customer-computer',
    name: 'Customer Computer',
    category: 'it-equipment',
    description: 'Desktop computer for customer use',
    requires_individual_tracking: true,
    default_id_prefix: 'CC'
  },
  {
    id: '100ft-cable',
    name: '100ft Cable',
    category: 'cables',
    description: '100-foot data/power cable',
    requires_individual_tracking: false
  },
  {
    id: '200ft-cable',
    name: '200ft Cable',
    category: 'cables',
    description: '200-foot data/power cable',
    requires_individual_tracking: false
  },
  {
    id: '300ft-cable-old',
    name: '300ft Cable (Old)',
    category: 'cables',
    description: 'Older model 300-foot cable',
    requires_individual_tracking: false
  },
  {
    id: '300ft-cable-new',
    name: '300ft Cable (New)',
    category: 'cables',
    description: 'New model 300-foot cable',
    requires_individual_tracking: false
  },
  {
    id: 'direct-connection',
    name: 'Direct',
    category: 'cables',
    description: 'Direct connection (no cable)',
    requires_individual_tracking: false
  },
  {
    id: 'y-adapter',
    name: 'Y-Adapter',
    category: 'adapters',
    description: 'Y-shaped adapter for splitting pressure connections',
    requires_individual_tracking: false
  },
  {
    id: 'pressure-gauge-1502',
    name: '1502 Pressure Gauge',
    category: 'gauges',
    description: '1502 pressure gauge for well monitoring',
    requires_individual_tracking: false
  },
  {
    id: 'pressure-gauge-pencil',
    name: 'Pencil Gauge',
    category: 'gauges',
    description: 'Pencil pressure gauge for well monitoring',
    requires_individual_tracking: false
  }
];

// Default storage locations
const DEFAULT_LOCATIONS = [
  {
    id: 'midland-office',
    name: 'Midland Office',
    address: 'Midland, TX',
    is_default: true
  },
  {
    id: 'houston-warehouse',
    name: 'Houston Warehouse',
    address: 'Houston, TX',
    is_default: false
  }
];

function generateUUID() {
  // Simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function initializeData() {
  console.log('🚀 Initializing Turso database...');
  
  try {
    // Create schema first
    await createSchema();
    
    // Create equipment types
    console.log('📦 Creating equipment types...');
    for (const type of DEFAULT_EQUIPMENT_TYPES) {
      try {
        await turso.execute({
          sql: `INSERT INTO equipment_types 
                (id, name, category, description, requires_individual_tracking, default_id_prefix) 
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            type.id,
            type.name,
            type.category,
            type.description,
            type.requires_individual_tracking ? 1 : 0,
            type.default_id_prefix || null
          ]
        });
        console.log(`✅ Created equipment type: ${type.name}`);
      } catch (error) {
        if (error.message.includes('UNIQUE')) {
          console.log(`⚠️ Equipment type already exists: ${type.name}`);
        } else {
          throw error;
        }
      }
    }
    
    // Create storage locations
    console.log('🏢 Creating storage locations...');
    for (const location of DEFAULT_LOCATIONS) {
      try {
        await turso.execute({
          sql: 'INSERT INTO storage_locations (id, name, address, is_default) VALUES (?, ?, ?, ?)',
          args: [location.id, location.name, location.address, location.is_default ? 1 : 0]
        });
        console.log(`✅ Created location: ${location.name}`);
      } catch (error) {
        if (error.message.includes('UNIQUE')) {
          console.log(`⚠️ Location already exists: ${location.name}`);
        } else {
          throw error;
        }
      }
    }
    
    // Create individual equipment
    console.log('🔧 Creating individual equipment items...');
    
    // ShearStream boxes (SS001-SS015)
    for (let i = 1; i <= 15; i++) {
      const equipmentId = `SS${String(i).padStart(3, '0')}`;
      const name = `ShearStream Box ${equipmentId}`;
      
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipmentId,
            name,
            'shearstream-box',
            'midland-office',
            'available',
            'storage',
            'Initial inventory setup'
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
    
    // Customer Tablets (CT01-CT10)
    for (let i = 1; i <= 10; i++) {
      const equipmentId = `CT${String(i).padStart(2, '0')}`;
      const name = `Customer Tablet ${equipmentId}`;
      
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipmentId,
            name,
            'customer-tablet',
            'midland-office',
            'available',
            'storage',
            'Initial inventory setup'
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
    
    // Starlink units (SL01-SL15)
    for (let i = 1; i <= 15; i++) {
      const equipmentId = `SL${String(i).padStart(2, '0')}`;
      const name = `Starlink ${equipmentId}`;
      
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipmentId,
            name,
            'starlink',
            'midland-office',
            'available',
            'storage',
            'Initial inventory setup'
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
    
    // Customer Computers (CC01-CC10)
    for (let i = 1; i <= 10; i++) {
      const equipmentId = `CC${String(i).padStart(2, '0')}`;
      const name = `Customer Computer ${equipmentId}`;
      
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipmentId,
            name,
            'customer-computer',
            'midland-office',
            'available',
            'storage',
            'Initial inventory setup'
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
    
    // Create cable and gauge equipment
    console.log('🔌 Creating cable and gauge equipment...');
    
    // 100ft Cables (C100-001 to C100-010)
    for (let i = 1; i <= 10; i++) {
      const equipmentId = `C100-${String(i).padStart(3, '0')}`;
      const name = `100ft Cable ${equipmentId}`;
      
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipmentId,
            name,
            '100ft-cable',
            'midland-office',
            'available',
            'storage',
            'Initial inventory setup'
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
    
    // 200ft Cables (C200-001 to C200-010)
    for (let i = 1; i <= 10; i++) {
      const equipmentId = `C200-${String(i).padStart(3, '0')}`;
      const name = `200ft Cable ${equipmentId}`;
      
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipmentId,
            name,
            '200ft-cable',
            'midland-office',
            'available',
            'storage',
            'Initial inventory setup'
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
    
    // 300ft Old Cables (C300O-001 to C300O-010)
    for (let i = 1; i <= 10; i++) {
      const equipmentId = `C300O-${String(i).padStart(3, '0')}`;
      const name = `300ft Cable (Old) ${equipmentId}`;
      
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipmentId,
            name,
            '300ft-cable-old',
            'midland-office',
            'available',
            'storage',
            'Initial inventory setup'
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
    
    // 300ft New Cables (C300N-001 to C300N-010)
    for (let i = 1; i <= 10; i++) {
      const equipmentId = `C300N-${String(i).padStart(3, '0')}`;
      const name = `300ft Cable (New) ${equipmentId}`;
      
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipmentId,
            name,
            '300ft-cable-new',
            'midland-office',
            'available',
            'storage',
            'Initial inventory setup'
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
    
    // Y-Adapters (YA-001 to YA-010)
    for (let i = 1; i <= 10; i++) {
      const equipmentId = `YA-${String(i).padStart(3, '0')}`;
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
            'midland-office',
            'available',
            'storage',
            'Initial inventory setup'
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
    
    // 1502 Pressure Gauges (PG1502-001 to PG1502-020)
    for (let i = 1; i <= 20; i++) {
      const equipmentId = `PG1502-${String(i).padStart(3, '0')}`;
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
            'midland-office',
            'available',
            'storage',
            'Initial inventory setup'
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
    
    // Pencil Gauges (PGP-001 to PGP-020)
    for (let i = 1; i <= 20; i++) {
      const equipmentId = `PGP-${String(i).padStart(3, '0')}`;
      const name = `Pencil Gauge ${equipmentId}`;
      
      try {
        await turso.execute({
          sql: `INSERT INTO individual_equipment 
                (id, equipment_id, name, type_id, location_id, status, location_type, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateUUID(),
            equipmentId,
            name,
            'pressure-gauge-pencil',
            'midland-office',
            'available',
            'storage',
            'Initial inventory setup'
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
    
    console.log('🎉 Turso database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeData();