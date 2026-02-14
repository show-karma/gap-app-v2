export function visit(tree: any, visitor: (node: any, index: any, parent: any) => void) {
  function walk(node: any, index: any, parent: any) {
    visitor(node, index, parent);
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        walk(node.children[i], i, node);
      }
    }
  }
  walk(tree, undefined, undefined);
}
