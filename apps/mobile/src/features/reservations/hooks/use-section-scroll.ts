import { useRef } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';

export function useSectionScroll<Section extends string>() {
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Partial<Record<Section, number>>>({});

  const register = (section: Section) => (event: LayoutChangeEvent) => {
    offsets.current[section] = event.nativeEvent.layout.y;
  };

  const scrollTo = (section: Section) => {
    const y = offsets.current[section];
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(y - 16, 0), animated: true });
    }
  };

  return { scrollRef, register, scrollTo };
}
