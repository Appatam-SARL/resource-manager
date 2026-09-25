import type { ReactNode } from 'react';
import { MotiView } from 'moti';
import { useReducedMotion } from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';

type FadeInProps = {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

export function FadeIn({ children, delay = 0, style }: FadeInProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: 14 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 320, delay }}
      style={style}
    >
      {children}
    </MotiView>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
};

export function StaggerItem({ children, index = 0, style }: StaggerItemProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: 280,
        delay: Math.min(index, 8) * 50,
      }}
      style={style}
    >
      {children}
    </MotiView>
  );
}

export function PressScale({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <MotiView
      from={{ scale: 1 }}
      animate={{ scale: 1 }}
      transition={{ type: 'timing', duration: 150 }}
      style={style}
    >
      {children}
    </MotiView>
  );
}
