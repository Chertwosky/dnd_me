export function startViewTransition(update: () => void) {
  if (typeof document === "undefined") {
    update();
    return;
  }

  const startTransition = (
    document as Document & {
      startViewTransition?: (callback: () => void) => void;
    }
  ).startViewTransition;

  if (typeof startTransition === "function") {
    startTransition.call(document, update);
    return;
  }

  update();
}
