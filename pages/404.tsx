import React from "react";
import Link from "next/link";

const NotFoundPage: React.FC = () => {
  return (
    <div className="col-span-12 min-h-screen">
      <h1 className="text-3xl mb-5">404 - Page Not Found</h1>
      <Link href="/">Go Home</Link>
    </div>
  );
};

export default NotFoundPage;
