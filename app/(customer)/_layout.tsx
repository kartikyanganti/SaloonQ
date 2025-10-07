import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

export default function CustomerLayout() {
  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" }, // hide default bar
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="customer_home" options={{ title: "Home" }} />
      <Tabs.Screen name="cust_queue" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
    </>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const hiddenRoutes = ["cust_queue"]; // list of hidden tabs
  const currentRoute = state.routes[state.index].name;

  // 🔹 Hide entire tab bar if we're on a hidden screen
  if (hiddenRoutes.includes(currentRoute)) {
    return null;
  }

  // Filter visible routes
  const visibleRoutes = state.routes.filter((route) => !hiddenRoutes.includes(route.name));
  
  // Find the index of the currently focused visible route
  const focusedVisibleIndex = visibleRoutes.findIndex(
    (route) => route.key === state.routes[state.index].key
  );

  // Animation values
  const slideAnim = useRef(new Animated.Value(focusedVisibleIndex)).current;
  const widthAnims = useRef(
    visibleRoutes.map((_, index) => new Animated.Value(index === focusedVisibleIndex ? 1 : 0))
  ).current;

  // Animate when focused tab changes - smooth timing animation only
  useEffect(() => {
    if (focusedVisibleIndex !== -1) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: focusedVisibleIndex,
          duration: 300,
          useNativeDriver: false,
        }),
        ...widthAnims.map((anim, index) =>
          Animated.timing(anim, {
            toValue: index === focusedVisibleIndex ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
          })
        ),
      ]).start();
    }
  }, [focusedVisibleIndex, slideAnim, widthAnims]);

  // Calculate the width of each segment
  const focusedWidth = 75; // focused tab is 75% of total width
  const normalWidth = 25; // unfocused tab is 25% of total width

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
                inputRange: visibleRoutes.map((_, index) => index),
                outputRange: visibleRoutes.map((_, index) => {
                  // Fixed positions for consistent animation speed
                  // Tab 0 (Home): starts at margin
                  // Tab 1 (Profile): starts at 25% (after the unfocused tab)
                  const positions = [marginInPercent, normalWidth + marginInPercent];
                  return `${positions[index]}%`;
                }),
              }),
              width: `${focusedWidth - (marginInPercent * 2)}%`,
            },
          ]}
        />

        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title || route.name;
          const isFocused = state.routes[state.index].key === route.key;

          return (
            <Animated.View
              key={route.key}
              style={{
                width: widthAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [`${normalWidth}%`, `${focusedWidth}%`],
                }),
              }}
            >
              <Pressable
                style={styles.segment}
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
                <View style={styles.inner}>
                  <Ionicons
                    name={getIconName(route.name, isFocused)}
                    size={20}
                    color="#e8e8e8ff"
                  />
                  {isFocused && (
                    <Animated.Text 
                      style={styles.label}
                    >
                      {label}
                    </Animated.Text>
                  )}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const getIconName = (name: string, isFocused: boolean) => {
  if (name === "customer_home") return "home" ;
  if (name === "profile") return"person" ;
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
    backgroundColor: "#545454ff",
    borderRadius: 24,
    width: "60%",
    height: 56,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#e8edf2",
  },
  slidingBackground: {
    position: "absolute",
    top: "15%",
    height: "70%",
    backgroundColor: "rgba(76, 126, 234, 1)",
    borderRadius: 16,
    zIndex: 0,
  },
  segment: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
    zIndex: 10,
    elevation: 10,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
    color: "#f9f9f9ff",
    zIndex: 100,
    elevation:3,
  },
});