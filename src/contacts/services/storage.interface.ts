import { Contact, ContactsDatabase } from '../types';

export interface StorageAdapter {
  load(): Promise<ContactsDatabase>;
  save(data: ContactsDatabase): Promise<void>;
  getContact(id: string): Promise<Contact | null>;
  updateContact(id: string, contact: Contact): Promise<void>;
  deleteContact(id: string): Promise<void>;
  addContact(contact: Contact): Promise<void>;
}