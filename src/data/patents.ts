export type PatentStatus = 'filed' | 'published' | 'granted';

export interface Patent {
  title: string;
  status: PatentStatus;
  /** Application, publication, or grant number. */
  number?: string;
  /** Filing date, ISO. Rendered as an abbreviated month. */
  filed?: string;
  assignee?: string;
  /** Same convention as publications: wrap your own name in the `you` span. */
  inventors?: string;
  /** Google Patents / USPTO link, once the application is public. */
  url?: string;
}

// Generated from the filing spreadsheet. Titles that were filed entirely in
// capitals are shown in title case; mixed-case titles are left verbatim.
// Cleared. The section and its nav entry stay suppressed while this is empty;
// refill it and both reappear automatically.
export const patents: Patent[] = [];