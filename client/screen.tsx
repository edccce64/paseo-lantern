import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/ui";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { pingRpc } from "../shared/ping";

export function LanternScreen({ theme, layout }: PluginScreenProps) {
  const toast = useToast();
  const ping = useRpc(pingRpc);

  const connect = useMutation({
    mutationFn: () => ping({}),
    onSuccess: () => toast.show("已连接", { variant: "success" }),
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "连接失败";
      toast.error(message);
    },
  });

  const styles = useMemo(
    () => ({
      screen: {
        flex: 1,
        backgroundColor: theme.colors.surface0,
        paddingHorizontal: layout.compact ? 16 : 24,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        gap: layout.compact ? 12 : 16,
      },
      title: {
        color: theme.colors.foreground,
        fontSize: layout.compact ? 20 : 24,
        lineHeight: layout.compact ? 28 : 32,
        textAlign: "center" as const,
      },
      hint: {
        color: theme.colors.foregroundMuted,
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center" as const,
        maxWidth: 320,
      },
      button: {
        minHeight: 44,
        paddingHorizontal: 20,
        justifyContent: "center" as const,
        borderRadius: 10,
        backgroundColor: theme.colors.accent,
      },
      buttonText: {
        color: theme.colors.accentForeground,
        fontSize: 15,
      },
    }),
    [theme, layout.compact],
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>还没有内容</Text>
      <Text style={styles.hint}>读到不懂的地方，点「陪读」把文章交给 agent。</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="刷新资讯"
        disabled={connect.isPending}
        onPress={() => connect.mutate()}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{connect.isPending ? "正在刷新" : "刷新"}</Text>
      </Pressable>
    </View>
  );
}
