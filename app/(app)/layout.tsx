import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "react-hot-toast";
import { ProgressBarWrapper } from "@/components/ProgressBarWrapper";
import { Footer } from "@/src/components/footer/footer";
import { Navbar } from "@/src/components/navbar/navbar";
import { AppProviders } from "./providers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <Toaster
        position="top-right"
        toastOptions={{
          className: "toast-content",
          style: {
            maxWidth: "500px",
            wordWrap: "break-word",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          },
          duration: 4000,
        }}
        containerStyle={{
          top: 20,
          right: 20,
        }}
      />
      <ProgressBarWrapper />
      <div className="min-h-screen flex flex-col justify-between h-full text-gray-700 bg-white dark:bg-black dark:text-white">
        <div className="flex flex-col w-full h-full">
          <Navbar />
          <div className="h-[80px]" />
          {children}
          <Analytics />
        </div>
        <Footer />
      </div>
    </AppProviders>
  );
}
