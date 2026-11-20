import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { FONT, palette } from "./style";

type Props = {
  theme: PluginScreenProps["theme"];
  layout: PluginScreenProps["layout"];
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 常驻底部的主操作，不随内容滚动 */
  footer?: ReactNode;
  /** false 时标题栏不画关闭按钮，默认 true */
  closeButton?: boolean;
  /** false 时点遮罩不关闭，默认 true */
  dismissible?: boolean;
  /** true 时键盘弹起后把内容滚到末尾，让输入框露出来 */
  scrollInputIntoView?: boolean;
};

/**
 * 主题化的弹层，替换宿主 Modal。
 * 宿主 Modal 的标题栏由 App 主题绘制（白色），会割裂纸色配色；
 * 这里整套自绘：手机是底部 sheet，桌面是居中对话框，遮罩点击关闭，内容区可滚动。
 * footer 常驻底部，收起状态下也点得到主操作。
 */
export function LanternSheet({
  theme,
  layout,
  open,
  title,
  onClose,
  children,
  footer,
  closeButton = true,
  dismissible = true,
  scrollInputIntoView = false,
}: Props) {
  const p = useMemo(() => palette(theme), [theme]);
  const overlay = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const { height: windowHeight } = useWindowDimensions();
  /** 键盘高度：弹起后用它限制弹层高度，避免弹层被顶出屏幕 */
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // 键盘弹起后把内容滚到底，输入框不会被键盘盖住
  useEffect(() => {
    if (!open || keyboardHeight <= 0 || !scrollInputIntoView) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [keyboardHeight, open, scrollInputIntoView]);

  // 只做入场动画：遮罩 160ms 淡入，sheet 200ms 上浮 + 淡入
  useEffect(() => {
    if (!open) return;
    overlay.setValue(0);
    sheet.setValue(0);
    Animated.parallel([
      Animated.timing(overlay, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(sheet, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [open, overlay, sheet]);

  if (!open) return null;

  const compact = layout.compact;
  const translateY = sheet.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  // 键盘弹起时只给键盘留出高度，弹层不能比剩下的空间高
  const keyboardMaxHeight =
    keyboardHeight > 0 ? Math.max(200, windowHeight - keyboardHeight - 16) : null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: overlay }]}>
        <Pressable
          accessibilityViewIsModal
          accessibilityLabel="关闭弹窗"
          style={styles.fill}
          onPress={dismissible ? onClose : undefined}
        />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
        style={compact ? styles.kavMobile : styles.kavDesktop}
      >
        <Animated.View
          style={[
            styles.sheet,
            compact ? styles.sheetMobile : styles.sheetDesktop,
            { backgroundColor: p.paper, opacity: sheet, transform: [{ translateY }] },
            keyboardMaxHeight ? { maxHeight: keyboardMaxHeight } : null,
          ]}
        >
          {compact ? <View style={[styles.grabber, { backgroundColor: p.rule }]} /> : null}
          <View style={styles.titleBar}>
            <Text style={[styles.title, { color: p.ink }]} numberOfLines={1}>
              {title}
            </Text>
            {closeButton ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="关闭"
                hitSlop={8}
                onPress={onClose}
                style={styles.closeButton}
              >
                <Icon name="X" size={20} color={p.muted} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, footer ? styles.scrollContentWithFooter : null]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer ? (
            <View style={[styles.footer, compact ? styles.footerMobile : null]}>{footer}</View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** 手机端曾出现弹层按普通布局排列（不覆盖、被屏幕裁切），所以不用 StyleSheet.absoluteFillObject，逐条写死 */
const FILL = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const styles = StyleSheet.create({
  root: FILL,
  fill: FILL,
  overlay: { ...FILL, backgroundColor: "rgba(0,0,0,0.45)" },
  kavMobile: { ...FILL, justifyContent: "flex-end" },
  kavDesktop: { ...FILL, alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: {
    flexDirection: "column",
    flexShrink: 1,
    overflow: "hidden",
  },
  sheetMobile: {
    width: "100%",
    maxHeight: "88%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetDesktop: {
    width: 520,
    maxWidth: "100%",
    maxHeight: "80%",
    borderRadius: 8,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 4,
  },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 22,
    paddingRight: 10,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    flex: 1,
    fontFamily: FONT.serif,
    fontSize: 19,
    fontWeight: "600",
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flexShrink: 1 },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 28,
    gap: 14,
  },
  scrollContentWithFooter: { paddingBottom: 8 },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
  },
  footerMobile: { paddingBottom: 36 },
});
