import { getEquipmentService } from './equipmentService';
import { getJobService } from './jobService';
import { getInventoryService } from './inventoryService';
import { getUserService } from './userService';
import type { EquipmentType, IndividualEquipment, StorageLocation } from '@/types/inventory';
import type { Node, Edge } from '@xyflow/react';

// Type definitions for database operations
interface JobCreateInput {
  id?: string;
  name: string;
  client?: string;
  well_count?: number;
  has_wellside_gauge?: boolean;
  nodes?: Node[];
  edges?: Edge[];
  company_computer_names?: Record<string, string>;
  equipment_assignment?: Record<string, unknown>;
  equipment_allocated?: boolean;
  main_box_name?: string;
  satellite_name?: string;
  wellside_gauge_name?: string;
  selected_cable_type?: string;
  frac_baud_rate?: string;
  gauge_baud_rate?: string;
  frac_com_port?: string;
  gauge_com_port?: string;
  enhanced_config?: Record<string, unknown>;
  photos?: unknown[];
  status?: string;
  start_date?: string;
  end_date?: string;
}

interface JobUpdateInput {
  name?: string;
  client?: string;
  well_count?: number;
  has_wellside_gauge?: boolean;
  nodes?: Node[];
  edges?: Edge[];
  company_computer_names?: Record<string, string>;
  equipment_assignment?: Record<string, unknown>;
  equipment_allocated?: boolean;
  main_box_name?: string;
  satellite_name?: string;
  wellside_gauge_name?: string;
  selected_cable_type?: string;
  frac_baud_rate?: string;
  gauge_baud_rate?: string;
  frac_com_port?: string;
  gauge_com_port?: string;
  enhanced_config?: Record<string, unknown>;
  photos?: unknown[];
  status?: string;
  start_date?: string;
  end_date?: string;
}

interface JobPhotoInput {
  id?: string;
  job_id: string;
  section_label: string;
  photo_url: string;
  caption?: string;
  sort_order?: number;
}

interface ContactCreateInput {
  id?: string;
  type: string;
  name: string;
  email?: string;
  phone?: string;
  phone2?: string;
  company?: string;
  rig?: string;
  job_title?: string;
  location?: string;
  client_name?: string;
  well_name?: string;
  created_by?: string;
  [key: string]: unknown;
}

interface ContactUpdateInput {
  type?: string;
  name?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  company?: string;
  rig?: string;
  job_title?: string;
  location?: string;
  client_name?: string;
  well_name?: string;
  [key: string]: unknown;
}

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

interface RedTagInfo {
  status?: string;
  reason?: string;
  photo?: string;
}

class TursoDatabase {
  private equipmentService = getEquipmentService();
  private jobService = getJobService();
  private inventoryService = getInventoryService();
  private userService = getUserService();

  // ==== EQUIPMENT TYPES ====
  async getEquipmentTypes() {
    return this.equipmentService.getEquipmentTypes();
  }

  async createEquipmentType(type: Partial<EquipmentType> & { name: string; category: string }) {
    return this.equipmentService.createEquipmentType(type);
  }

  async updateEquipmentType(id: string, updates: Partial<EquipmentType>) {
    return this.equipmentService.updateEquipmentType(id, updates);
  }

  async deleteEquipmentType(id: string) {
    return this.equipmentService.deleteEquipmentType(id);
  }

  async getEquipmentTypeById(id: string) {
    return this.equipmentService.getEquipmentTypeById(id);
  }

  // ==== INDIVIDUAL EQUIPMENT ====
  async getIndividualEquipment() {
    return this.equipmentService.getIndividualEquipment();
  }

  async createIndividualEquipment(equipment: Partial<IndividualEquipment> & { equipmentId: string; equipmentTypeId: string; storageLocationId: string }) {
    return this.equipmentService.createIndividualEquipment(equipment);
  }

  async updateIndividualEquipment(id: string, updates: Partial<IndividualEquipment>) {
    return this.equipmentService.updateIndividualEquipment(id, updates);
  }

  async deleteIndividualEquipment(id: string) {
    return this.equipmentService.deleteIndividualEquipment(id);
  }

  async getIndividualEquipmentById(id: string) {
    return this.equipmentService.getIndividualEquipmentById(id);
  }

