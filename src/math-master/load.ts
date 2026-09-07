import { readFileSync } from 'node:fs';
import type { Master, Unit } from './types.ts';
import { validateMaster } from './validate.ts';
export function loadMaster(base = new URL('../../data/', import.meta.url)): Master {
  const read = (path: string) => JSON.parse(readFileSync(new URL(path, base), 'utf8'));
  const units: Unit[] = read('units.json');
  for (const u of units) if (!/^skills\/[a-z-]+\.json$/.test(u.skillFile)) throw new Error('Invalid skill file path');
  const master: Master = {units, skills: units.flatMap(u => read(u.skillFile)), crossSkills: read('cross-skills.json'), maxDefinitions: read('max-definitions.json')};
  validateMaster(master); return master;
}
