import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const BRAND_MARK = require('../../assets/images/brand-mark.png');

type BrandLogoProps = {
  size?: number;
  /** Thin light border for contrast on the dark auth hero. */
  rim?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** SUZANG HUB app mark used on auth screens and profile. */
export function BrandLogo({ size = 56, rim = false, style }: BrandLogoProps) {
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size * 0.22 },
        rim && styles.rim,
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel="SUZANG HUB"
    >
      <Image source={BRAND_MARK} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  rim: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});
