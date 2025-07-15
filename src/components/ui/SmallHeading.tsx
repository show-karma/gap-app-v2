import React from "react";

interface Props {
  children: string;
}

export default function SmallHeading(props: Props) {
  return (
    <>
      <div className="text-zinc-900 mt-8 text-2xl font-semibold">
        {props.children}
      </div>
    </>
  );
}
