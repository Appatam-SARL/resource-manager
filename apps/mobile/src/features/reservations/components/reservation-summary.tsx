import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Info, type LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';

export type SummaryItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  secondary?: string | null;
};

type ReservationSummaryProps = {
  items: SummaryItem[];
  emptyMessage: string;
  footnote: string;
};

export function ReservationSummary({ items, emptyMessage, footnote }: ReservationSummaryProps) {
  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : (
        <Divided>
          {items.map(({ key, icon: Icon, label, value, secondary }) => (
            <View
              key={key}
              style={styles.row}
              accessible
              accessibilityLabel={[label, value, secondary].filter(Boolean).join(', ')}
            >
              <Icon size={18} color={colors.primary} />
              <View style={styles.rowBody}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
                {secondary ? <Text style={styles.secondary}>{secondary}</Text> : null}
              </View>
            </View>
          ))}
        </Divided>
      )}
      <View style={styles.footnote}>
        <Info size={14} color={colors.textMuted} />
        <Text style={styles.footnoteText}>{footnote}</Text>
      </View>
    </View>
  );
}

function Divided({ children }: { children: ReactNode }) {
  return (
    <>
      {Children.toArray(children).map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {child}
        </Fragment>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBody: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  secondary: {
    fontSize: 13,
    color: colors.textMuted,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 18 + spacing.md,
  },
  empty: {
    fontSize: 14,
    color: colors.textMuted,
    paddingVertical: spacing.md,
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  footnoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
