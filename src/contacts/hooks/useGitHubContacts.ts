import { useState, useEffect, useCallback } from 'react';
import { Contact, ContactColumn, ContactsDatabase } from '../types';
import { toast } from 'sonner';
import { defaultClientColumns, defaultFracColumns, defaultCustomColumns } from '../utils/columnConfig';

const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER || 'aandrewmolt';
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO || 'shearfrac-data';
const GITHUB_PATH = import.meta.env.VITE_GITHUB_PATH || 'data/contacts.json';
const GITHUB_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main';
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

export function useGitHubContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customTypes, setCustomTypes] = useState<string[]>(['Coldbore']);
  const [columnSettings, setColumnSettings] = useState<Record<string, ContactColumn[]>>({
    client: defaultClientColumns,
    frac: defaultFracColumns,
    custom: defaultCustomColumns,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fileSha, setFileSha] = useState<string | null>(null);

  // Load data from GitHub
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch file from GitHub with authentication
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
      };

      if (GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
      }

      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}?ref=${GITHUB_BRANCH}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const fileData = await response.json();
      setFileSha(fileData.sha);

      // Decode base64 content
      const content = atob(fileData.content);
      const data = JSON.parse(content) as ContactsDatabase;

      setContacts(data.contacts || []);
      setCustomTypes(data.customTypes || ['Coldbore']);
      setColumnSettings(data.columnSettings || {
        client: defaultClientColumns,
        frac: defaultFracColumns,
        custom: defaultCustomColumns,
      });

      console.log(`✅ Loaded ${data.contacts?.length || 0} contacts from GitHub`);
    } catch (err) {
      const error = err as Error;
      console.error('Error loading contacts from GitHub:', error);
      setError(error);
      toast.error(`Error loading contacts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save data to GitHub
  const saveData = useCallback(async () => {
    try {
      setIsSyncing(true);

      const data: ContactsDatabase = {
        contacts,
        customTypes,
        columnSettings,
      };

      const content = btoa(JSON.stringify(data, null, 2));

      // Update file on GitHub with authentication
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      };

      if (GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
      }

      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Update contacts - ${new Date().toISOString()}`,
          content,
          sha: fileSha,
          branch: GITHUB_BRANCH,
        })
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const result = await response.json();
      setFileSha(result.content.sha);

      toast.success('Contacts saved to GitHub!');
    } catch (err) {
      const error = err as Error;
      console.error('Error saving contacts to GitHub:', error);
      toast.error(`Error saving contacts: ${error.message}`);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [contacts, customTypes, columnSettings, fileSha]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-save when data changes (debounced)
  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      saveData();
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [contacts, customTypes, columnSettings, loading, saveData]);

  const addContact = useCallback((contact: Contact) => {
    setContacts(prev => [...prev, contact]);
  }, []);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    setContacts(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const deleteContact = useCallback((id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  }, []);

  const addCustomType = useCallback((type: string) => {
    setCustomTypes(prev => [...prev, type]);
  }, []);

  const deleteCustomType = useCallback((type: string) => {
    setCustomTypes(prev => prev.filter(t => t !== type));
  }, []);

  const updateColumnSettings = useCallback((type: string, columns: ContactColumn[]) => {
    setColumnSettings(prev => ({
      ...prev,
      [type]: columns,
    }));
  }, []);

  const refresh = useCallback(() => {
    return loadData();
  }, [loadData]);

  const sync = useCallback(() => {
    return saveData();
  }, [saveData]);

  // Placeholder for API compatibility (not used in ContactsPage)
  const searchContacts = useCallback((query: string) => {
    return contacts.filter(c =>
      JSON.stringify(c).toLowerCase().includes(query.toLowerCase())
    );
  }, [contacts]);

  return {
    contacts,
    customTypes,
    columnSettings,
    loading,
    error,
    isSyncing,
    addContact,
    updateContact,
    deleteContact,
    addCustomType,
    deleteCustomType,
    updateColumnSettings,
    searchContacts,
    refresh,
    sync,
  };
}
