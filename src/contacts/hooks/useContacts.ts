import { useState, useEffect, useCallback } from 'react';
import { Contact, ContactColumn, ContactsDatabase } from '../types';
import { StorageFactory, STORAGE_PROVIDER } from '../services/storageFactory';
import { toast } from 'sonner';

const storageAdapter = StorageFactory.create(STORAGE_PROVIDER);

export function useContacts() {
  const [database, setDatabase] = useState<ContactsDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load database only on mount
  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = async () => {
    try {
      setLoading(true);
      const data = await storageAdapter.load();
      setDatabase(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load database'));
    } finally {
      setLoading(false);
    }
  };

  // Save to storage in background without blocking UI
  const saveInBackground = useCallback(async (updatedDatabase: ContactsDatabase) => {
    setIsSyncing(true);
    try {
      await storageAdapter.save(updatedDatabase);
    } catch (err) {
      console.error('Background save failed:', err);
      toast.error('Failed to sync changes. Your changes are saved locally.');
      // On error, try to save again after a delay
      setTimeout(() => saveInBackground(updatedDatabase), 5000);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const addContact = async (contact: Contact) => {
    if (!database) return;
    
    // Optimistic update - update UI immediately
    const updatedDatabase = {
      ...database,
      contacts: [...database.contacts, contact],
      lastModified: new Date().toISOString(),
    };
    
    // Update local state immediately
    setDatabase(updatedDatabase);
    
    // Save to storage in background
    saveInBackground(updatedDatabase);
  };

  const updateContact = async (id: string, contact: Contact) => {
    if (!database) return;
    
    // Optimistic update
    const updatedContacts = database.contacts.map(c => 
      c.id === id ? contact : c
    );
    
    const updatedDatabase = {
      ...database,
      contacts: updatedContacts,
      lastModified: new Date().toISOString(),
    };
    
    // Update local state immediately
    setDatabase(updatedDatabase);
    
    // Save to storage in background
    saveInBackground(updatedDatabase);
  };

  const deleteContact = async (id: string) => {
    if (!database) return;
    
    // Optimistic update
    const updatedContacts = database.contacts.filter(c => c.id !== id);
    
    const updatedDatabase = {
      ...database,
      contacts: updatedContacts,
      lastModified: new Date().toISOString(),
    };
    
    // Update local state immediately
    setDatabase(updatedDatabase);
    
    // Save to storage in background
    saveInBackground(updatedDatabase);
  };

  const updateColumnSettings = async (type: string, columns: ContactColumn[]) => {
    if (!database) return;
    
    const updatedDatabase = {
      ...database,
      columnSettings: {
        ...database.columnSettings,
        [type]: columns,
      },
      lastModified: new Date().toISOString(),
    };
    
    // Update local state immediately
    setDatabase(updatedDatabase);
    
    // Save to storage in background
    saveInBackground(updatedDatabase);
  };

  const addCustomType = async (typeName: string) => {
    if (!database) return;
    
    if (!database.customTypes.includes(typeName)) {
      const updatedDatabase = {
        ...database,
        customTypes: [...database.customTypes, typeName],
        lastModified: new Date().toISOString(),
      };
      
      // Update local state immediately
      setDatabase(updatedDatabase);
      
      // Save to storage in background
      saveInBackground(updatedDatabase);
    }
  };

  return {
    contacts: database?.contacts || [],
    customTypes: database?.customTypes || [],
    columnSettings: database?.columnSettings || {},
    loading,
    error,
    isSyncing,
    addContact,
    updateContact,
    deleteContact,
    updateColumnSettings,
    addCustomType,
    refresh: loadDatabase, // Allow manual refresh if needed
  };
}