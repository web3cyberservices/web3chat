import { saveScanIssueToDb } from '@/lib/db';

/**
 * Database utility for saving crawler results.
 * Now integrated with PostgreSQL.
 */
export async function saveScanResult(url: string, issues: any[]) {
  try {
    const domain = new URL(url).hostname;
    
    // Save each issue found to the database
    const promises = issues.map(issue => saveScanIssueToDb(domain, issue));
    await Promise.all(promises);
    
    console.log(`[Database] Successfully saved ${issues.length} issues for ${domain} in PostgreSQL`);
    return { success: true };
  } catch (error) {
    console.error(`[Database Error] Failed to save issues for ${url}:`, error);
    return { success: false };
  }
}