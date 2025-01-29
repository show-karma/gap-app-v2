export interface ImpactIndicatorWithData {
  id: string;
  name: string;
  description: string;
  unitOfMeasure: string;
  createdAt?: string;
  updatedAt?: string;
  datapoints: {
    value: number | string;
    proof: string;
    startDate: string;
    endDate: string;
    outputTimestamp?: string;
  }[];
}

export interface ImpactIndicator {
  id: string;
  name: string;
  description: string;
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
