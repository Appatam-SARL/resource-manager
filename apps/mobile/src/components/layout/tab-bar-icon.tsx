import type { LucideIcon } from 'lucide-react-native';
import type { ColorValue } from 'react-native';
import { colors } from '@/constants/theme';

type TabBarIconProps = {
  Icon: LucideIcon;
  color: ColorValue;
  size?: number;
  focused?: boolean;
};

export function TabBarIcon({ Icon, color, size = 22 }: TabBarIconProps) {
  const resolved = typeof color === 'string' ? color : colors.primary;
  return <Icon size={size} color={resolved} strokeWidth={2.25} />;
}
