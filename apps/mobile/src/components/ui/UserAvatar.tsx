import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { getInitials } from '@/lib/initials';
import { colors } from '@/constants/theme';

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function UserAvatar({ name, email, imageUrl, size = 40, style }: UserAvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      style={[styles.base, dimension, style]}
      accessibilityRole="image"
      accessibilityLabel={name ? `Avatar de ${name}` : 'Avatar'}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={dimension} contentFit="cover" />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.36) }]}>
          {getInitials(name, email)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: colors.white,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
