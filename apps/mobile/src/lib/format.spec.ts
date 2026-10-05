import { describe, expect, it } from 'vitest';
import { formatDayGroupLabel, formatRelativeDateTime, groupByDay } from './format';

const now = new Date(2026, 8, 28, 15, 0, 0);
const at = (day: number, hours: number, minutes = 0) =>
  new Date(2026, 8, day, hours, minutes).toISOString();

describe('formatRelativeDateTime', () => {
  it('affiche une durée relative récente', () => {
    expect(formatRelativeDateTime(at(28, 14, 59), now)).toBe('Il y a 1 min');
    expect(formatRelativeDateTime(at(28, 14, 50), now)).toBe('Il y a 10 min');
    expect(formatRelativeDateTime(at(28, 12, 0), now)).toBe('Il y a 3 h');
  });

  it('affiche "Hier" pour la veille', () => {
    expect(formatRelativeDateTime(at(27, 9, 30), now)).toBe('Hier à 09:30');
  });
});

describe('groupByDay', () => {
  it("regroupe par Aujourd'hui, Hier puis date", () => {
    const items = [
      { id: 'a', createdAt: at(28, 14) },
      { id: 'b', createdAt: at(28, 9) },
      { id: 'c', createdAt: at(27, 18) },
      { id: 'd', createdAt: at(22, 10) },
    ];
    const sections = groupByDay(items, (i) => i.createdAt, now);

    expect(sections.map((s) => s.title)).toEqual([
      "Aujourd'hui",
      'Hier',
      formatDayGroupLabel(at(22, 10), now),
    ]);
    expect(sections[0].data.map((i) => i.id)).toEqual(['a', 'b']);
    expect(sections[2].title).toBe('Mardi 22 septembre');
  });
});
