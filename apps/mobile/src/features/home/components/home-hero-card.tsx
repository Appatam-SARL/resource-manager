import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, CalendarPlus, Car, Clock, DoorOpen, MapPin, Presentation } from 'lucide-react-native';
import { formatHighlightCountdown, type HomeHighlight } from '@/features/home/lib/home';
import { RESERVATION_STATUS_LABELS, colors, radius, spacing } from '@/constants/theme';

type HomeHeroCardProps = {
  highlight: HomeHighlight;
  onPress: (id: string) => void;
};

const MUTED_ON_PRIMARY = 'rgba(255,255,255,0.78)';
const SURFACE_ON_PRIMARY = 'rgba(255,255,255,0.14)';

export function HomeHeroCard({ highlight, onPress }: HomeHeroCardProps) {
  const { item, kind } = highlight;
  const { reservation } = item;
  const isCurrent = kind === 'current';
  const Icon = reservation.resourceType === 'VEHICLE' ? Car : DoorOpen;
  const ContextIcon = item.context?.kind === 'destination' ? MapPin : Presentation;
  const countdown = formatHighlightCountdown(highlight);
  const statusLabel = RESERVATION_STATUS_LABELS[reservation.status];
  const eyebrow = isCurrent ? 'EN COURS' : 'PROCHAINE RÉSERVATION';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        isCurrent ? 'Réservation en cours' : 'Prochaine réservation',
        item.title,
        item.subtitle,
        item.when.replace('→', 'à'),
        item.context?.text,
        countdown,
        `Statut : ${statusLabel}`,
      ]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint="Ouvre le détail de la réservation"
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.eyebrow}>
          {isCurrent ? <View style={styles.liveDot} /> : null}
          <Text style={styles.eyebrowText}>{eyebrow}</Text>
        </View>
        <Text style={styles.status}>{statusLabel}</Text>
      </View>

      <View style={styles.identity}>
        <View style={styles.iconTile}>
          <Icon size={22} color={colors.white} />
        </View>
        <View style={styles.identityText}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Clock size={15} color={MUTED_ON_PRIMARY} />
          <Text style={styles.detailStrong} numberOfLines={1}>
            {item.when}
          </Text>
        </View>
        {item.context ? (
          <View style={styles.detailRow}>
            <ContextIcon size={15} color={MUTED_ON_PRIMARY} />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.context.text}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.countdown} numberOfLines={1}>
          {countdown}
        </Text>
        <View style={styles.link}>
          <Text style={styles.linkText}>Voir détails</Text>
          <ArrowRight size={16} color={colors.white} />
        </View>
      </View>
    </Pressable>
  );
}

export function HomeHeroEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <CalendarPlus size={24} color={colors.primary} />
      </View>
      <View style={styles.emptyText}>
        <Text style={styles.emptyTitle}>Aucune réservation à venir</Text>
        <Text style={styles.emptyDescription}>
          Réservez un véhicule ou une salle en quelques secondes.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Créer une réservation"
        onPress={onCreate}
        hitSlop={6}
        style={({ pressed }) => [styles.emptyAction, pressed && styles.emptyActionPressed]}
      >
        <Text style={styles.emptyActionText}>Réserver</Text>
        <ArrowRight size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  pressed: {
    backgroundColor: colors.primaryLight,
    transform: [{ scale: 0.99 }],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#74C69D',
  },
  eyebrowText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.primaryMuted,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.xl,
    backgroundColor: SURFACE_ON_PRIMARY,
    overflow: 'hidden',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: SURFACE_ON_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED_ON_PRIMARY,
  },
  details: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailStrong: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: MUTED_ON_PRIMARY,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
  },
  countdown: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryMuted,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  empty: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    gap: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  emptyActionPressed: {
    opacity: 0.7,
  },
  emptyActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
