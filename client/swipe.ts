import { useCallback, useMemo, useRef } from "react";
import { PanResponder } from "react-native";

export type SwipeDirection = "left" | "right";

export type HorizontalSwipeOptions = {
  /** 关掉时返回空对象，宿主原样透传 */
  enabled: boolean;
  onSwipe: (direction: SwipeDirection) => void;
  /** 起步位移，超过才算横向意图，避免和竖向滚动抢 */
  startDistance?: number;
  /** 松手时的判定位移 */
  commitDistance?: number;
  /** 松手时的判定速度（每毫秒像素） */
  commitVelocity?: number;
};

export type HorizontalSwipe = {
  panHandlers: Record<string, unknown>;
  /** 刚滑过就返回 true：宿主会把滑动同时当成一次点击，按压要跳过 */
  justSwiped: () => boolean;
};

const PRESS_GUARD_MS = 500;

/**
 * 横向滑动判定：只在明显比竖向更横时接管，
 * 让竖向滚动、横向表格照常工作。
 */
export function useHorizontalSwipe({
  enabled,
  onSwipe,
  startDistance = 24,
  commitDistance = 72,
  commitVelocity = 0.4,
}: HorizontalSwipeOptions): HorizontalSwipe {
  const swipedAt = useRef(0);
  const callback = useRef(onSwipe);
  callback.current = onSwipe;

  const panHandlers = useMemo<Record<string, unknown>>(() => {
    // 手机宿主与桌面宿主的运行时不保证一致，取不到就退回不接管
    const creator = (PanResponder as { create?: unknown } | undefined)?.create;
    if (!enabled || typeof creator !== "function") return {};

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => {
        const dx = Math.abs(gesture.dx);
        const dy = Math.abs(gesture.dy);
        if (dx <= startDistance || dx <= dy * 2) return false;
        swipedAt.current = Date.now();
        return true;
      },
      // 被 ScrollView 或宿主抢走时不硬顶
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_event, gesture) => {
        swipedAt.current = Date.now();
        const dx = gesture.dx;
        const fast = Math.abs(gesture.vx) > commitVelocity;
        if (Math.abs(dx) < startDistance) return;
        if (Math.abs(dx) < commitDistance && !fast) return;
        callback.current(dx < 0 ? "left" : "right");
      },
    }).panHandlers as Record<string, unknown>;
  }, [enabled, startDistance, commitDistance, commitVelocity]);

  const justSwiped = useCallback(() => Date.now() - swipedAt.current < PRESS_GUARD_MS, []);

  return { panHandlers, justSwiped };
}
