"use client";
export default function Page() {
  console.log(process.env.VERCEL_ENV);
  console.log(process.env.NEXT_PUBLIC_SENTRY_DSN);
  return (
    <div>
      Test
      <button
        onClick={() => {
          throw new Error("This is a test error");
        }}
      >
        Boom!
      </button>
    </div>
  );
}
