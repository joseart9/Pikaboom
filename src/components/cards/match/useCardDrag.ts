"use client";

// React binding for the drag controller (§17.7, Phase 12). The controller is created once; its host callbacks are
// replaced after every commit, so they always see the latest legal actions and interaction state without
// re-attaching listeners. The returned state changes only on discrete drag events (never per pointermove).
import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { DragController, type DragHost, type DragState } from "@/game/cards/client/drag";

export function useCardDrag(host: DragHost): {
  controller: DragController;
  drag: DragState;
  rootRef: (el: HTMLElement | null) => (() => void) | undefined;
} {
  const [controller] = useState(() => new DragController());
  useLayoutEffect(() => {
    controller.setHost(host);
  });
  const drag = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  // Callback ref: the battlefield root appears only once the board has loaded.
  const rootRef = useCallback((el: HTMLElement | null) => (el ? controller.attach(el) : undefined), [controller]);
  return { controller, drag, rootRef };
}
