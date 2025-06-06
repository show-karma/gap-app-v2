export interface ImpactIndicatorWithData {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  createdAt?: string;
  updatedAt?: string;
  programs: {
    programId: string;
    chainID: number;
  }[];
  datapoints: {
    value: number | string;
    proof: string;
    startDate: string;
    endDate: string;
    outputTimestamp?: string;
  }[];
  hasData: boolean;
  isAssociatedWithPrograms: boolean;
}

export interface ImpactIndicator {
  id: string;
  name: string;
  description: string;
  programs?: {
    programId: string;
    chainID: number;
  }[];
  unitOfMeasure: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ImpactSegment {
  id: string;
  name: string;
  description: string;
  type: "output" | "outcome";
  impact_indicators?: ImpactIndicator[];
}

export interface Category {
  id: string;
  name: string;
  impact_segments?: ImpactSegment[];
  outputs?: {
    id: string;
    name: string;
    categoryId: string;
    type: "output" | "outcome";
  }[];
}
