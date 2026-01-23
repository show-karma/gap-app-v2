/**
 * Funding Layout
 *
 * This layout is now a pass-through to support the v2 redesign.
 * The main /funding page uses the new v2 ProjectFundingPage layout.
 * Sub-routes like /funding/[grantUid] use GrantsLayout component directly.
 */
const FundingLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default FundingLayout;
