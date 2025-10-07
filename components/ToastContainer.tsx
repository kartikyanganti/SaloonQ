import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Type Definitions
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'default';
export type ToastPosition = 'top' | 'bottom';

export interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
  position?: ToastPosition;
}

interface ToastItem extends Required<ToastConfig> {
  id: number;
}

interface ToastProps extends ToastItem {
  onClose: () => void;
}

// Create a more robust global toast handler
class ToastManager {
  private static instance: ToastManager;
  private showToastCallback: ((config: string | ToastConfig) => void) | null = null;

  private constructor() {}

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  setCallback(callback: (config: string | ToastConfig) => void) {
    this.showToastCallback = callback;
  }

  clearCallback() {
    this.showToastCallback = null;
  }

  show(config: string | ToastConfig) {
    if (this.showToastCallback) {
      this.showToastCallback(config);
    } else {
    }
  }
}

// Toast Container Component
const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastManager = ToastManager.getInstance();

  useEffect(() => {
    console.log('🚀 ToastContainer mounted');
    
    // Set up the toast callback
    toastManager.setCallback((config: string | ToastConfig) => {
      const id = Date.now() + Math.random();
      const newToast: ToastItem = {
        id,
        message: typeof config === 'string' ? config : config.message,
        type: typeof config === 'string' ? 'default' : config.type || 'default',
        duration: typeof config === 'string' ? 2500 : config.duration || 3000,
        position: typeof config === 'string' ? 'top' : config.position || 'top',
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto remove after duration
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    });

    return () => {
      toastManager.clearCallback();
    };
  }, []);

  const removeToast = (id: number): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const topToasts = toasts.filter((t) => t.position === 'top');
  const bottomToasts = toasts.filter((t) => t.position === 'bottom');

  return (
    <>
      <View style={[styles.container, styles.topContainer]} pointerEvents="box-none">
        {topToasts.map((toast) => (
          <ToastItem key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </View>
      <View style={[styles.container, styles.bottomContainer]} pointerEvents="box-none">
        {bottomToasts.map((toast) => (
          <ToastItem key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
        ))}
      </View>
    </>
  );
};

// Individual Toast Component with Swipe to Dismiss
const ToastItem: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Pan responder for swipe gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > SCREEN_WIDTH * 0.3) {
          // Swipe threshold met - dismiss
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: gestureState.dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => onClose());
        } else {
          // Return to original position
          Animated.spring(translateX, {
            toValue: 0,
            tension: 80,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getColors = (): { backgroundColor: string; sideColor: string } => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#ffffff', sideColor: '#10b981' };
      case 'error':
        return { backgroundColor: '#ffffff', sideColor: '#ef4444' };
      case 'warning':
        return { backgroundColor: '#ffffff', sideColor: '#f59e0b' };
      case 'info':
        return { backgroundColor: '#ffffff', sideColor: '#3b82f6' };
      default:
        return { backgroundColor: '#ffffff', sideColor: '#6b7280' };
    }
  };

  const getIcon = (): string => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  };

  const colors = getColors();

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.toastWrapper,
        {
          opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: colors.backgroundColor }]}>
        {/* Colored side indicator (5% width) */}
        <View style={[styles.sideIndicator, { backgroundColor: colors.sideColor }]} />
        
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.sideColor }]}>
          <Text style={styles.icon}>{getIcon()}</Text>
        </View>
        
        {/* Message */}
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  topContainer: {
    top: 50,
  },
  bottomContainer: {
    bottom: 50,
  },
  toastWrapper: {
    width: '100%',
    marginBottom: 10,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  sideIndicator: {
    width: '3%',
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '8%',
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  message: {
    flex: 1,
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '700',
    paddingRight: 16,
    lineHeight: 20,
  },
});

// Helper object for easier usage with full type safety
export const Toast = {
  show: (message: string | ToastConfig, options?: Partial<ToastConfig>): void => {
    const toastManager = ToastManager.getInstance();
    toastManager.show(typeof message === 'string' ? { message, ...options } : message);
  },
  success: (message: string, duration?: number): void => {
    Toast.show({ message, type: 'success', duration });
  },
  error: (message: string, duration?: number): void => {
    Toast.show({ message, type: 'error', duration });
  },
  warning: (message: string, duration?: number): void => {
    Toast.show({ message, type: 'warning', duration });
  },
  info: (message: string, duration?: number): void => {
    Toast.show({ message, type: 'info', duration });
  },
};

export default ToastContainer;