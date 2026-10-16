import type { EquipmentScope } from '@resource-manager/types';

export const EQUIPMENT_SCOPE_LABELS: Record<EquipmentScope, string> = {
  ROOM: 'Salles',
  VEHICLE: 'Véhicules',
  BOTH: 'Les deux',
};

export const EQUIPMENT_SCOPE_DESCRIPTIONS: Record<EquipmentScope, string> = {
  ROOM: 'Demandable uniquement avec une réservation de salle.',
  VEHICLE: 'Demandable uniquement avec une réservation de véhicule.',
  BOTH: 'Demandable avec une salle ou un véhicule.',
};

export const EQUIPMENT_SCOPES: EquipmentScope[] = ['ROOM', 'VEHICLE', 'BOTH'];
