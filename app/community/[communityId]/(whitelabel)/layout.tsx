export default function WhitelabelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">{children}</div>
  );
}
