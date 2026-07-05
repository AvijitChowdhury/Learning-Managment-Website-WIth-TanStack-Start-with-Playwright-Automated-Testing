/**
 * Google Translate mutates the DOM by wrapping text nodes in <font> tags.
 * When React later tries to remove/replace those text nodes, it calls
 * removeChild / insertBefore on nodes whose real parent is now the <font>
 * wrapper, throwing "Failed to execute 'removeChild' on 'Node'" and
 * crashing the whole app.
 *
 * This patch makes those DOM ops resilient: if the child's parent has
 * changed (because Google Translate re-parented it), we fall back to a
 * safe no-op / append instead of throwing. Applied once, as early as
 * possible on the client.
 *
 * Refs: https://github.com/facebook/react/issues/11538
 */
export function installGoogleTranslateFix() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __gtFixInstalled?: boolean };
  if (w.__gtFixInstalled) return;
  w.__gtFixInstalled = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        try {
          child.parentNode.removeChild(child);
        } catch {
          /* ignore */
        }
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  } as typeof Node.prototype.removeChild;

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  } as typeof Node.prototype.insertBefore;
}
