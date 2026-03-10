const HeadingAsBold = ({ children }: { children?: React.ReactNode }) => (
  <p>
    <strong>{children}</strong>
  </p>
);

export const HEADING_AS_BOLD_COMPONENTS = {
  h1: HeadingAsBold,
  h2: HeadingAsBold,
  h3: HeadingAsBold,
  h4: HeadingAsBold,
  h5: HeadingAsBold,
  h6: HeadingAsBold,
};
