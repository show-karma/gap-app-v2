import { createContext, type ReactNode, useContext, useState } from "react";

type TabsContextType = {
	activeTab?: string;
	setActiveTab: (tab: string) => void;
};

export const TabsContext = createContext<TabsContextType>({
	activeTab: undefined,
	setActiveTab: () => {},
});

export const useTabsContext = () => {
	return useContext(TabsContext);
};

type TabsProps = {
	defaultTab: string;
	children: ReactNode;
};

export const Tabs = ({ defaultTab, children }: TabsProps) => {
	const [activeTab, setActiveTab] = useState<string>(defaultTab);

	return (
		<TabsContext.Provider value={{ activeTab, setActiveTab }}>
			{children}
		</TabsContext.Provider>
	);
};
