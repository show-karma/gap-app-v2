/// <reference types="react" />
/// <reference types="react-dom" />

// React module declaration
declare module 'react' {
  import React = require('react');
  export = React;
}

// Next.js Image module declaration
declare module 'next/image' {
  import { FC } from 'react';
  
  interface ImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
    quality?: number;
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    loader?: any;
    fill?: boolean;
    sizes?: string;
    unoptimized?: boolean;
  }
  
  const Image: FC<ImageProps>;
  export default Image;
}

// React Query module declaration
declare module '@tanstack/react-query' {
  export interface UseQueryOptions<TData = unknown, TError = unknown> {
    queryKey: any[];
    queryFn: () => Promise<TData>;
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchOnMount?: boolean | 'always';
    refetchOnWindowFocus?: boolean | 'always';
    refetchInterval?: number | false;
    retry?: boolean | number;
  }
  
  export interface UseQueryResult<TData = unknown, TError = unknown> {
    data: TData | undefined;
    error: TError | null;
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    isSuccess: boolean;
    refetch: () => void;
  }
  
  export function useQuery<TData = unknown, TError = unknown>(
    options: UseQueryOptions<TData, TError>
  ): UseQueryResult<TData, TError>;
  
  export interface UseMutationOptions<TData = unknown, TError = unknown, TVariables = void> {
    mutationFn: (variables: TVariables) => Promise<TData>;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: TError, variables: TVariables) => void;
  }
  
  export function useMutation<TData = unknown, TError = unknown, TVariables = void>(
    options: UseMutationOptions<TData, TError, TVariables>
  ): any;
  
  export function useQueryClient(): any;
  
  export type QueryKey = ReadonlyArray<unknown>;
  export type QueryOptions = any;
}

// Wagmi module declaration
declare module 'wagmi' {
  export interface UseAccountResult {
    address: string | undefined;
    isConnected: boolean;
    isConnecting: boolean;
    isDisconnected: boolean;
    connector: any;
    status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  }
  
  export function useAccount(): UseAccountResult;
  
  export interface UseSignerResult {
    data: any;
    error: Error | null;
    isLoading: boolean;
  }
  
  export function useSigner(): UseSignerResult;
  
  export interface Config {
    // Add config properties as needed
  }
}

// Karma Gap SDK type declarations
declare module '@show-karma/karma-gap-sdk' {
  export interface ContributorProfile {
    uid: string;
    name?: string;
    avatar?: string;
    // Add other properties as needed
  }
  
  export class Project {
    isOwner(rpcClient: any, address: string): Promise<boolean>;
    isAdmin(rpcClient: any, address: string): Promise<boolean>;
    // Add other methods as needed
  }
}

declare module '@show-karma/karma-gap-sdk/core/class/entities/Project' {
  export class Project {
    isOwner(rpcClient: any, address: string): Promise<boolean>;
    isAdmin(rpcClient: any, address: string): Promise<boolean>;
    // Add other methods as needed
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
    grants?: Array<{
      uid: string;
      [key: string]: any;
    }>;
  }
  
  export interface IGrantResponse {
    uid: string;
    // Add other grant properties as needed
  }
}