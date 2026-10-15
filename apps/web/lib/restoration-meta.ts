import type { ProjectStatus, RestorationCategory } from '@delta-signal/contracts';

export const CATEGORIES: { value: RestorationCategory; label: string; tint: string }[] = [
  { value: 'TREE_PLANTING', label: 'Tree planting', tint: 'bio' },
  { value: 'WETLAND_RESTORATION', label: 'Wetland restoration', tint: 'water' },
  { value: 'RIVERBANK_PROTECTION', label: 'Riverbank protection', tint: 'water' },
  { value: 'MANGROVE', label: 'Mangrove', tint: 'bio' },
  { value: 'WASTE_MANAGEMENT', label: 'Waste management', tint: 'earth' },
  { value: 'OTHER', label: 'Other', tint: 'neutral' },
];

export const STATUSES: { value: ProjectStatus; label: string; dot: string; hollow?: boolean }[] = [
  { value: 'ACTIVE', label: 'Active', dot: '#2E9B66' },
  { value: 'PLANNED', label: 'Planned', dot: '#3388C7' },
  { value: 'PAUSED', label: 'Paused', dot: '#7B8782', hollow: true },
  { value: 'COMPLETED', label: 'Completed', dot: '#5F6F68', hollow: true },
];
