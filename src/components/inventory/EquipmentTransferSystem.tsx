
import React from 'react';
import EquipmentTransferManager from './EquipmentTransferManager';
import StorageTransferManager from './StorageTransferManager';

const EquipmentTransferSystem = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <EquipmentTransferManager />
      <StorageTransferManager />
    </div>
  );
};

export default EquipmentTransferSystem;