  // ==== EQUIPMENT HISTORY ====
  async addEquipmentHistory(entry: { equipmentId: string; action: string; fromStatus?: string; toStatus?: string; fromLocation?: string; toLocation?: string; jobId?: string; jobName?: string; userId?: string; userName?: string; notes?: string }) {
    return this.equipmentService.addEquipmentHistory(entry);
  }

  async getEquipmentHistory(equipmentId: string) {
    return this.equipmentService.getEquipmentHistory(equipmentId);
  }

  // ==== EQUIPMENT (legacy compatibility) ====
  async getEquipment() {
    return this.equipmentService.getEquipment();
  }

  async createEquipment(equipment: Partial<IndividualEquipment> & { equipmentId: string; equipmentTypeId: string; storageLocationId: string }) {
    return this.equipmentService.createEquipment(equipment);
  }

  async updateEquipment(id: string, updates: Partial<IndividualEquipment>) {
    return this.equipmentService.updateEquipment(id, updates);
  }

  async deleteEquipment(id: string) {
    return this.equipmentService.deleteEquipment(id);
  }

  // ==== STORAGE LOCATIONS ====
  async getStorageLocations() {
    return this.inventoryService.getStorageLocations();
  }

  async createStorageLocation(location: Partial<StorageLocation> & { name: string }) {
    return this.inventoryService.createStorageLocation(location);
  }

  // Alias for compatibility
  async addStorageLocation(location: Partial<StorageLocation> & { name: string }) {
    return this.createStorageLocation(location);
  }

  async updateStorageLocation(id: string, updates: Partial<StorageLocation>) {
    return this.inventoryService.updateStorageLocation(id, updates);
  }

  async deleteStorageLocation(id: string) {
    return this.inventoryService.deleteStorageLocation(id);
  }

  async getStorageLocationById(id: string) {
    return this.inventoryService.getStorageLocationById(id);
  }

  // ==== EQUIPMENT ITEMS (Bulk Equipment) ====
  async getEquipmentItems() {
    return this.inventoryService.getEquipmentItems();
  }

  async createEquipmentItem(item: unknown) {
    return this.inventoryService.createEquipmentItem(item);
  }

  async updateEquipmentItem(id: string, updates: Record<string, unknown>) {
    return this.inventoryService.updateEquipmentItem(id, updates);
  }

  async deleteEquipmentItem(id: string) {
    return this.inventoryService.deleteEquipmentItem(id);
  }

  async getEquipmentItemById(id: string) {
    return this.inventoryService.getEquipmentItemById(id);
  }

  // ==== JOBS ====
  async getJobs() {
    return this.jobService.getJobs();
  }

  async createJob(job: JobCreateInput) {
    return this.jobService.createJob(job);
  }

  async updateJob(id: string, updates: JobUpdateInput) {
    return this.jobService.updateJob(id, updates);
  }

  async deleteJob(id: string) {
    return this.jobService.deleteJob(id);
  }

  async getJobById(id: string) {
    return this.jobService.getJobById(id);
  }

  async getJob(id: string) {
    return this.jobService.getJob(id);
  }

  // ==== JOB PHOTOS ====
  async getJobPhotos(jobId: string) {
    return this.jobService.getJobPhotos(jobId);
  }

  async createJobPhoto(photo: JobPhotoInput) {
    return this.jobService.createJobPhoto(photo);
  }

  async deleteJobPhoto(id: string) {
    return this.jobService.deleteJobPhoto(id);
  }

  // ==== USERS ====
  async getUser(email: string) {
    return this.userService.getUser(email);
  }

  async createUser(email: string, name?: string) {
    return this.userService.createUser(email, name);
  }

  // ==== CONTACTS ====
  async getContacts() {
    return this.userService.getContacts();
  }

  async getContactById(id: string) {
    return this.userService.getContactById(id);
  }

  async createContact(contact: ContactCreateInput) {
    return this.userService.createContact(contact);
  }

  async updateContact(id: string, updates: ContactUpdateInput) {
    return this.userService.updateContact(id, updates);
  }

  async deleteContact(id: string) {
    return this.userService.deleteContact(id);
  }

  async searchContacts(query: string) {
    return this.userService.searchContacts(query);
  }

