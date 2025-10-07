import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

export default function BarberLayout() {
  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" }, // hide default bar
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="barber_home" options={{ title: "Home" }} />
      <Tabs.Screen name="barber_queue" options={{ title: "Queue" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
    </>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // No hidden routes for barber - all 3 tabs are visible
  const visibleRoutes = state.routes;
  
  // Find the index of the currently focused route
  const focusedIndex = state.index;

  // Animation value for sliding
  const slideAnim = useRef(new Animated.Value(focusedIndex)).current;

  // Animate when focused tab changes
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: focusedIndex,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [focusedIndex, slideAnim]);

  // Calculate the width using 5/3 ratio system
  // Total units: 5 (focused) + 2 + 2 (unfocused) = 9 units
  const totalUnits = 9;
  const focusedWidth = (5 / totalUnits) * 100; // ~55.56%
  const normalWidth = (2 / totalUnits) * 100;   // ~22.22%

  // Fixed margin calculation
  const marginInPercent = 4;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {/* Animated sliding background */}
        <Animated.View
          style={[
            styles.slidingBackground,
            {
              left: slideAnim.interpolate({
                inputRange: [0, 1, 2],
                outputRange: [
                  `${marginInPercent}%`, // Tab 0 position
                  `${marginInPercent + normalWidth}%`, // Tab 1 position  
                  `${marginInPercent + normalWidth + normalWidth}%`, // Tab 2 position
                ],
              }),
              width: `${focusedWidth - (marginInPercent * 2)}%`,
            },
          ]}
        />

        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title || route.name;
          const isFocused = state.index === index;

          return (
            <Pressable
              key={route.key}
              style={[
                styles.segment,
                {
                  width: isFocused ? `${focusedWidth}%` : `${normalWidth}%`,
                },
              ]}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            >
              <Animated.View 
                style={[
                  styles.inner,
                  {
                    opacity: slideAnim.interpolate({
                      inputRange: [index - 0.5, index, index + 0.5],
                      outputRange: [0.6, 1, 0.6],
                      extrapolate: 'clamp',
                    }),
                  }
                ]}
              >
                <View style={route.name === "barber_queue" ? styles.rotatedIcon : undefined}>
                  <Ionicons
                    name={getIconName(route.name, isFocused)}
                    size={20}
                    color={isFocused ? "#ffffffff" : "#cececeff"}
                  />
                </View>
                {isFocused && (
                  <Animated.Text 
                    style={[
                      styles.label,
                      {
                        opacity: slideAnim.interpolate({
                          inputRange: [index - 0.2, index],
                          outputRange: [0, 1],
                          extrapolate: 'clamp',
                        }),
                        transform: [{
                          translateX: slideAnim.interpolate({
                            inputRange: [index - 0.2, index],
                            outputRange: [10, 0],
                            extrapolate: 'clamp',
                          }),
                        }],
                      }
                    ]}
                  >
                    {label}
                  </Animated.Text>
                )}
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const getIconName = (name: string, isFocused: boolean) => {
  if (name === "barber_home") return "home" ;
  if (name === "barber_queue") return  "grid";
  if (name === "profile") return "person";
  return "ellipse";
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#313131ff",
    borderRadius: 24,
    width: "70%",
    height: 56,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    overflow: "hidden",
    position: "relative",
  },
  slidingBackground: {
    position: "absolute",
    top: "15%",
    height: "70%",
    backgroundColor: "#74b5ffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#b0b0b0ff",
    zIndex: 1,
  },
  segment: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    zIndex: 2,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffffff",
  },
  rotatedIcon: {
    transform: [{ rotate: '45deg' }],
  },
});