
// Utility to handle cable type ID migration from old numeric IDs to new string IDs
export const migrateCableTypeId = (oldId: string): string => {
  const cableTypeMapping: { [key: string]: string } = {
    '1': '100ft-cable',
    '2': '200ft-cable', 
    '3': '300ft-cable-old',
    '4': '300ft-cable-new',
  };

  // If it's an old numeric ID, map it to the new string ID
  if (cableTypeMapping[oldId]) {
    return cableTypeMapping[oldId];
  }

  // If it's already a new string ID, return as-is
  return oldId;
};

// Helper to check if an ID is an old numeric format
export const isOldCableTypeId = (id: string): boolean => {
  return ['1', '2', '3', '4'].includes(id);
};
