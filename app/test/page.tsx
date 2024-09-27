export default function Page() {
  console.log(process.env.VERCEL_ENV);
  console.log(process.env.NEXT_PUBLIC_SENTRY_DSN);
  throw new Error("This is a test error");
  return <div>Test</div>;
}
