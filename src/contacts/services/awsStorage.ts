import { StorageAdapter } from './storage.interface';
import { Contact, ContactsDatabase } from '../types';

/**
 * AWS Storage Adapter for future migration
 * This is a placeholder implementation that shows how to switch from GitHub to AWS
 * 
 * To use this adapter:
 * 1. Set up AWS credentials and S3 bucket
 * 2. Install AWS SDK: npm install @aws-sdk/client-s3
 * 3. Configure the bucket name and region
 * 4. Replace GitHubStorageAdapter with AWSStorageAdapter in useContacts hook
 */
export class AWSStorageAdapter implements StorageAdapter {
  private bucketName: string = 'shearfrac-contacts';
  private fileName: string = 'contacts.json';
  private region: string = 'us-east-1';

  async load(): Promise<ContactsDatabase> {
    // TODO: Implement AWS S3 getObject
    // Example:
    // const s3Client = new S3Client({ region: this.region });
    // const command = new GetObjectCommand({
    //   Bucket: this.bucketName,
    //   Key: this.fileName,
    // });
    // const response = await s3Client.send(command);
    // const bodyContents = await streamToString(response.Body);
    // return JSON.parse(bodyContents);
    
    throw new Error('AWS Storage not implemented yet. Using GitHub/localStorage instead.');
  }

  async save(data: ContactsDatabase): Promise<void> {
    // TODO: Implement AWS S3 putObject
    // Example:
    // const s3Client = new S3Client({ region: this.region });
    // const command = new PutObjectCommand({
    //   Bucket: this.bucketName,
    //   Key: this.fileName,
    //   Body: JSON.stringify(data, null, 2),
    //   ContentType: 'application/json',
    // });
    // await s3Client.send(command);
    
    throw new Error('AWS Storage not implemented yet. Using GitHub/localStorage instead.');
  }

  async getContact(id: string): Promise<Contact | null> {
    const database = await this.load();
    return database.contacts.find(c => c.id === id) || null;
  }

  async updateContact(id: string, contact: Contact): Promise<void> {
    const database = await this.load();
    const index = database.contacts.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Contact with id ${id} not found`);
    }
    database.contacts[index] = contact;
    await this.save(database);
  }

  async deleteContact(id: string): Promise<void> {
    const database = await this.load();
    database.contacts = database.contacts.filter(c => c.id !== id);
    await this.save(database);
  }

  async addContact(contact: Contact): Promise<void> {
    const database = await this.load();
    database.contacts.push(contact);
    
    if (contact.type === 'custom' && !database.customTypes.includes(contact.customType)) {
      database.customTypes.push(contact.customType);
    }
    
    await this.save(database);
  }
}