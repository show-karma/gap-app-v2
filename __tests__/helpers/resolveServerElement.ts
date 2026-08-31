import type { ReactElement, ReactNode } from "react";
import { isValidElement, Suspense } from "react";

const isAsyncComponent = (type: unknown): type is (props: unknown) => Promise<ReactNode> =>
  typeof type === "function" && type.constructor?.name === "AsyncFunction";

/**
 * Walk a server-component tree far enough to render it with the client
 * renderer: unwrap Suspense boundaries and invoke async components (which the
 * client renderer cannot). Sync components are left alone so testing-library
 * renders them normally and any sentinel mocks still mount. Errors thrown by an
 * async component — notFound()'s NEXT_NOT_FOUND digest in particular —
 * propagate as a rejection of this promise.
 *
 * Two page shapes are in play across the app. The classic one is an async Page
 * that awaits params at the top. The streaming one is a sync Page returning
 * <Suspense><Body params={props.params}/></Suspense>, where Body is the async
 * component that awaits params. This normalises both to the same rendered tree,
 * so a page's assertions are identical either way.
 */
export const resolveServerElement = async (node: ReactNode): Promise<ReactNode> => {
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<{ children?: ReactNode }>;

  if (element.type === Suspense) {
    return resolveServerElement(element.props.children);
  }
  if (isAsyncComponent(element.type)) {
    return resolveServerElement(await element.type(element.props));
  }
  return element;
};
