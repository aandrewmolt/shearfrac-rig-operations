import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { DATABASE_MODE } from '@/utils/consolidated/databaseUtils';

export const LocalModeBanner = () => {
  // Show banner based on mode
  if (DATABASE_MODE === 'vercel-blob') {
    return (
      <Alert className="mb-4 bg-green-50 border-green-200">
        <Info className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Cloud Sync Active:</strong> Data syncs to Vercel Blob storage. 
          Changes are saved locally and backed up to the cloud automatically.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (DATABASE_MODE === 'local') {
    return (
      <Alert className="mb-4 bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Local Mode Active:</strong> All data is stored in your browser. 
          Perfect for testing or single-user deployment. No cloud database required!
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};