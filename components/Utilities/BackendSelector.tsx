'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { getAPIUrl } from '@/lib/config';

interface RailwayEnvironment {
  name: string;
  url: string;
  prNumber?: string;
  status?: string;
}

// Fetch Railway environments from API
const fetchRailwayEnvironments = async (): Promise<RailwayEnvironment[]> => {
  try {
    const response = await fetch('/api/railway-environments');
    
    if (response.ok) {
      const data = await response.json();
      return data.environments || [];
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch Railway environments:', error);
    return [];
  }
};

export default function BackendSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [environments, setEnvironments] = useState<RailwayEnvironment[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  
  // Only show when not in production
  const isNotProduction = process.env.NEXT_PUBLIC_ENV !== 'production';
  
  useEffect(() => {
    // Load saved URL from localStorage
    const savedUrl = localStorage.getItem('selectedBackendUrl');
    if (savedUrl) {
      setSelectedUrl(savedUrl);
      // Override the API URL globally
      if (window) {
        (window as any).__OVERRIDE_API_URL = savedUrl;
      }
    } else {
      setSelectedUrl(getAPIUrl());
    }
  }, []);
  
  useEffect(() => {
    if (isOpen && environments.length === 0) {
      loadEnvironments();
    }
  }, [isOpen]);
  
  const loadEnvironments = async () => {
    setIsLoading(true);
    try {
      const envs = await fetchRailwayEnvironments();
      setEnvironments(envs);
    } catch (error) {
      console.error('Failed to load environments:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectUrl = (url: string) => {
    setSelectedUrl(url);
    localStorage.setItem('selectedBackendUrl', url);
    
    // Override the API URL globally
    if (window) {
      (window as any).__OVERRIDE_API_URL = url;
    }
    
    // Refresh the page to apply the new backend URL
    window.location.reload();
  };
  
  const handleReset = () => {
    localStorage.removeItem('selectedBackendUrl');
    if (window) {
      delete (window as any).__OVERRIDE_API_URL;
    }
    setSelectedUrl(getAPIUrl());
    window.location.reload();
  };
  
  const handleCustomUrlSubmit = () => {
    if (customUrl) {
      handleSelectUrl(customUrl);
    }
  };
  
  // Don't render in production
  if (!isNotProduction) {
    return null;
  }
  
  return (
    <>
      {/* Floating button */}
      <button
        className="fixed bottom-5 right-5 w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-200 z-[9999]"
        onClick={() => setIsOpen(true)}
        title="Select Backend Environment"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
        </svg>
      </button>
      
      {/* Modal */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-95"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-6 text-left align-middle shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold text-gray-900 dark:text-white"
                    >
                      Select Backend Environment
                    </Dialog.Title>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Current Backend */}
                  <div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-lg mb-6">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                      Current Backend:
                    </p>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100 break-all">
                      {selectedUrl}
                    </p>
                  </div>

                  {/* Quick Select */}
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Quick Select:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 transition-all duration-200 text-sm text-gray-700 dark:text-gray-300"
                        onClick={() => handleSelectUrl('http://localhost:3001')}
                      >
                        Local
                      </button>
                      <button
                        className="px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 transition-all duration-200 text-sm text-gray-700 dark:text-gray-300"
                        onClick={() => handleSelectUrl('https://gapstagapi.karmahq.xyz')}
                      >
                        Staging
                      </button>
                      <button
                        className="px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 transition-all duration-200 text-sm text-gray-700 dark:text-gray-300"
                        onClick={() => handleSelectUrl('https://gapapi.karmahq.xyz')}
                      >
                        Production
                      </button>
                      <button
                        className="px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500 transition-all duration-200 text-sm text-gray-700 dark:text-gray-300"
                        onClick={handleReset}
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Custom URL */}
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Custom URL:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="https://your-backend.railway.app"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md text-sm font-mono bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCustomUrlSubmit();
                          }
                        }}
                      />
                      <button
                        onClick={handleCustomUrlSubmit}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Railway Environments */}
                  {environments.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Railway Environments:
                        </p>
                        <button
                          onClick={loadEnvironments}
                          disabled={isLoading}
                          className={`text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors ${
                            isLoading ? 'opacity-50 cursor-not-allowed animate-spin' : ''
                          }`}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                      </div>

                      {isLoading ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Loading environments...
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-zinc-700 rounded-lg">
                          {environments.map((env) => (
                            <div
                              key={env.name}
                              className={`p-3 border-b last:border-b-0 border-gray-100 dark:border-zinc-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800 ${
                                selectedUrl === env.url
                                  ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-l-blue-500'
                                  : ''
                              }`}
                              onClick={() => handleSelectUrl(env.url)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                  {env.name}
                                </span>
                                {env.prNumber && (
                                  <span className="text-xs bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">
                                    PR #{env.prNumber}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                                {env.url}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}