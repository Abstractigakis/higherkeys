import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function ControllerScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText style={styles.explanation}>
            The precision engine. Mark, tag, and organize your highlights in
            real-time with tactile mastery.
          </ThemedText>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <IconSymbol size={120} name="gamecontroller.fill" color="#8E8E93" />
          </View>
          <ThemedText style={styles.title}>Controller Ready</ThemedText>
          <ThemedText style={styles.subtitle}>
            Connect a game controller to start high-speed highlighting.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: "rgba(128, 128, 128, 0.08)",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  explanation: {
    fontSize: 13,
    opacity: 0.85,
    fontStyle: "italic",
    lineHeight: 18,
    color: "#8E8E93",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  iconContainer: {
    marginBottom: 20,
    opacity: 0.2,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
});
