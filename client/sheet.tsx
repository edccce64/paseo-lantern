import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FONT, palette } from "./style";

type Props = {
  theme: PluginScreenProps["theme"];
  layout: PluginScreenProps["layout"];
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** false 时点遮罩不关闭，默认 true */
  dismissible?: boolean;
};

/**
 * 主题化的弹层，替换宿主 Modal。
 * 宿主 Modal 的标题栏由 App 主题绘制（白色），会割裂纸色配色；
 * 这里整套自绘：手机是底部 sheet，桌面是居中对话框，遮罩点击关闭，内容区可滚动。
 */
export function LanternSheet({
  theme,
  layout,
  open,
  title,
  onClose,
  children,
  dismissible = true,
}: Props) {
  const p = useMemo(() => palette(theme), [theme]);
  const overlay = useRef(new Animated.Value(0)).current;
  const sheet = useRef(new Animated.Value(0)).current;

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

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.overlay, { opacity: overlay }]}>
        <Pressable
          accessibilityViewIsModal
          accessibilityLabel="关闭弹窗"
          style={StyleSheet.absoluteFill}
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
          ]}
        >
          {compact ? <View style={[styles.grabber, { backgroundColor: p.rule }]} /> : null}
          <View style={styles.titleBar}>
            <Text style={[styles.title, { color: p.ink }]} numberOfLines={1}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="关闭"
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Icon name="X" size={20} color={p.muted} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  kavMobile: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  kavDesktop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    flexDirection: "column",
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
    fontWeight: "700",
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
});
