import React from "react";

interface Props {
  children: React.ReactNode;
}

export default function Paragraph(props: Props) {
  return (
    <>
      <p className="text-zinc-700 mt-3 text-xl">{props.children}</p>
    </>
  );
}
