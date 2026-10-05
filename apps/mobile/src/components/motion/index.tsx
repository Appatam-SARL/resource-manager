import type { ReactNode } from 'react';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';

type FadeInProps = {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

export function FadeIn({ children, delay = 0, style }: FadeInProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(320)
        .delay(delay)
        .reduceMotion(ReduceMotion.System)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
};

export function StaggerItem({ children, index = 0, style }: StaggerItemProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(280)
        .delay(Math.min(index, 8) * 50)
        .reduceMotion(ReduceMotion.System)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
