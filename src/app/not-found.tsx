import React from "react";
import Link from "next/link";
import { defaultMetadata } from "@/utilities/meta";

export const metadata = defaultMetadata;

const NotFoundPage: React.FC = () => {
  return (
    <div className="col-span-12 min-h-screen px-4 py-4">
      <h1 className="text-3xl mb-5">404 - Page Not Found</h1>
      <Link href="/">Go Home</Link>
    </div>
  );
};

export default NotFoundPage;
