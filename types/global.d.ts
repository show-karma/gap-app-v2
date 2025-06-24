/// <reference types="react" />
/// <reference types="react-dom" />

declare module 'react' {
  export = React;
  export as namespace React;
}

declare module '@tanstack/react-query' {
  export * from '@tanstack/react-query';
}

declare module 'wagmi' {
  export * from 'wagmi';
}

declare module '@show-karma/karma-gap-sdk/core/class/entities/Project' {
  export interface Project {
    isOwner: (rpcClient: any, address: string) => Promise<boolean>;
    isAdmin: (rpcClient: any, address: string) => Promise<boolean>;
  }
}

declare module '@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types' {
  export interface IProjectDetails {
    data: {
      links?: Array<{
        type: string;
        url: string;
      }>;
      imageURL?: string;
      title?: string;
      tags?: Array<{
        name: string;
      }>;
    };
  }
  
  export interface IProjectResponse {
    uid: string;
    recipient?: string;
    chainID?: number;
    details?: IProjectDetails;
    members?: Array<{
      uid: string;
      recipient: string;
      details?: {
        name?: string;
      };
    }>;
    grants?: Array<any>;
  }
}

declare module '@show-karma/karma-gap-sdk' {
  export interface ContributorProfile {
    // Add properties as needed
  }
}