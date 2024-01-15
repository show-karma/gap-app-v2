import "@/styles/globals.css";
import "@/styles/index.scss";
import "@rainbow-me/rainbowkit/styles.css";
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import {
  lightTheme,
  getDefaultWallets,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import { base, polygonMumbai } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";
import Footer from "@/components/Utilities/Footer";
import Header from "@/components/Utilities/Header";
import ThemeContextWrapper from "@/components/Providers/ThemeContextWrapper";

export default function App({ Component, pageProps }: AppProps) {
  const [ready, setReady] = useState(false);

  const deployedChains: any =
    process.env.NEXT_PUBLIC_ENV === "staging" ? [polygonMumbai] : [base];

  const { publicClient, chains } = configureChains(deployedChains, [
    publicProvider(),
  ]);

  const { connectors } = getDefaultWallets({
    appName: "NounerKarma",
    projectId: "032e7d86545e1e9d28e796da73f4f4c1",
    chains,
  });

  const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
  });

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <>
      {ready ? (
        <WagmiConfig config={wagmiConfig}>
          <RainbowKitProvider
            chains={chains}
            theme={lightTheme({
              accentColor: "#E40536",
              accentColorForeground: "white",
              borderRadius: "medium",
            })}
          >
            <ThemeContextWrapper>
              <div className="min-h-screen flex flex-col justify-between h-full bg-gray-100 dark:bg-black dark:text-white">
                <div>
                  <div className="fixed w-full bg-white dark:bg-black z-10">
                    <Header />
                  </div>
                  <div className="h-[68px] w-full" />
                  <div className="py-5 md:py-10">
                    <div className="mx-auto max-w-3xl sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-12 lg:gap-8 lg:px-8">
                      <Layout Component={Component} pageProps={pageProps} />
                    </div>
                  </div>
                </div>
                <Footer />
              </div>
            </ThemeContextWrapper>
          </RainbowKitProvider>
        </WagmiConfig>
      ) : null}
    </>
  );
}

const Layout = ({ Component, pageProps }: any) => {
  if (Component.getLayout) {
    return Component.getLayout(<Component {...pageProps} />);
  } else {
    return <Component {...pageProps} />;
  }
};
