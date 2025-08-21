
import React from 'react';
import { FileText } from 'lucide-react';

const EmptyJobsState: React.FC = () => {
  return (
    <div className="text-center py-12">
      <FileText className="mx-auto h-24 w-24 text-gray-400 mb-4" />
      <h3 className="text-xl font-semibold text-gray-600 mb-2">No jobs yet</h3>
      <p className="text-gray-500">Create your first job to start mapping cable connections</p>
    </div>
  );
};

export default EmptyJobsState;
