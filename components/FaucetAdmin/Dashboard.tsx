"use client"

import { Tab } from "@headlessui/react"
import {
  BanknotesIcon,
  ChartBarIcon,
  CogIcon,
  GlobeAltIcon,
  LinkIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline"
import { useState } from "react"
import { cn } from "@/utilities/tailwind"
import { UsageAnalytics } from "./Analytics/UsageAnalytics"
import { ChainBalances } from "./Balances/ChainBalances"
import { BlocklistManager } from "./Blocklist/BlocklistManager"
import { ChainSettingsManager } from "./ChainSettings/ChainSettingsManager"
import { ChainManager } from "./Chains/ChainManager"
import { GlobalConfigForm } from "./GlobalConfig/GlobalConfigForm"
import { WhitelistManager } from "./Whitelist/WhitelistManager"

const tabs = [
  { name: "Overview", icon: ChartBarIcon },
  { name: "Chains", icon: LinkIcon },
  { name: "Chain Settings", icon: CogIcon },
  { name: "Global Config", icon: GlobeAltIcon },
  { name: "Whitelist", icon: ShieldCheckIcon },
  { name: "Blocklist", icon: ShieldExclamationIcon },
  { name: "Balances", icon: BanknotesIcon },
]

export function FaucetAdminDashboard() {
  const [selectedIndex, setSelectedIndex] = useState(0)

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
        <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <Tab.List className="flex space-x-1 rounded-xl bg-white dark:bg-zinc-800 p-1 shadow-sm mb-8">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  cn(
                    "w-full rounded-lg py-2.5 px-3 text-sm font-medium leading-5",
                    "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                    "transition-all duration-200",
                    selected
                      ? "bg-blue-500 text-white shadow"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white"
                  )
                }
              >
                <div className="flex items-center justify-center space-x-2">
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </div>
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels>
            {/* Overview Tab */}
            <Tab.Panel className="space-y-6">
              <UsageAnalytics />
            </Tab.Panel>

            {/* Chains Tab */}
            <Tab.Panel>
              <ChainManager />
            </Tab.Panel>

            {/* Chain Settings Tab */}
            <Tab.Panel>
              <ChainSettingsManager />
            </Tab.Panel>

            {/* Global Config Tab */}
            <Tab.Panel>
              <GlobalConfigForm />
            </Tab.Panel>

            {/* Whitelist Tab */}
            <Tab.Panel>
              <WhitelistManager />
            </Tab.Panel>

            {/* Blocklist Tab */}
            <Tab.Panel>
              <BlocklistManager />
            </Tab.Panel>

            {/* Balances Tab */}
            <Tab.Panel>
              <ChainBalances />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  )
}
