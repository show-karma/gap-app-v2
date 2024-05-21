import { ReactNode, useContext } from "react";

import { useTabsContext } from "./Tabs";

type TabContentProps = {
  value: string;
  children: ReactNode;
}

export const TabContent = ({ value, children }: TabContentProps) => {
  const { activeTab } = useTabsContext()

  if (activeTab !== value) {
    return null;
  }

  return children;
}
