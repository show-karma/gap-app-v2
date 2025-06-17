"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export const NavigationLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let hideTimeout: NodeJS.Timeout;

    const handleStart = () => {
      setIsLoading(true);
      setProgress(10);
      
      // Gradual progress simulation
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return Math.min(prev + Math.random() * 20, 85);
        });
      }, 150);
    };

    const handleComplete = () => {
      setProgress(100);
      clearInterval(progressInterval);
      
      // Hide after completion
      hideTimeout = setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 200);
    };

    // Intercept router.push calls
    const originalPush = window.history.pushState;
    
    window.history.pushState = function(state: any, title: string, url?: string | URL | null) {
      // Only show loader for different routes
      if (url && url !== window.location.pathname) {
        handleStart();
      }
      const result = originalPush.call(window.history, state, title, url);
      return result;
    };

    return () => {
      clearInterval(progressInterval);
      clearTimeout(hideTimeout);
      window.history.pushState = originalPush;
    };
  }, []);

  // Handle route changes
  useEffect(() => {
    const handleComplete = () => {
      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 200);
    };

    // Route has changed, complete the loading
    if (isLoading) {
      handleComplete();
    }
  }, [pathname, isLoading]);

  if (!isLoading) return null;

  return (
    <>
      {/* Sleek progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-transparent">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 transition-all duration-300 ease-out"
          style={{ 
            width: `${progress}%`,
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
          }}
        />
      </div>
      
      {/* Minimal loading indicator - only show if loading takes longer */}
      {progress > 30 && (
        <div className="fixed top-6 right-6 z-[9998] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full shadow-lg px-3 py-2 flex items-center gap-2 animate-in slide-in-from-right-2 fade-in">
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Loading</span>
        </div>
      )}
    </>
  );
}; 