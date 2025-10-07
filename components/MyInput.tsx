import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

interface MyInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: any;
  icon?: string;
  secureTextEntry?: boolean;
}

const MyInput: React.FC<MyInputProps> = ({
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  icon,
  secureTextEntry = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = secureTextEntry;

  return (
    <View style={styles.container}>
      {/* Left Icon (if provided) */}
      {icon && (
        <Ionicons name={icon as any} size={20} color="#0b0b0bff" />
      )}

      {/* Input container */}
      <View
        style={[
          styles.inputContainer,
          !icon && styles.inputContainerNoIcon,
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType={keyboardType}
          secureTextEntry={isPassword && !showPassword}
          placeholder={placeholder}
          placeholderTextColor="#999"
        />

        {/* Show/Hide password toggle (only if secureTextEntry passed) */}
        {isPassword && (
          <Pressable
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#4f4f4fff"
            />
          </Pressable>
        )}
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingRight: 8, // space for eye icon
  },
  inputContainerNoIcon: {
    marginLeft: 0,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1e293b",
    backgroundColor: "transparent",
    fontWeight: "600",
  },
  eyeIcon: {
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default MyInput;