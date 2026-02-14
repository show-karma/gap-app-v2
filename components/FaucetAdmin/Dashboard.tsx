"use client";

import {
  BanknotesIcon,
  ChartBarIcon,
  CogIcon,
  GlobeAltIcon,
  LinkIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/utilities/tailwind";
import { UsageAnalytics } from "./Analytics/UsageAnalytics";
import { ChainBalances } from "./Balances/ChainBalances";
import { BlocklistManager } from "./Blocklist/BlocklistManager";
import { ChainSettingsManager } from "./ChainSettings/ChainSettingsManager";
import { ChainManager } from "./Chains/ChainManager";
import { GlobalConfigForm } from "./GlobalConfig/GlobalConfigForm";
import { WhitelistManager } from "./Whitelist/WhitelistManager";

const tabs = [
  { name: "Overview", value: "overview", icon: ChartBarIcon },
  { name: "Chains", value: "chains", icon: LinkIcon },
  { name: "Chain Settings", value: "chain-settings", icon: CogIcon },
  { name: "Global Config", value: "global-config", icon: GlobeAltIcon },
  { name: "Whitelist", value: "whitelist", icon: ShieldCheckIcon },
  { name: "Blocklist", value: "blocklist", icon: ShieldExclamationIcon },
  { name: "Balances", value: "balances", icon: BanknotesIcon },
];

export function FaucetAdminDashboard() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Faucet Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage faucet settings, monitor balances, and control fund distribution
          </p>
        </div>

        {/* Tab Navigation */}
        <Tabs defaultValue="overview">
          <TabsList className="flex space-x-1 rounded-xl bg-white dark:bg-zinc-800 p-1 shadow-sm mb-8 h-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "w-full rounded-lg py-2.5 px-3 text-sm font-medium leading-5",
                  "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                  "transition-all duration-200",
                  "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white",
                  "data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow"
                )}
              >
                <div className="flex items-center justify-center space-x-2">
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <UsageAnalytics />
          </TabsContent>

          <TabsContent value="chains">
            <ChainManager />
          </TabsContent>

          <TabsContent value="chain-settings">
            <ChainSettingsManager />
          </TabsContent>

          <TabsContent value="global-config">
            <GlobalConfigForm />
          </TabsContent>

          <TabsContent value="whitelist">
            <WhitelistManager />
          </TabsContent>

          <TabsContent value="blocklist">
            <BlocklistManager />
          </TabsContent>

          <TabsContent value="balances">
            <ChainBalances />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
