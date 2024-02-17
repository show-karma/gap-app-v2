import { useTheme } from "next-themes";
import dynamic from "next/dynamic";

const Preview = dynamic(() => import("@uiw/react-markdown-preview"), {
  ssr: false,
});

export const MarkdownPreview: typeof Preview = (props) => {
  const { theme: currentTheme } = useTheme();
  return (
    <div className="preview w-full max-w-full">
      <Preview
        style={{
          backgroundColor: "transparent",
          color: currentTheme === "dark" ? "white" : "rgb(36, 41, 47)",
          width: "100%",
        }}
        {...props}
      />
    </div>
  );
};
