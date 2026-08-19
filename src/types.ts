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
