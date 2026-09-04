// Single main landmark for /donations (#1309). Lives in the layout so every
// branch of the client page (auth gate, loading, error, empty, success) is
// covered by the same landmark without repeating it per return.
export default function DonationsLayout({ children }: { children: React.ReactNode }) {
  return <main className="flex w-full flex-col">{children}</main>;
}
