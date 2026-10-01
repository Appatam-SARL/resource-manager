import { NotificationType } from '@prisma/client';

export type NotificationContent = {
  type: NotificationType;
  title: string;
  body: string;
};

/** Single place to edit the wording of business notifications (UI is French). */
export const reservationNotificationMessages = {
  createdForRequester: (): NotificationContent => ({
    type: NotificationType.RESERVATION_CREATED,
    title: 'Nouvelle réservation',
    body: 'Votre demande de réservation a été enregistrée.',
  }),

  createdForApprovers: (resourceLabel: string): NotificationContent => ({
    type: NotificationType.RESERVATION_CREATED,
    title: 'Nouvelle demande de réservation',
    body: `Une demande de réservation a été créée pour ${resourceLabel}.`,
  }),

  approved: (): NotificationContent => ({
    type: NotificationType.RESERVATION_APPROVED,
    title: 'Réservation approuvée',
    body: 'Votre réservation a été approuvée.',
  }),

  rejected: (rejectionReason?: string | null): NotificationContent => ({
    type: NotificationType.RESERVATION_REJECTED,
    title: 'Réservation rejetée',
    body: rejectionReason?.trim()
      ? `Votre réservation a été rejetée. Motif : ${rejectionReason.trim()}`
      : 'Votre réservation a été rejetée.',
  }),

  cancelledForOwner: (): NotificationContent => ({
    type: NotificationType.RESERVATION_CANCELLED,
    title: 'Réservation annulée',
    body: 'Votre réservation a été annulée.',
  }),

  cancelledForApprovers: (): NotificationContent => ({
    type: NotificationType.RESERVATION_CANCELLED,
    title: 'Réservation annulée',
    body: 'Une réservation a été annulée.',
  }),

  extendedForOwner: (newEndLabel: string): NotificationContent => ({
    type: NotificationType.RESERVATION_EXTENDED,
    title: 'Réservation prolongée',
    body: `Votre réservation a été prolongée jusqu'au ${newEndLabel}.`,
  }),

  extendedForApprovers: (resourceLabel: string, newEndLabel: string): NotificationContent => ({
    type: NotificationType.RESERVATION_EXTENDED,
    title: 'Réservation prolongée',
    body: `La réservation de ${resourceLabel} a été prolongée jusqu'au ${newEndLabel}.`,
  }),
} as const;
