import { turso } from '@/utils/consolidated/databaseUtils';
import { v4 as uuidv4 } from 'uuid';
import type { StorageLocation, BulkEquipment } from '@/types/inventory';

// Type definitions for bulk deployments and transfers
interface BulkDeploymentInput {
  id?: string;
  equipment_type_id: string;
  job_id: string;
  source_location_id: string;
  quantity: number;
  deployed_at?: string;
  status?: string;
}

interface StorageTransferInput {
  id?: string;
  from_location_id: string;
  to_location_id: string;
  equipment_type_id: string;
  quantity: number;
  requested_by?: string;
  notes?: string;
}

export class InventoryService {
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

  // ==== EQUIPMENT ITEMS (Bulk Equipment) ====
  async getEquipmentItems() {
    const result = await turso.execute('SELECT * FROM equipment_items ORDER BY type_id, location_id');
    return result.rows;
  }

  async createEquipmentItem(item: unknown) {
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

  async updateEquipmentItem(id: string, updates: Record<string, unknown>) {
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

  // ==== EQUIPMENT DEPLOYMENTS ====
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

  async createEquipmentDeployment(deployment: BulkDeploymentInput) {
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

  async updateEquipmentDeployment(id: string, updates: Partial<BulkDeploymentInput>) {
    const setClause: string[] = [];
    const args: unknown[] = [];
    
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

  // ==== BULK DEPLOYMENTS (for transactionWrapper compatibility) ====
  async createBulkDeployment(deployment: BulkDeploymentInput) {
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

  async updateBulkDeployment(id: string, updates: Partial<BulkDeploymentInput>) {
    const setClause: string[] = [];
    const args: unknown[] = [];
    
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

  // ==== STORAGE TRANSFERS ====
  async createStorageTransfer(transfer: StorageTransferInput) {
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

  // ==== EQUIPMENT BY LOCATION (bulk items only) ====
  async getEquipmentItemsByLocation(locationId: string) {
    const equipmentItems = await turso.execute({
      sql: 'SELECT * FROM equipment_items WHERE location_id = ?',
      args: [locationId]
    });
    
    return equipmentItems.rows;
  }

  async getDeployedEquipmentItemsByJob(jobId: string) {
    const equipmentItems = await turso.execute({
      sql: 'SELECT * FROM equipment_items WHERE job_id = ?',
      args: [jobId]
    });
    
    return equipmentItems.rows;
  }
}

// Lazy singleton instance
let inventoryServiceInstance: InventoryService | null = null;

export function getInventoryService(): InventoryService {
  if (!inventoryServiceInstance) {
    inventoryServiceInstance = new InventoryService();
  }
  return inventoryServiceInstance;
}