import { useEffect, useRef } from 'react';
import { useInventoryMapperContext } from '@/contexts/InventoryMapperContext';
import { toast } from 'sonner';
// import { getOrCreateChannel, subscribeToChannel } from '@/lib/realtimeChannelStore'; // File doesn't exist

// Stub implementations until realtime is properly set up
const getOrCreateChannel = (name: string, callback: (ch: any) => any) => ({ subscribe: () => {}, unsubscribe: () => {} });
const subscribeToChannel = (name: string, callback: (status: string) => void) => () => {};

export const useInventoryMapperRealtime = () => {
  const { 
    updateSharedEquipment, 
    setAllocation, 
    removeAllocation,
    setSyncStatus,
    setLastSyncTime 
  } = useInventoryMapperContext();
  
  const isSubscribedRef = useRef(false);
  const channelNameRef = useRef<string>('inventory-mapper-sync');

  useEffect(() => {
    console.log('Setting up inventory mapper real-time sync...');
    
    // Get or create the channel
    const channel = getOrCreateChannel(channelNameRef.current, (ch) => 
      ch.on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'individual_equipment' 
        }, 
        (payload) => {
          console.log('Individual equipment real-time update:', payload);
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            const equipment = payload.new;
            
            // Check if equipment has required fields
            if (!equipment || !equipment.equipment_id) {
              console.warn('Individual equipment update missing or invalid:', equipment);
              return;
            }
            
            // Update shared equipment state
            updateSharedEquipment(equipment.equipment_id, {
              status: equipment.status,
              jobId: equipment.job_id,
              lastUpdated: new Date()
            });

            // Update allocation if equipment is deployed
            if (equipment.status === 'deployed' && equipment.job_id) {
              setAllocation(equipment.equipment_id, {
                equipmentId: equipment.equipment_id,
                jobId: equipment.job_id,
                jobName: 'Job', // This would need to be fetched
                status: 'allocated',
                timestamp: new Date()
              });
            } else if (equipment.status === 'available') {
              removeAllocation(equipment.equipment_id);
            }

            setLastSyncTime(new Date());
          }
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment_items'
        },
        (payload) => {
          console.log('Equipment items real-time update:', payload);
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            const item = payload.new;
            
            // Check if item has required fields
            if (!item || !item.id) {
              console.warn('Equipment item update missing or invalid:', item);
              return;
            }
            
            // Update shared equipment state for bulk items
            updateSharedEquipment(item.id, {
              status: item.status,
              jobId: item.job_id,
              lastUpdated: new Date()
            });

            setLastSyncTime(new Date());
          }
        }
      )
    );

    // Subscribe to the channel
    const unsubscribe = subscribeToChannel(channelNameRef.current, (status) => {
      console.log('Inventory mapper sync subscription status:', status);
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;
        setSyncStatus('idle');
        // Only show toast on first connection
        if (!isSubscribedRef.current) {
          toast.success('Real-time sync connected');
        }
      } else if (status === 'CHANNEL_ERROR') {
        setSyncStatus('error');
        toast.error('Real-time sync connection failed');
      }
    });

    return () => {
      console.log('Cleaning up inventory mapper real-time sync...');
      unsubscribe();
      isSubscribedRef.current = false;
    };
  }, [updateSharedEquipment, setAllocation, removeAllocation, setSyncStatus, setLastSyncTime]);

  return {
    isConnected: isSubscribedRef.current
  };
};