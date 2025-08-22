import { turso } from '@/lib/turso/client';
import { v4 as uuidv4 } from 'uuid';
import type { EquipmentType, StorageLocation, IndividualEquipment, BulkEquipment } from '@/types/inventory';
import type { Node, Edge } from '@xyflow/react';

class TursoDatabase {
  // Helper to parse JSON fields
  private parseJson(value: unknown) {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  }

  // Helper to stringify JSON fields
  private stringifyJson(value: unknown) {
    if (!value) return null;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  // ==== USERS (Auth) ====
  async getUser(email: string) {
    const result = await turso.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    return result.rows[0] || null;
  }

  async createUser(email: string, name?: string) {
    const id = uuidv4();
    await turso.execute({
      sql: 'INSERT INTO users (id, email, name) VALUES (?, ?, ?)',
      args: [id, email, name || email.split('@')[0]]
    });
    return { id, email, name };
  }

  // ==== EQUIPMENT TYPES ====
  async getEquipmentTypes() {
    const result = await turso.execute('SELECT * FROM equipment_types ORDER BY name');
    return result.rows.map(row => ({
      ...row,
      requires_individual_tracking: true // All equipment now uses individual tracking
    }));
  }

  async createEquipmentType(type: Partial<EquipmentType> & { name: string; category: string }) {
    const id = type.id || uuidv4();
    await turso.execute({
      sql: `INSERT INTO equipment_types 
            (id, name, category, description, requires_individual_tracking, default_id_prefix) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        type.name,
        type.category,
        type.description || null,
        true, // All equipment now uses individual tracking
        type.default_id_prefix || type.defaultIdPrefix || null
      ]
    });
    return { ...type, id };
  }

  async updateEquipmentType(id: string, updates: Partial<EquipmentType>) {
    await turso.execute({
      sql: `UPDATE equipment_types 
            SET name = ?, category = ?, description = ?, 
                requires_individual_tracking = ?, default_id_prefix = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        updates.name,
        updates.category,
        updates.description || null,
        true, // All equipment now uses individual tracking
        updates.default_id_prefix || updates.defaultIdPrefix || null,
        id
      ]
    });
    return this.getEquipmentTypeById(id);
  }

  async deleteEquipmentType(id: string) {
    await turso.execute({
      sql: 'DELETE FROM equipment_types WHERE id = ?',
      args: [id]
    });
  }

  async getEquipmentTypeById(id: string) {
    const result = await turso.execute({
      sql: 'SELECT * FROM equipment_types WHERE id = ?',
      args: [id]
    });
    return result.rows[0] || null;
  }

  // ==== STORAGE LOCATIONS ====
  async getStorageLocations() {
    const result = await turso.execute('SELECT * FROM storage_locations ORDER BY name');
    return result.rows.map(row => ({
      ...row,
      is_default: Boolean(row.is_default)
    }));
  }

  async createStorageLocation(location: Partial<StorageLocation> & { name: string }) {
    const id = location.id || uuidv4();
    
    // If this is set as default, unset other defaults first
    if (location.is_default || location.isDefault) {
      await turso.execute('UPDATE storage_locations SET is_default = FALSE');
    }
    
    await turso.execute({
      sql: 'INSERT INTO storage_locations (id, name, address, is_default) VALUES (?, ?, ?, ?)',
      args: [
        id,
        location.name,
        location.address || null,
        location.is_default || location.isDefault || false
      ]
    });
    return { ...location, id };
  }

