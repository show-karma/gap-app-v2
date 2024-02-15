import { useTheme } from "next-themes";
import dynamic from "next/dynamic";

const Preview = dynamic(() => import("@uiw/react-markdown-preview"), {
  ssr: false,
});

export const MarkdownPreview: typeof Preview = (props) => {
  const { theme: currentTheme } = useTheme();
  return (
    <div className="text-black dark:text-white prose preview w-full max-w-full">
      <Preview
        {...props}
        style={{
          backgroundColor: "transparent",
          color: currentTheme === "dark" ? "white" : "black",
          width: "100%",
        }}
      />
    </div>
  );
};
