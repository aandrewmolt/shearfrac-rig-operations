import React, { useState, useMemo } from 'react';
import { AlertTriangle, Users, Merge, X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Contact } from '../types';
import { detectDuplicates, DuplicateGroup, suggestMerge } from '../utils/duplicateDetection';
import { cn } from '@/lib/utils';

interface DuplicateDetectionProps {
  contacts: Contact[];
  onMergeContacts: (contactsToMerge: Contact[], mergedContact: Contact) => void;
  onDeleteContact: (contactId: string) => void;
}

export function DuplicateDetection({ 
  contacts, 
  onMergeContacts, 
  onDeleteContact 
}: DuplicateDetectionProps) {
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [threshold, setThreshold] = useState(0.8);

  const duplicateGroups = useMemo(() => {
    return detectDuplicates(contacts, threshold);
  }, [contacts, threshold]);

  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.contacts.length, 0);

  const handleMergeGroup = (group: DuplicateGroup) => {
    const mergedContact = suggestMerge(group.contacts);
    onMergeContacts(group.contacts, mergedContact);
    setSelectedGroup(null);
  };

  const handleMergeSelected = () => {
    if (!selectedGroup) return;
    
    const contactsToMerge = selectedGroup.contacts.filter(c => selectedContacts.has(c.id));
    if (contactsToMerge.length < 2) return;

    const mergedContact = suggestMerge(contactsToMerge);
    onMergeContacts(contactsToMerge, mergedContact);
    setSelectedGroup(null);
    setSelectedContacts(new Set());
  };

  const handleDeleteSelected = () => {
    if (!selectedGroup) return;
    
    selectedContacts.forEach(contactId => {
      onDeleteContact(contactId);
    });
    
    setSelectedGroup(null);
    setSelectedContacts(new Set());
  };

  const toggleContactSelection = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  if (duplicateGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-800">Potential Duplicates Detected</AlertTitle>
        <AlertDescription className="text-orange-700">
          Found {duplicateGroups.length} groups with {totalDuplicates} potentially duplicate contacts.
          <Button
            variant="link"
            className="p-0 h-auto text-orange-700 underline ml-2"
            onClick={() => setShowDuplicates(!showDuplicates)}
          >
            {showDuplicates ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Show Details
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>

      {showDuplicates && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Sensitivity:</Label>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-gray-600">{Math.round(threshold * 100)}%</span>
            </div>
          </div>

          <div className="grid gap-4">
            {duplicateGroups.map((group) => (
              <Card key={group.id} className="border-orange-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      Duplicate Group ({group.contacts.length} contacts)
                      <Badge variant="outline" className="text-orange-700 border-orange-300">
                        {Math.round(group.similarity * 100)}% match
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setSelectedGroup(group)}
                      className="h-7"
                    >
                      Review
                    </Button>
                  </CardTitle>
                  <div className="flex flex-wrap gap-1">
                    {group.reasons.map((reason, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-2">
                    {group.contacts.map((contact, index) => (
                      <div
                        key={contact.id}
                        className={cn(
                          "p-3 rounded-md border text-sm",
                          index === 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                        )}
                      >
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-gray-600">
                          {contact.company} • {contact.job}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {contact.email} • {contact.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Review Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Review Duplicate Contacts
              {selectedGroup && (
                <Badge variant="outline" className="text-orange-700 border-orange-300">
                  {Math.round(selectedGroup.similarity * 100)}% match
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Review these potentially duplicate contacts and choose how to handle them.
              Select contacts to merge or delete.
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1">
                <span className="text-sm font-medium">Reasons for match:</span>
                {selectedGroup.reasons.map((reason, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {reason}
                  </Badge>
                ))}
              </div>

              <div className="grid gap-3">
                {selectedGroup.contacts.map((contact, index) => (
                  <div
                    key={contact.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      selectedContacts.has(contact.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white",
                      index === 0 && "ring-2 ring-green-200 bg-green-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedContacts.has(contact.id)}
                        onCheckedChange={() => toggleContactSelection(contact.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="font-medium text-gray-900">{contact.name}</div>
                          <div className="text-sm text-gray-600">
                            {'title' in contact && contact.title}
                          </div>
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs mt-1 border-green-500 text-green-700">
                              Most Recent
                            </Badge>
                          )}
                        </div>
                        <div>
                          <div className="text-sm">
                            <div className="font-medium">{contact.company}</div>
                            <div className="text-gray-600">{contact.job}</div>
                            {'crew' in contact && contact.crew && (
                              <div className="text-gray-500">Crew: {contact.crew}</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm">
                            <div>{contact.email}</div>
                            <div>{contact.phone}</div>
                            <div className="text-gray-500">
                              Updated: {new Date(contact.lastUpdatedDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {contact.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          <strong>Notes:</strong> {contact.notes}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedGroup(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={selectedContacts.size === 0}
            >
              Delete Selected ({selectedContacts.size})
            </Button>
            <Button
              onClick={handleMergeSelected}
              disabled={selectedContacts.size < 2}
              className="gap-2"
            >
              <Merge className="h-4 w-4" />
              Merge Selected ({selectedContacts.size})
            </Button>
            <Button
              onClick={() => selectedGroup && handleMergeGroup(selectedGroup)}
              className="gap-2"
            >
              <Merge className="h-4 w-4" />
              Merge All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}