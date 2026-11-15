import { useCallback, useMemo, useRef } from "react";
import { PanResponder } from "react-native";

export type SwipeDirection = "left" | "right";

export type HorizontalSwipeOptions = {
  /** 关掉时返回空对象，宿主原样透传 */
  enabled: boolean;
  onSwipe: (direction: SwipeDirection) => void;
  /** 允许接管的方向；不列的方向不接管，留给宿主（如手机的右滑拉出侧边栏） */
  directions?: SwipeDirection[];
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
/** 接管之后几乎没再动，就当点击 */
const MIN_TRAVEL = 6;

/**
 * 横向滑动判定：只在明显比竖向更横时接管，
 * 让竖向滚动、横向表格照常工作。
 *
 * 注意：接管发生在手指已经走了 startDistance 之后，所以位移从接管那刻算起，
 * 比手势的实际长度短。松手时用移动过程中记录的最大位移判断。
 */
export function useHorizontalSwipe({
  enabled,
  onSwipe,
  directions = ["left", "right"],
  startDistance = 14,
  commitDistance = 36,
  commitVelocity = 0.25,
}: HorizontalSwipeOptions): HorizontalSwipe {
  const swipedAt = useRef(0);
  const callback = useRef(onSwipe);
  callback.current = onSwipe;
  const allowed = directions.join(",");

  const panHandlers = useMemo<Record<string, unknown>>(() => {
    // 手机宿主与桌面宿主的运行时不保证一致，取不到就退回不接管
    const creator = (PanResponder as { create?: unknown } | undefined)?.create;
    if (!enabled || typeof creator !== "function") return {};
    const left = allowed.includes("left");
    const right = allowed.includes("right");

    const start = { x: 0, y: 0, at: 0 };
    const travel = { dx: 0, dy: 0 };

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => {
        const dx = gesture.dx;
        const dy = Math.abs(gesture.dy);
        // 方向不允许就不接管，手势留给宿主
        if (dx < 0 ? !left : !right) return false;
        if (Math.abs(dx) <= startDistance || Math.abs(dx) <= dy * 2) return false;
        swipedAt.current = Date.now();
        return true;
      },
      // 被 ScrollView 或宿主抢走时不硬顶
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (event) => {
        const { pageX, pageY } = event.nativeEvent;
        start.x = typeof pageX === "number" ? pageX : 0;
        start.y = typeof pageY === "number" ? pageY : 0;
        start.at = Date.now();
        travel.dx = 0;
        travel.dy = 0;
      },
      onPanResponderMove: (event) => {
        const { pageX, pageY } = event.nativeEvent;
        if (typeof pageX !== "number" || typeof pageY !== "number") return;
        const dx = pageX - start.x;
        if (Math.abs(dx) > Math.abs(travel.dx)) travel.dx = dx;
        if (Math.abs(pageY - start.y) > Math.abs(travel.dy)) travel.dy = pageY - start.y;
      },
      onPanResponderRelease: (_event, gesture) => {
        swipedAt.current = Date.now();
        // 移动事件里没记录到就用宿主的数字兜底
        const dx = travel.dx !== 0 ? travel.dx : gesture.dx;
        const dy = travel.dy !== 0 ? travel.dy : gesture.dy;
        const elapsed = Math.max(1, Date.now() - start.at);
        if (Math.abs(dx) < MIN_TRAVEL) return;
        // 斜着划也要求横向占优
        if (Math.abs(dx) < Math.abs(dy) * 1.2) return;
        const direction: SwipeDirection = dx < 0 ? "left" : "right";
        if (direction === "left" ? !left : !right) return;
        const far = Math.abs(dx) >= commitDistance;
        const flick = Math.abs(dx) / elapsed >= commitVelocity;
        if (!far && !flick) return;
        callback.current(direction);
      },
    }).panHandlers as Record<string, unknown>;
  }, [enabled, allowed, startDistance, commitDistance, commitVelocity]);

  const justSwiped = useCallback(() => Date.now() - swipedAt.current < PRESS_GUARD_MS, []);

  return { panHandlers, justSwiped };
}
