export interface ReleaseData {
  id: number;
  releaseDate: string;
  name: string;
  type: string;
  status: string;
  totalMd: number;
  firstWorkDate: string;
  lastWorkDate: string;
  reqOwner: string;
  reqStart: string;
  reqEnd: string;
  reqMd: number;
  designOwner: string;
  designStart: string;
  designEnd: string;
  designMd: number;
  devOwner: string;
  devStart: string;
  devEnd: string;
  devMd: number;
  testUatOwner: string;
  testUatStart: string;
  testUatEnd: string;
  testUatMd: number;
  gallery?: string;
  /** Manual display order from the "sortOrder" column; empty = after ordered rows, by id. */
  sortOrder?: number | string;
  /** Attached in the app from the "actionItems" tab — never sent to the manday tab. */
  actionItems?: ActionItem[];
}

export interface ActionItem {
  id: string;
  text: string;
  owner: string;
  /** yyyy-MM-dd, may be empty */
  due: string;
  done: boolean;
}

export interface ProjectReport {
  date: string;
  email: string;
  mode: string;
  countaOfProject: number;
}

export interface SearchByBriefReport {
  date: string;
  email: string;
  countaOfEmail: number;
}

export interface ContentIdeaCoPilotReport {
  date: string;
  event: string;
  countaOfEvent: number;
}

