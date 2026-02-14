import React from "react";

function Markdown({ children }: { children?: string }) {
  return <div data-testid="react-markdown">{children}</div>;
}

export default Markdown;
