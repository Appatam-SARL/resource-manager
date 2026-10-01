import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';
import { AlertCircle, CircleCheck, RefreshCw, Users, type LucideIcon } from 'lucide-react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radius, spacing } from '@/constants/theme';

export type ResourceCardData = {
  id: string;
  title: string;
  subtitle: string | null;
  capacityLabel: string;
  statusLabel: string;
  statusColor: string;
};

export type SlotAvailability = 'available' | 'unavailable' | null;

type ResourceCardProps = {
  resource: ResourceCardData;
  icon: LucideIcon;
  selected: boolean;
  slotAvailability: SlotAvailability;
  onSelect: (id: string) => void;
};

const CARD_WIDTH = 232;

export const ResourceCard = memo(function ResourceCard({
  resource,
  icon: Icon,
  selected,
  slotAvailability,
  onSelect,
}: ResourceCardProps) {
  const status =
    selected && slotAvailability === 'available'
      ? { label: 'Libre sur ce créneau', color: colors.success }
      : selected && slotAvailability === 'unavailable'
        ? { label: 'Occupé sur ce créneau', color: colors.warning }
        : { label: resource.statusLabel, color: resource.statusColor };

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[resource.title, resource.subtitle, resource.capacityLabel, status.label]
        .filter(Boolean)
        .join(', ')}
      onPress={() => onSelect(resource.id)}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && !selected && styles.cardPressed,
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconTile, selected && styles.iconTileSelected]}>
          <Icon size={22} color={selected ? colors.white : colors.primary} />
        </View>
        {selected ? (
          <Animated.View entering={ZoomIn.duration(180).reduceMotion(ReduceMotion.System)}>
            <CircleCheck size={24} color={colors.white} fill={colors.primary} />
          </Animated.View>
        ) : (
          <View style={styles.radio} />
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {resource.title}
        </Text>
        {resource.subtitle ? (
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {resource.subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.capacity}>
          <Users size={14} color={colors.textMuted} />
          <Text style={styles.capacityText}>{resource.capacityLabel}</Text>
        </View>
        <View style={styles.status}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]} numberOfLines={1}>
            {status.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

type ResourceSelectorProps = {
  items: ResourceCardData[];
  icon: LucideIcon;
  selectedId: string;
  slotAvailability: SlotAvailability;
  onSelect: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyTitle: string;
  emptyMessage: string;
  error?: string;
};

export function ResourceSelector({
  items,
  icon,
  selectedId,
  slotAvailability,
  onSelect,
  isLoading,
  isError,
  onRetry,
  emptyTitle,
  emptyMessage,
  error,
}: ResourceSelectorProps) {
  if (isLoading) {
    return (
      <View
        style={styles.row}
        accessibilityRole="progressbar"
        accessibilityLabel="Chargement des ressources"
      >
        {[0, 1].map((key) => (
          <View key={key} style={[styles.card, styles.skeletonCard]}>
            <Skeleton width={44} height={44} radius={radius.md} />
            <Skeleton width="80%" height={16} />
            <Skeleton width="50%" height={12} />
            <Skeleton width="100%" height={12} />
          </View>
        ))}
      </View>
    );
  }

  if (isError) {
    return (
      <InlineState
        icon={AlertCircle}
        iconColor={colors.danger}
        title="Impossible de charger les ressources."
        actionLabel="Réessayer"
        onAction={onRetry}
      />
    );
  }

  if (items.length === 0) {
    return (
      <InlineState
        icon={icon}
        iconColor={colors.textMuted}
        title={emptyTitle}
        message={emptyMessage}
        actionLabel="Actualiser"
        onAction={onRetry}
      />
    );
  }

  return (
    <View style={styles.selector}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
        accessibilityRole="radiogroup"
        snapToInterval={CARD_WIDTH + spacing.md}
        decelerationRate="fast"
      >
        {items.map((item) => (
          <ResourceCard
            key={item.id}
            resource={item}
            icon={icon}
            selected={item.id === selectedId}
            slotAvailability={item.id === selectedId ? slotAvailability : null}
            onSelect={onSelect}
          />
        ))}
      </ScrollView>
      {error ? (
        <View style={styles.errorRow} accessibilityRole="alert">
          <AlertCircle size={16} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

function InlineState({
  icon: Icon,
  iconColor,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  message?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.inlineState}>
      <View style={styles.inlineIcon}>
        <Icon size={22} color={iconColor} />
      </View>
      <Text style={styles.inlineTitle}>{title}</Text>
      {message ? <Text style={styles.inlineMessage}>{message}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onAction}
        style={({ pressed }) => [styles.inlineAction, pressed && styles.cardPressed]}
      >
        <RefreshCw size={16} color={colors.primary} />
        <Text style={styles.inlineActionText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  selector: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    overflow: 'hidden',
  },
  scroll: {
    marginHorizontal: -spacing.lg,
  },
  scrollContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 2,
  },
  card: {
    width: CARD_WIDTH,
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#F4FAF6',
    padding: spacing.lg - 1,
  },
  cardPressed: {
    backgroundColor: colors.background,
  },
  skeletonCard: {
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileSelected: {
    backgroundColor: colors.primary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    margin: 1,
  },
  cardBody: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  capacity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  capacityText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  status: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
  inlineState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  inlineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  inlineMessage: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  inlineAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  inlineActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
