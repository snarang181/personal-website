export type PatentStatus = 'filed' | 'published' | 'granted';

export interface Patent {
  title: string;
  status: PatentStatus;
  /** Application, publication, or grant number. Omit while an application is
   *  still confidential — a US filing is not public until it publishes,
   *  normally 18 months after the earliest priority date. */
  number?: string;
  /** Filing or publication date, e.g. 'March 2026'. */
  date: string;
  assignee: string;
  /** Same convention as publications: wrap your own name in the `you` span. */
  inventors: string;
  /** Google Patents / USPTO link, once the application is public. */
  url?: string;
}

// Empty is safe: the #patents section and its nav entry are both suppressed
// until this array has something in it.
export const patents: Patent[] = [
  // {
  //   title: 'Tiling Strategies for Tensor Operations on Hexagon NPUs',
  //   status: 'filed',
  //   date: 'March 2026',
  //   assignee: 'Qualcomm',
  //   inventors: '<span class="you">Samarth Narang</span>, Javed Absar',
  // },
];
