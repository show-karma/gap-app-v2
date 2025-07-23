import { SpeedInsights } from "@vercel/speed-insights/next";
import { defaultMetadata } from "@/utilities/meta";
import "@/styles/globals.css";
import "@/styles/index.scss";
import "@/components/Utilities/DynamicStars/styles.css";
import "@rainbow-me/rainbowkit/styles.css";
import "rc-slider/assets/index.css";
import "react-day-picker/dist/style.css";
import "@uiw/react-markdown-preview/markdown.css";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { headers } from "next/headers";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { ContributorProfileDialog } from "@/components/Dialogs/ContributorProfileDialog";
import { StepperDialog } from "@/components/Dialogs/StepperDialog";
import { ProgressBarWrapper } from "@/components/ProgressBarWrapper";
import Footer from "@/components/Utilities/Footer";
import Header from "@/components/Utilities/Header";
import HotjarAnalytics from "@/components/Utilities/HotjarAnalytics";
import WagmiProvider from "@/components/Utilities/WagmiProvider";

export const metadata = defaultMetadata;

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const cookie = (await headers()).get("cookie") ?? "";
	return (
		<html lang="en" className="h-full" suppressHydrationWarning>
			{process.env.NEXT_PUBLIC_GA_TRACKING_ID &&
				process.env.NEXT_PUBLIC_ENV === "production" && (
					<GoogleAnalytics
						gaId={process.env.NEXT_PUBLIC_GA_TRACKING_ID as string}
					/>
				)}
			<Suspense>
				<HotjarAnalytics />
			</Suspense>
			<body suppressHydrationWarning>
				<ThemeProvider
					defaultTheme="light"
					attribute="class"
					enableSystem={true}
					disableTransitionOnChange
				>
					<WagmiProvider cookie={cookie}>
						<Toaster />
						<StepperDialog />
						<ContributorProfileDialog />
						<ProgressBarWrapper />
						<div className="min-h-screen flex flex-col justify-between h-full text-gray-700 bg-white dark:bg-black dark:text-white">
							<div className="flex flex-col w-full h-full">
								<div className="fixed w-full bg-white dark:bg-black z-10">
									<Header />
								</div>
								<div className="h-[72px] w-full" />
								{children}
								<Analytics />
							</div>
							<Footer />
						</div>
					</WagmiProvider>
					<SpeedInsights />
				</ThemeProvider>
			</body>
		</html>
	);
}
