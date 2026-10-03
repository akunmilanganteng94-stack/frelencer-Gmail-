import { Submission } from '../../types';

export function getSubmissionStor(sub: Submission): 'STOR 1' | 'STOR 2' {
  const p = (sub.storanPassword || '').toLowerCase();
  const notes = (sub.adminNotes || '').toLowerCase();
  const content = (sub.dataContent || '').toLowerCase();

  if (
    p === 'prabujaya' ||
    notes.includes('prabujaya') ||
    content.includes('prabujaya') ||
    notes.includes('stor 2')
  ) {
    return 'STOR 2';
  }
  return 'STOR 1';
}

export function getCleanEmail(dataContent: string): string {
  if (!dataContent) return '';
  return dataContent.split('|')[0].trim();
}