  async updateStorageLocation(id: string, updates: Partial<StorageLocation>) {
    // If setting as default, unset other defaults first
    if (updates.is_default || updates.isDefault) {
      await turso.execute('UPDATE storage_locations SET is_default = FALSE WHERE id != ?', [id]);
    }
    
    await turso.execute({
      sql: `UPDATE storage_locations 
            SET name = ?, address = ?, is_default = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        updates.name,
        updates.address || null,
        updates.is_default || updates.isDefault || false,
        id
      ]
    });
    return this.getStorageLocationById(id);
  }

  async deleteStorageLocation(id: string) {
    await turso.execute({
      sql: 'DELETE FROM storage_locations WHERE id = ?',
      args: [id]
    });
  }

  async getStorageLocationById(id: string) {
    const result = await turso.execute({
      sql: 'SELECT * FROM storage_locations WHERE id = ?',
      args: [id]
    });
    return result.rows[0] || null;
  }


  // ==== INDIVIDUAL EQUIPMENT ====
  async getIndividualEquipment() {
    const result = await turso.execute('SELECT * FROM individual_equipment ORDER BY equipment_id');
    return result.rows;
  }

  async createIndividualEquipment(equipment: Partial<IndividualEquipment> & { equipmentId: string; equipmentTypeId: string; storageLocationId: string }) {
    const id = equipment.id || uuidv4();
    await turso.execute({
      sql: `INSERT INTO individual_equipment 
            (id, equipment_id, name, type_id, location_id, status, job_id, 
             serial_number, purchase_date, warranty_expiry, notes, 
             red_tag_reason, red_tag_photo, location_type) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        equipment.equipment_id || equipment.equipmentId,
        equipment.name,
        equipment.type_id || equipment.typeId,
        equipment.location_id || equipment.locationId,
        equipment.status || 'available',
        equipment.job_id || equipment.jobId || null,
        equipment.serial_number || equipment.serialNumber || null,
        equipment.purchase_date || equipment.purchaseDate || null,
        equipment.warranty_expiry || equipment.warrantyExpiry || null,
        equipment.notes || null,
        equipment.red_tag_reason || equipment.redTagReason || null,
        equipment.red_tag_photo || equipment.redTagPhoto || null,
        equipment.location_type || 'storage'
      ]
    });
    return { ...equipment, id };
  }

  async updateIndividualEquipment(id: string, updates: Partial<IndividualEquipment>) {
    // Get existing equipment to preserve current values
    const existing = await this.getIndividualEquipmentById(id);
    if (!existing) throw new Error('Individual equipment not found');
    
    await turso.execute({
      sql: `UPDATE individual_equipment 
            SET equipment_id = ?, name = ?, type_id = ?, location_id = ?, 
                status = ?, job_id = ?, serial_number = ?, purchase_date = ?, 
                warranty_expiry = ?, notes = ?, red_tag_reason = ?, 
                red_tag_photo = ?, location_type = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        updates.equipment_id ?? updates.equipmentId ?? existing.equipment_id,
        updates.name ?? existing.name,
        updates.type_id ?? updates.typeId ?? existing.type_id,
        updates.location_id ?? updates.locationId ?? existing.location_id,
        updates.status ?? existing.status,
        updates.job_id ?? updates.jobId ?? existing.job_id ?? null,
        updates.serial_number ?? updates.serialNumber ?? existing.serial_number ?? null,
        updates.purchase_date ?? updates.purchaseDate ?? existing.purchase_date ?? null,
        updates.warranty_expiry ?? updates.warrantyExpiry ?? existing.warranty_expiry ?? null,
        updates.notes ?? existing.notes ?? null,
        updates.red_tag_reason ?? updates.redTagReason ?? existing.red_tag_reason ?? null,
        updates.red_tag_photo ?? updates.redTagPhoto ?? existing.red_tag_photo ?? null,
        updates.location_type ?? existing.location_type ?? 'storage',
        id
      ]
    });
    return this.getIndividualEquipmentById(id);
  }

  async deleteIndividualEquipment(id: string) {
    await turso.execute({
      sql: 'DELETE FROM individual_equipment WHERE id = ?',
      args: [id]
    });
  }

  async getIndividualEquipmentById(id: string) {
    const result = await turso.execute({
      sql: 'SELECT * FROM individual_equipment WHERE id = ?',
      args: [id]
    });
    return result.rows[0] || null;
  }

  // ==== JOBS ====
  async getJobs() {
    const result = await turso.execute('SELECT * FROM jobs ORDER BY created_at DESC');
    return result.rows.map(row => ({
      ...row,
      has_wellside_gauge: Boolean(row.has_wellside_gauge),
      equipment_allocated: Boolean(row.equipment_allocated),
      nodes: this.parseJson(row.nodes) || [],
      edges: this.parseJson(row.edges) || [],
      company_computer_names: this.parseJson(row.company_computer_names) || {},
      equipment_assignment: this.parseJson(row.equipment_assignment) || {},
      enhanced_config: this.parseJson(row.enhanced_config) || {},
      photos: this.parseJson(row.photos) || [],
      status: row.status || 'pending',
      start_date: row.start_date || null,
      end_date: row.end_date || null
    }));
  }

  async createJob(job: Partial<{ id: string; name: string; client: string; well_count: number; has_wellside_gauge: boolean; nodes: Node[]; edges: Edge[]; company_computer_names: Record<string, string>; equipment_assignment: Record<string, unknown>; equipment_allocated: boolean; main_box_name: string; satellite_name: string; wellside_gauge_name: string; selected_cable_type: string; frac_baud_rate: string; gauge_baud_rate: string; frac_com_port: string; gauge_com_port: string; enhanced_config: Record<string, unknown>; photos: unknown[]; status: string; start_date: string; end_date: string }> & { name: string }) {
    const id = job.id || uuidv4();
    
    // Check for duplicate job names
    const existing = await turso.execute({
      sql: 'SELECT id FROM jobs WHERE name = ? AND id != ?',
      args: [job.name, id]
    });
    
    if (existing.rows.length > 0) {
      // Update existing job instead
      return this.updateJob(existing.rows[0].id as string, job);
    }
    
    await turso.execute({
      sql: `INSERT INTO jobs 
            (id, name, client, well_count, has_wellside_gauge, nodes, edges, 
             company_computer_names, equipment_assignment, equipment_allocated,
             main_box_name, satellite_name, wellside_gauge_name, 
             selected_cable_type, frac_baud_rate, gauge_baud_rate, 
             frac_com_port, gauge_com_port, enhanced_config, photos,
             status, start_date, end_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        job.name,
        job.client || null,
        job.wellCount || job.well_count || 0,
        job.hasWellsideGauge || job.has_wellside_gauge || false,
        this.stringifyJson(job.nodes),
        this.stringifyJson(job.edges),
        this.stringifyJson(job.companyComputerNames || job.company_computer_names),
        this.stringifyJson(job.equipmentAssignment || job.equipment_assignment),
        job.equipmentAllocated || job.equipment_allocated || false,
        job.mainBoxName || job.main_box_name || null,
        job.satelliteName || job.satellite_name || null,
        job.wellsideGaugeName || job.wellside_gauge_name || null,
        job.selectedCableType || job.selected_cable_type || 'default_cable',
        job.fracBaudRate || job.frac_baud_rate || 'RS485-19200',
        job.gaugeBaudRate || job.gauge_baud_rate || 'RS232-38400',
        job.fracComPort || job.frac_com_port || 'COM1',
        job.gaugeComPort || job.gauge_com_port || 'COM2',
        this.stringifyJson(job.enhancedConfig || job.enhanced_config),
        this.stringifyJson(job.photos),
        job.status || 'pending',
        job.start_date || job.startDate || null,
        job.end_date || job.endDate || null
      ]
    });
    return { ...job, id };
  }

  async updateJob(id: string, updates: Partial<{ name: string; client: string; well_count: number; has_wellside_gauge: boolean; nodes: Node[]; edges: Edge[]; company_computer_names: Record<string, string>; equipment_assignment: Record<string, unknown>; equipment_allocated: boolean; main_box_name: string; satellite_name: string; wellside_gauge_name: string; selected_cable_type: string; frac_baud_rate: string; gauge_baud_rate: string; frac_com_port: string; gauge_com_port: string; enhanced_config: Record<string, unknown>; photos: unknown[]; status: string; start_date: string; end_date: string }>) {
    await turso.execute({
      sql: `UPDATE jobs 
            SET name = ?, client = ?, well_count = ?, has_wellside_gauge = ?, 
                nodes = ?, edges = ?, company_computer_names = ?, 
                equipment_assignment = ?, equipment_allocated = ?,
                main_box_name = ?, satellite_name = ?, wellside_gauge_name = ?, 
                selected_cable_type = ?, frac_baud_rate = ?, gauge_baud_rate = ?, 
                frac_com_port = ?, gauge_com_port = ?, enhanced_config = ?, 
                photos = ?, status = ?, start_date = ?, end_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        updates.name,
        updates.client || null,
        updates.wellCount || updates.well_count || 0,
        updates.hasWellsideGauge || updates.has_wellside_gauge || false,
        this.stringifyJson(updates.nodes),
        this.stringifyJson(updates.edges),
        this.stringifyJson(updates.companyComputerNames || updates.company_computer_names),
        this.stringifyJson(updates.equipmentAssignment || updates.equipment_assignment),
        updates.equipmentAllocated || updates.equipment_allocated || false,
        updates.mainBoxName || updates.main_box_name || null,
        updates.satelliteName || updates.satellite_name || null,
        updates.wellsideGaugeName || updates.wellside_gauge_name || null,
        updates.selectedCableType || updates.selected_cable_type || 'default_cable',
        updates.fracBaudRate || updates.frac_baud_rate || 'RS485-19200',
        updates.gaugeBaudRate || updates.gauge_baud_rate || 'RS232-38400',
        updates.fracComPort || updates.frac_com_port || 'COM1',
        updates.gaugeComPort || updates.gauge_com_port || 'COM2',
        this.stringifyJson(updates.enhancedConfig || updates.enhanced_config),
        this.stringifyJson(updates.photos),
        updates.status || 'pending',
        updates.start_date || updates.startDate || null,
        updates.end_date || updates.endDate || null,
        id
      ]
    });
    return this.getJobById(id);
  }

  async deleteJob(id: string) {
    await turso.execute({
      sql: 'DELETE FROM jobs WHERE id = ?',
      args: [id]
    });
  }

  async getJobById(id: string) {
    const result = await turso.execute({
      sql: 'SELECT * FROM jobs WHERE id = ?',
      args: [id]
    });
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      has_wellside_gauge: Boolean(row.has_wellside_gauge),
      equipment_allocated: Boolean(row.equipment_allocated),
      nodes: this.parseJson(row.nodes) || [],
      edges: this.parseJson(row.edges) || [],
      company_computer_names: this.parseJson(row.company_computer_names) || {},
      equipment_assignment: this.parseJson(row.equipment_assignment) || {},
      enhanced_config: this.parseJson(row.enhanced_config) || {},
      photos: this.parseJson(row.photos) || [],
      status: row.status || 'pending',
      start_date: row.start_date || null,
      end_date: row.end_date || null
    };
  }

  // ==== JOB PHOTOS ====
  async getJobPhotos(jobId: string) {
    const result = await turso.execute({
      sql: 'SELECT * FROM job_photos WHERE job_id = ? ORDER BY section_label, sort_order',
      args: [jobId]
    });
    return result.rows;
  }

  async createJobPhoto(photo: any) {
    const id = photo.id || uuidv4();
    await turso.execute({
      sql: `INSERT INTO job_photos 
            (id, job_id, section_label, photo_url, caption, sort_order) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        photo.job_id || photo.jobId,
        photo.section_label || photo.sectionLabel,
        photo.photo_url || photo.photoUrl,
        photo.caption || null,
        photo.sort_order || photo.sortOrder || 0
      ]
    });
    return { ...photo, id };
  }

  async deleteJobPhoto(id: string) {
    await turso.execute({
      sql: 'DELETE FROM job_photos WHERE id = ?',
      args: [id]
    });
  }

  // ==== EQUIPMENT ITEMS (Bulk Equipment) ====
  async getEquipmentItems() {
    const result = await turso.execute('SELECT * FROM equipment_items ORDER BY type_id, location_id');
    return result.rows;
  }

  async createEquipmentItem(item: any) {
    const id = item.id || uuidv4();
    await turso.execute({
      sql: `INSERT INTO equipment_items 
            (id, type_id, location_id, quantity, status, job_id, notes, 
             red_tag_reason, red_tag_photo, location_type) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        item.type_id || item.typeId,
        item.location_id || item.locationId,
        item.quantity || 0,
        item.status || 'available',
        item.job_id || item.jobId || null,
        item.notes || null,
        item.red_tag_reason || item.redTagReason || null,
        item.red_tag_photo || item.redTagPhoto || null,
        item.location_type || 'storage'
      ]
    });
    return { ...item, id };
  }

  async updateEquipmentItem(id: string, updates: any) {
    const existing = await this.getEquipmentItemById(id);
    if (!existing) throw new Error('Equipment item not found');
    
    await turso.execute({
      sql: `UPDATE equipment_items 
            SET type_id = ?, location_id = ?, quantity = ?, status = ?, 
                job_id = ?, notes = ?, red_tag_reason = ?, red_tag_photo = ?, 
                location_type = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        updates.type_id ?? updates.typeId ?? existing.type_id,
        updates.location_id ?? updates.locationId ?? existing.location_id,
        updates.quantity ?? existing.quantity,
        updates.status ?? existing.status,
        updates.job_id ?? updates.jobId ?? existing.job_id ?? null,
        updates.notes ?? existing.notes ?? null,
        updates.red_tag_reason ?? updates.redTagReason ?? existing.red_tag_reason ?? null,
        updates.red_tag_photo ?? updates.redTagPhoto ?? existing.red_tag_photo ?? null,
        updates.location_type ?? existing.location_type ?? 'storage',
        id
      ]
    });
    return this.getEquipmentItemById(id);
  }

  async deleteEquipmentItem(id: string) {
    await turso.execute({
      sql: 'DELETE FROM equipment_items WHERE id = ?',
      args: [id]
    });
  }

  async getEquipmentItemById(id: string) {
    const result = await turso.execute({
      sql: 'SELECT * FROM equipment_items WHERE id = ?',
      args: [id]
    });
    return result.rows[0] || null;
  }

  // ==== EQUIPMENT (legacy compatibility) ====
  async getEquipment() {
    // Return only individual equipment
    return this.getIndividualEquipment();
  }

  async createEquipment(equipment: any) {
    // Route to individual equipment
    return this.createIndividualEquipment(equipment);
  }

  async updateEquipment(id: string, updates: any) {
    // Update individual equipment
    return this.updateIndividualEquipment(id, updates);
  }

  async deleteEquipment(id: string) {
    // Delete individual equipment
    await this.deleteIndividualEquipment(id);
  }

  // ==== MISSING METHODS ====
  async getJob(id: string) {
    return this.getJobById(id);
  }

  async getEquipmentDeployments() {
    const result = await turso.execute({
      sql: `SELECT bd.*, et.name as equipment_type_name, j.name as job_name, sl.name as location_name
            FROM bulk_equipment_deployments bd
            LEFT JOIN equipment_types et ON bd.equipment_type_id = et.id
            LEFT JOIN jobs j ON bd.job_id = j.id
            LEFT JOIN storage_locations sl ON bd.source_location_id = sl.id
            WHERE bd.status = 'deployed'
            ORDER BY bd.deployed_at DESC`,
      args: []
    });
    return result.rows;
  }

  async getDeploymentsForJob(jobId: string) {
    const result = await turso.execute({
      sql: `SELECT bd.*, et.name as equipment_type_name, sl.name as location_name
            FROM bulk_equipment_deployments bd
            LEFT JOIN equipment_types et ON bd.equipment_type_id = et.id
            LEFT JOIN storage_locations sl ON bd.source_location_id = sl.id
            WHERE bd.job_id = ? AND bd.status = 'deployed'
            ORDER BY bd.deployed_at DESC`,
      args: [jobId]
    });
    return result.rows;
  }

  async createEquipmentDeployment(deployment: any) {
    const id = deployment.id || uuidv4();
    const now = new Date().toISOString();
    
    await turso.execute({
      sql: `INSERT INTO bulk_equipment_deployments 
            (id, equipment_type_id, job_id, source_location_id, quantity, deployed_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        deployment.equipment_type_id,
        deployment.job_id,
        deployment.source_location_id,
        deployment.quantity,
        deployment.deployed_at || now,
        deployment.status || 'deployed'
      ]
    });
    
    return { ...deployment, id };
  }

  async updateEquipmentDeployment(id: string, updates: any) {
    const setClause: string[] = [];
    const args: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        setClause.push(`${key} = ?`);
        args.push(value);
      }
    });
    
    if (setClause.length > 0) {
      args.push(id);
      await turso.execute({
        sql: `UPDATE bulk_equipment_deployments SET ${setClause.join(', ')} WHERE id = ?`,
        args
      });
    }
    
    return { id, ...updates };
  }

  async returnEquipmentFromJob(deploymentId: string) {
    const now = new Date().toISOString();
    
    await turso.execute({
      sql: `UPDATE bulk_equipment_deployments 
            SET status = 'returned', returned_at = ? 
            WHERE id = ?`,
      args: [now, deploymentId]
    });
    
    // Get deployment details to update inventory
    const deployment = await turso.execute({
      sql: 'SELECT * FROM bulk_equipment_deployments WHERE id = ?',
      args: [deploymentId]
    });
    
    if (deployment.rows[0]) {
      const dep = deployment.rows[0];
      // Return quantity to source location
      await turso.execute({
        sql: `UPDATE equipment_items 
              SET quantity = quantity + ? 
              WHERE equipment_type_id = ? AND location_id = ?`,
        args: [dep.quantity, dep.equipment_type_id, dep.source_location_id]
      });
    }
  }

  async updateJobEquipment(jobId: string, equipment: any) {
    // Update job with equipment assignment
    const job = await this.getJobById(jobId);
    if (job) {
      await this.updateJob(jobId, {
        ...job,
        equipment_assignment: equipment,
        equipment_allocated: true
      });
    }
  }

  async getEquipmentByLocation(locationId: string) {
    // Get all equipment at a specific location
    const individualEquipment = await turso.execute({
      sql: 'SELECT * FROM individual_equipment WHERE location_id = ?',
      args: [locationId]
    });
    
    const equipmentItems = await turso.execute({
      sql: 'SELECT * FROM equipment_items WHERE location_id = ?',
      args: [locationId]
    });
    
    return {
      individual: individualEquipment.rows,
      items: equipmentItems.rows
    };
  }

  async getDeployedEquipmentByJob(jobId: string) {
    // Get all equipment deployed to a specific job
    const individualEquipment = await turso.execute({
      sql: 'SELECT * FROM individual_equipment WHERE job_id = ?',
      args: [jobId]
    });
    
    const equipmentItems = await turso.execute({
      sql: 'SELECT * FROM equipment_items WHERE job_id = ?',
      args: [jobId]
    });
    
    return {
      individual: individualEquipment.rows,
      items: equipmentItems.rows
    };
  }

  async updateEquipmentRedTagStatus(equipmentId: string, redTagInfo: any) {
    // Try to update individual equipment first
    try {
      await this.updateIndividualEquipment(equipmentId, {
        status: redTagInfo.status || 'red-tag',
        red_tag_reason: redTagInfo.reason,
        red_tag_photo: redTagInfo.photo
      });
    } catch {
      // If not found in individual, try equipment items
      await this.updateEquipmentItem(equipmentId, {
        status: redTagInfo.status || 'red-tag',
        red_tag_reason: redTagInfo.reason,
        red_tag_photo: redTagInfo.photo
      });
    }
  }

  async createStorageTransfer(transfer: any) {
    // TODO: Implement storage transfer creation
    return { ...transfer, id: uuidv4() };
  }

  async executeStorageTransfer(transferId: string) {
    // TODO: Implement storage transfer execution
  }

  async getStorageTransfers() {
    // TODO: Implement get storage transfers
    return [];
  }

  async getStorageTransfer(id: string) {
    // TODO: Implement get single storage transfer
    return null;
  }

  async cancelStorageTransfer(id: string) {
    // TODO: Implement cancel storage transfer
  }

  async initializeDatabase() {
    try {
      // Run the schema initialization
      const { initializeTursoSchema } = await import('@/lib/turso/schema');
      await initializeTursoSchema();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  // ==== BULK DEPLOYMENTS (for transactionWrapper compatibility) ====
  async createBulkDeployment(deployment: any) {
    const id = deployment.id || uuidv4();
    const now = new Date().toISOString();
    
    await turso.execute({
      sql: `INSERT INTO bulk_equipment_deployments 
            (id, equipment_type_id, job_id, source_location_id, quantity, deployed_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        deployment.equipment_type_id,
        deployment.job_id,
        deployment.source_location_id,
        deployment.quantity || 0,
        deployment.deployed_at || now,
        deployment.status || 'deployed'
      ]
    });
    
    return { ...deployment, id };
  }

  async updateBulkDeployment(id: string, updates: any) {
    const setClause: string[] = [];
    const args: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        setClause.push(`${key} = ?`);
        args.push(value);
      }
    });
    
    if (setClause.length > 0) {
      args.push(id);
      await turso.execute({
        sql: `UPDATE bulk_equipment_deployments SET ${setClause.join(', ')} WHERE id = ?`,
        args
      });
    }
    
    return { id, ...updates };
  }

  async deleteBulkDeployment(id: string) {
    await turso.execute({
      sql: 'DELETE FROM bulk_equipment_deployments WHERE id = ?',
      args: [id]
    });
  }

  // ==== CONTACTS MANAGEMENT ====
  async getContacts() {
    const result = await turso.execute('SELECT * FROM contacts ORDER BY name');
    return result.rows.map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data as string) : {}
    }));
  }

  async getContactById(id: string) {
    const result = await turso.execute({
      sql: 'SELECT * FROM contacts WHERE id = ?',
      args: [id]
    });
    
    if (result.rows.length === 0) return null;
    
    const contact = result.rows[0];
    return {
      ...contact,
      data: contact.data ? JSON.parse(contact.data as string) : {}
    };
  }

  async createContact(contact: any) {
    const id = contact.id || uuidv4();
    const now = new Date().toISOString();
    const additionalData: any = {};
    
    // Extract known fields and put rest in data
    const knownFields = ['id', 'type', 'name', 'email', 'phone', 'phone2', 'company', 
                        'rig', 'job_title', 'location', 'client_name', 'well_name', 'created_by'];
    
    Object.keys(contact).forEach(key => {
      if (!knownFields.includes(key) && key !== 'data') {
        additionalData[key] = contact[key];
      }
    });
    
    await turso.execute({
      sql: `INSERT INTO contacts 
            (id, type, name, email, phone, phone2, company, rig, job_title, 
             location, client_name, well_name, created_by, created_at, updated_at, data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        contact.type,
        contact.name,
        contact.email || null,
        contact.phone || null,
        contact.phone2 || null,
        contact.company || null,
        contact.rig || null,
        contact.job_title || null,
        contact.location || null,
        contact.client_name || null,
        contact.well_name || null,
        contact.created_by || null,
        now,
        now,
        Object.keys(additionalData).length > 0 ? JSON.stringify(additionalData) : null
      ]
    });
    
    return { ...contact, id };
  }

  async updateContact(id: string, updates: any) {
    const now = new Date().toISOString();
    const knownFields = ['type', 'name', 'email', 'phone', 'phone2', 'company', 
                        'rig', 'job_title', 'location', 'client_name', 'well_name'];
    
    const setClause: string[] = ['updated_at = ?'];
    const args: any[] = [now];
    const additionalData: any = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (knownFields.includes(key)) {
        setClause.push(`${key} = ?`);
        args.push(value);
      } else if (key !== 'id' && key !== 'created_at' && key !== 'created_by' && key !== 'data') {
        additionalData[key] = value;
      }
    });
    
    if (Object.keys(additionalData).length > 0) {
      setClause.push('data = ?');
      args.push(JSON.stringify(additionalData));
    }
    
    args.push(id);
    
    await turso.execute({
      sql: `UPDATE contacts SET ${setClause.join(', ')} WHERE id = ?`,
      args
    });
    
    return { id, ...updates };
  }

  async deleteContact(id: string) {
    await turso.execute({
      sql: 'DELETE FROM contacts WHERE id = ?',
      args: [id]
    });
  }

  async searchContacts(query: string) {
    const searchTerm = `%${query}%`;
    const result = await turso.execute({
      sql: `SELECT * FROM contacts 
            WHERE name LIKE ? OR email LIKE ? OR company LIKE ? 
            OR phone LIKE ? OR rig LIKE ? OR location LIKE ?
            ORDER BY name`,
      args: [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    });
    
    return result.rows.map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data as string) : {}
    }));
  }

  // ==== CONTACT COLUMN SETTINGS ====
  async getColumnSettings(contactType: string, userId?: string) {
    const result = await turso.execute({
      sql: 'SELECT * FROM contact_columns WHERE contact_type = ? AND (user_id = ? OR user_id IS NULL) ORDER BY user_id DESC LIMIT 1',
      args: [contactType, userId || null]
    });
    
    if (result.rows.length === 0) return null;
    
    return JSON.parse(result.rows[0].column_settings as string);
  }

  async saveColumnSettings(contactType: string, settings: any[], userId?: string) {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Try to update existing settings first
    const existing = await turso.execute({
      sql: 'SELECT id FROM contact_columns WHERE contact_type = ? AND user_id = ?',
      args: [contactType, userId || null]
    });
    
    if (existing.rows.length > 0) {
      await turso.execute({
        sql: 'UPDATE contact_columns SET column_settings = ?, updated_at = ? WHERE id = ?',
        args: [JSON.stringify(settings), now, existing.rows[0].id]
      });
    } else {
      await turso.execute({
        sql: `INSERT INTO contact_columns (id, contact_type, column_settings, user_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, contactType, JSON.stringify(settings), userId || null, now, now]
      });
    }
    
    return settings;
  }

  // ==== CUSTOM CONTACT TYPES ====
  async getCustomContactTypes() {
    const result = await turso.execute('SELECT * FROM custom_contact_types ORDER BY name');
    return result.rows;
  }

  async createCustomContactType(name: string, userId?: string) {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await turso.execute({
      sql: 'INSERT INTO custom_contact_types (id, name, created_by, created_at) VALUES (?, ?, ?, ?)',
      args: [id, name, userId || null, now]
    });
    
    return { id, name };
  }

  async deleteCustomContactType(id: string) {
    await turso.execute({
      sql: 'DELETE FROM custom_contact_types WHERE id = ?',
      args: [id]
    });
  }


}

// Lazy singleton instance
let instance: TursoDatabase | null = null;

function getTursoDb(): TursoDatabase {
  if (!instance) {
    instance = new TursoDatabase();
  }
  return instance;
}

// Export using Proxy for lazy initialization to avoid module initialization issues
export const tursoDb = new Proxy({} as TursoDatabase, {
  get(target, prop) {
    const db = getTursoDb();
    return (db as any)[prop];
  }
});