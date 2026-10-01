import { ToneBadge } from '@/components/shared/status-badge';
import { auditActionLabel, auditActionTone } from '@/features/audit/lib/audit-display';

export function AuditActionBadge({ action, className }: { action: string; className?: string }) {
  return (
    <ToneBadge tone={auditActionTone(action)} className={className}>
      {auditActionLabel(action)}
    </ToneBadge>
  );
}
