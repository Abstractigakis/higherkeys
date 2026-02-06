import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/contexts/auth-context";
import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (error: any) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText style={styles.explanation}>
            Your encrypted life story. Track your progress, manage your
            identity, and evolve your perspective.
          </ThemedText>
        </View>

        <View style={styles.content}>
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <ThemedText style={styles.infoLabel}>Email</ThemedText>
              <ThemedText style={styles.infoValue}>{user?.email}</ThemedText>
            </View>

            <View style={styles.infoCard}>
              <ThemedText style={styles.infoLabel}>User ID</ThemedText>
              <ThemedText style={styles.infoValue} numberOfLines={1}>
                {user?.uid}
              </ThemedText>
            </View>

            <View style={styles.infoCard}>
              <ThemedText style={styles.infoLabel}>Email Verified</ThemedText>
              <ThemedText style={styles.infoValue}>
                {user?.emailVerified ? "✓ Yes" : "✗ No"}
              </ThemedText>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <ThemedText style={styles.signOutButtonText}>Sign Out</ThemedText>
          </TouchableOpacity>
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
    padding: 20,
  },
  infoGrid: {
    gap: 16,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: "rgba(128, 128, 128, 0.1)",
    padding: 16,
    borderRadius: 12,
  },
  infoLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  signOutButton: {
    backgroundColor: "#FF3B30",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  signOutButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
