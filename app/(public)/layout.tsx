import { Analytics } from "@vercel/analytics/react";
import { ProgressBarWrapper } from "@/components/ProgressBarWrapper";
import { Footer } from "@/src/components/footer/footer";
import { NavbarPublic } from "@/src/components/navbar/navbar-public";
import { PublicProviders } from "./providers";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicProviders>
      <ProgressBarWrapper />
      <div className="min-h-screen flex flex-col justify-between h-full text-gray-700 bg-white dark:bg-black dark:text-white">
        <div className="flex flex-col w-full h-full">
          <NavbarPublic />
          <div className="h-[80px]" />
          {children}
          <Analytics />
        </div>
        <Footer />
      </div>
    </PublicProviders>
  );
}
