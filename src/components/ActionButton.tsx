import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type ActionButtonProps = {
  /** Return a promise to keep the button busy until it settles. */
  onPress: () => void | Promise<unknown>;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  gradientColors?: readonly [string, string, ...string[]];
  indicatorColor?: string;
  shimmer?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  children: React.ReactNode;
};

// Sync onPress handlers usually kick off a mutation whose isPending lands a
// tick later; this short lock covers that gap so a fast double tap can't fire
// the action twice.
const SYNC_PRESS_LOCK_MS = 400;

// Read once and kept current via the listener so the loading overlay can pick
// it up synchronously on mount (no async setState per button).
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.()
  .then((enabled) => {
    reduceMotion = enabled;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => {
  reduceMotion = enabled;
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ActionButton({
  onPress,
  loading = false,
  disabled = false,
  style,
  gradientColors,
  indicatorColor = '#fff',
  shimmer = true,
  testID,
  accessibilityLabel,
  children,
}: ActionButtonProps) {
  const [pending, setPending] = useState(false);
  const busy = loading || pending;

  const lockRef = useRef(false);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const scale = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(busy ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: busy ? 1 : 0,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [busy, progress]);

  const springTo = (toValue: number) =>
    Animated.spring(scale, { toValue, speed: 40, bounciness: 6, useNativeDriver: true }).start();

  const handlePress = () => {
    if (disabled || lockRef.current || loadingRef.current) return;
    lockRef.current = true;

    let result: void | Promise<unknown>;
    try {
      result = onPress();
    } catch (error) {
      lockRef.current = false;
      throw error;
    }

    if (result && typeof (result as Promise<unknown>).then === 'function') {
      setPending(true);
      (result as Promise<unknown>)
        .catch(() => {})
        .finally(() => {
          lockRef.current = false;
          if (mountedRef.current) setPending(false);
        });
    } else {
      setTimeout(() => {
        lockRef.current = false;
      }, SYNC_PRESS_LOCK_MS);
    }
  };

  const flat = StyleSheet.flatten(style) ?? {};
  const layerStyle = [StyleSheet.absoluteFill, { borderRadius: flat.borderRadius, overflow: 'hidden' as const }];
  const contentStyle: ViewStyle = {
    flexDirection: flat.flexDirection ?? 'row',
    alignItems: flat.alignItems ?? 'center',
    justifyContent: flat.justifyContent ?? 'center',
    gap: flat.gap,
    columnGap: flat.columnGap,
    rowGap: flat.rowGap,
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) as unknown as number,
  };

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={() => springTo(0.97)}
      onPressOut={() => springTo(1)}
      style={[style, { transform: [{ scale }] }]}
    >
      {gradientColors && (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={layerStyle}
        />
      )}
      <Animated.View style={contentStyle}>{children}</Animated.View>
      {busy && (
        <Animated.View pointerEvents="none" style={[layerStyle, { opacity: progress }]}>
          <LoadingOverlay color={indicatorColor} shimmer={shimmer} />
        </Animated.View>
      )}
    </AnimatedPressable>
  );
}

function LoadingOverlay({ color, shimmer }: { color: string; shimmer: boolean }) {
  const [animate] = useState(() => !reduceMotion);
  const [width, setWidth] = useState(0);
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const wave = Animated.loop(
      Animated.stagger(
        130,
        dots.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        ),
      ),
    );
    wave.start();
    return () => wave.stop();
  }, [animate, dots]);

  useEffect(() => {
    if (!animate || !shimmer || width === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(250),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, shimmer, width, sweep]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const stripWidth = Math.max(60, width * 0.35);
  const [r, g, b] = hexToRgb(color);

  return (
    <View style={styles.overlay} onLayout={onLayout}>
      {animate && shimmer && width > 0 && (
        <Animated.View
          style={[
            styles.shimmer,
            {
              width: stripWidth,
              transform: [
                { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-stripWidth, width] }) },
                { skewX: '-20deg' },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[`rgba(${r},${g},${b},0)`, `rgba(${r},${g},${b},0.3)`, `rgba(${r},${g},${b},0)`]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      <View style={styles.dotsRow}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: color,
                opacity: animate ? dot.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) : 0.85,
                transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginHorizontal: 3,
  },
});
