import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuth } from "@/contexts/auth-context";
import { addButtonListener, GamepadButtonEvent } from "@/mobile/modules/expo-gamepad";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ProfileModal() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const buttonSubscription = addButtonListener(
      (event: GamepadButtonEvent) => {
        if (event.action !== "pressed") return;

        switch (event.buttonName) {
          case "A":
          case "B":
            // A or B button closes the modal
            router.dismiss();
            break;
        }
      }
    );

    return () => {
      buttonSubscription.remove();
    };
  }, [router]);

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
            router.dismiss();
          } catch (error: any) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.topRow}>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.dismiss()}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <ThemedText style={styles.infoLabel}>Email</ThemedText>
            <ThemedText style={styles.infoValue}>
              {user?.email}
            </ThemedText>
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
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  userInfo: {
    flex: 1,
  },
  email: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  displayName: {
    fontSize: 14,
    color: "#666",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
  },
  signOutButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  closeButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  infoGrid: {
    gap: 16,
  },
  infoCard: {
    gap: 8,
    flexDirection: "row",
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
});
