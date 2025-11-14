import { layoutTheme } from "@/src/helper/theme"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <div className={layoutTheme.padding}>{children}</div>
}
