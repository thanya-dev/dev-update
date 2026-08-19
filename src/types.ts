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
}

export interface GroupedReleases {
  monthKey: string;
  monthLabel: string;
  year: number;
  releases: ReleaseData[];
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

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'metabase-dashboard': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        token: string;
        'with-title'?: string;
        'with-downloads'?: string;
      };
    }
  }
}