  // ==== CONTACT COLUMN SETTINGS ====
  async getColumnSettings(contactType: string, userId?: string) {
    return this.userService.getColumnSettings(contactType, userId);
  }

  async saveColumnSettings(contactType: string, settings: unknown[], userId?: string) {
    return this.userService.saveColumnSettings(contactType, settings, userId);
  }

  // ==== CUSTOM CONTACT TYPES ====
  async getCustomContactTypes() {
    return this.userService.getCustomContactTypes();
  }

  async createCustomContactType(name: string, userId?: string) {
    return this.userService.createCustomContactType(name, userId);
  }

  async deleteCustomContactType(id: string) {
    return this.userService.deleteCustomContactType(id);
  }

  // ==== DEPLOYMENTS ====
  async getEquipmentDeployments() {
    return this.inventoryService.getEquipmentDeployments();
  }

  async getDeploymentsForJob(jobId: string) {
    return this.inventoryService.getDeploymentsForJob(jobId);
  }

  async createEquipmentDeployment(deployment: BulkDeploymentInput) {
    return this.inventoryService.createEquipmentDeployment(deployment);
  }

  async updateEquipmentDeployment(id: string, updates: Partial<BulkDeploymentInput>) {
    return this.inventoryService.updateEquipmentDeployment(id, updates);
  }

  async returnEquipmentFromJob(deploymentId: string) {
    return this.inventoryService.returnEquipmentFromJob(deploymentId);
  }

  // ==== BULK DEPLOYMENTS ====
  async createBulkDeployment(deployment: BulkDeploymentInput) {
    return this.inventoryService.createBulkDeployment(deployment);
  }

  async updateBulkDeployment(id: string, updates: Partial<BulkDeploymentInput>) {
    return this.inventoryService.updateBulkDeployment(id, updates);
  }

  async deleteBulkDeployment(id: string) {
    return this.inventoryService.deleteBulkDeployment(id);
  }

  // ==== STORAGE TRANSFERS ====
  async createStorageTransfer(transfer: StorageTransferInput) {
    return this.inventoryService.createStorageTransfer(transfer);
  }

  async executeStorageTransfer(transferId: string) {
    return this.inventoryService.executeStorageTransfer(transferId);
  }

  async getStorageTransfers() {
    return this.inventoryService.getStorageTransfers();
  }

  async getStorageTransfer(id: string) {
    return this.inventoryService.getStorageTransfer(id);
  }

  async cancelStorageTransfer(id: string) {
    return this.inventoryService.cancelStorageTransfer(id);
  }

  // ==== COMBINED OPERATIONS ====
  async updateJobEquipment(jobId: string, equipment: Record<string, unknown>) {
    return this.jobService.updateJobEquipment(jobId, equipment);
  }

  async getEquipmentByLocation(locationId: string) {
    // Get both individual and bulk equipment at a specific location
    const individual = await this.equipmentService.getEquipmentByLocation(locationId);
    const items = await this.inventoryService.getEquipmentItemsByLocation(locationId);
    
    return {
      individual: individual.individual,
      items: items
    };
  }

  async getDeployedEquipmentByJob(jobId: string) {
    // Get both individual and bulk equipment deployed to a specific job
    const individual = await this.equipmentService.getDeployedEquipmentByJob(jobId);
    const items = await this.inventoryService.getDeployedEquipmentItemsByJob(jobId);
    
    return {
      individual: individual.individual,
      items: items
    };
  }

  async updateEquipmentRedTagStatus(equipmentId: string, redTagInfo: RedTagInfo) {
    // Try to update individual equipment first
    try {
      await this.equipmentService.updateIndividualEquipment(equipmentId, {
        status: redTagInfo.status || 'red-tag',
        red_tag_reason: redTagInfo.reason,
        red_tag_photo: redTagInfo.photo
      });
    } catch {
      // If not found in individual, try equipment items
      await this.inventoryService.updateEquipmentItem(equipmentId, {
        status: redTagInfo.status || 'red-tag',
        red_tag_reason: redTagInfo.reason,
        red_tag_photo: redTagInfo.photo
      });
    }
  }

  // ==== DATABASE INITIALIZATION ====
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
    return (db as Record<string, unknown>)[prop];
  }
});