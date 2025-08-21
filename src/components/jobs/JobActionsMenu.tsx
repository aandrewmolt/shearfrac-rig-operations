import React, { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle2, MoreVertical } from 'lucide-react';
import { JobDiagram } from '@/hooks/useJobs';
import { JobCompletionDialog } from './JobCompletionDialog';
import { JobDeletionDialog } from './JobDeletionDialog';

interface JobActionsMenuProps {
  job: JobDiagram;
  onCompleteJob: (job: JobDiagram, endDate: string) => void;
  onDeleteJob: (job: JobDiagram) => void;
}

export const JobActionsMenu: React.FC<JobActionsMenuProps> = ({
  job,
  onCompleteJob,
  onDeleteJob,
}) => {
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);

  const handleComplete = (endDate: string) => {
    onCompleteJob(job, endDate);
    setShowCompletionDialog(false);
  };

  const handleDelete = () => {
    onDeleteJob(job);
    setShowDeletionDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            onClick={(e) => e.stopPropagation()}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {job.status !== 'completed' && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setShowCompletionDialog(true);
              }}
              className="text-green-600"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Job
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowDeletionDialog(true);
            }}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Job
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <JobCompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        onComplete={handleComplete}
        jobName={job.name}
      />

      <JobDeletionDialog
        open={showDeletionDialog}
        onOpenChange={setShowDeletionDialog}
        onConfirm={handleDelete}
        jobName={job.name}
        hasEquipment={job.equipmentAllocated}
      />
    </>
  );
};