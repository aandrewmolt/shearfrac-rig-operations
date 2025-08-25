import { tursoDb } from '@/services/tursoDb';
import { validateJobDiagramEquipment, cleanOrphanedEquipmentReferences, logValidationResults } from '@/utils/jobDiagramValidation';

/**
 * Cleanup script to remove orphaned equipment references from all job diagrams
 * This script should be run manually to clean up legacy data issues
 */
export async function cleanupOrphanedEquipmentInAllJobs() {
  // Get all jobs and inventory data
    const [jobs, individualEquipment] = await Promise.all([
      tursoDb.getAllJobs(),
      tursoDb.getIndividualEquipment(),
    ]);

    let totalJobsProcessed = 0;
    let totalJobsWithIssues = 0;
    let totalEquipmentReferencesRemoved = 0;
    const jobsWithIssues: string[] = [];

    // Process each job
    for (const job of jobs) {
      if (!job.nodes || job.nodes.length === 0) {
        continue; // Skip jobs without diagram data
      }

      totalJobsProcessed++;
      
      // Validate equipment references
      const validationResult = validateJobDiagramEquipment(job.nodes, individualEquipment);
      logValidationResults(validationResult, job.name);

      if (!validationResult.isValid) {
        totalJobsWithIssues++;
        jobsWithIssues.push(job.name);
        
        // Clean orphaned equipment references
        const { cleanedNodes, removedCount } = cleanOrphanedEquipmentReferences(job.nodes, individualEquipment);
        totalEquipmentReferencesRemoved += removedCount;
        
        if (removedCount > 0) {
          // Update the job with cleaned nodes
          await tursoDb.updateJob(job.id, {
            ...job,
            nodes: cleanedNodes,
          });
        }
      }
    }

    return {
      totalJobsProcessed,
      totalJobsWithIssues,
      totalEquipmentReferencesRemoved,
      jobsWithIssues,
    };
}

/**
 * Cleanup script for a specific job by ID
 */
export async function cleanupOrphanedEquipmentInJob(jobId: number) {
  const [job, individualEquipment] = await Promise.all([
      tursoDb.getJobById(jobId),
      tursoDb.getIndividualEquipment(),
    ]);

    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    if (!job.nodes || job.nodes.length === 0) {
      return { removedCount: 0 };
    }

    // Validate and clean
    const validationResult = validateJobDiagramEquipment(job.nodes, individualEquipment);
    logValidationResults(validationResult, job.name);

    if (!validationResult.isValid) {
      const { cleanedNodes, removedCount } = cleanOrphanedEquipmentReferences(job.nodes, individualEquipment);
      
      if (removedCount > 0) {
        await tursoDb.updateJob(jobId, {
          ...job,
          nodes: cleanedNodes,
        });
      }
      
      return { removedCount };
    } else {
      return { removedCount: 0 };
    }
}

/**
 * Run a dry run to see what would be cleaned without making changes
 */
export async function dryRunCleanupOrphanedEquipment() {
  const [jobs, individualEquipment] = await Promise.all([
      tursoDb.getAllJobs(),
      tursoDb.getIndividualEquipment(),
    ]);

    let totalJobsWithIssues = 0;
    let totalEquipmentReferencesToRemove = 0;
    const issueReport: Array<{ jobName: string; orphanedEquipment: string[] }> = [];

    for (const job of jobs) {
      if (!job.nodes || job.nodes.length === 0) continue;

      const validationResult = validateJobDiagramEquipment(job.nodes, individualEquipment);
      
      if (!validationResult.isValid) {
        totalJobsWithIssues++;
        totalEquipmentReferencesToRemove += validationResult.orphanedEquipment.length;
        issueReport.push({
          jobName: job.name,
          orphanedEquipment: validationResult.orphanedEquipment,
        });
      }
    }

    return {
      totalJobsWithIssues,
      totalEquipmentReferencesToRemove,
      issueReport,
    };
}