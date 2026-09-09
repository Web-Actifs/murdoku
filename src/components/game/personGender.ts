/**
 * ---------------------------------------------------------------------------
 * WHO IS BEING DRAWN
 * ---------------------------------------------------------------------------
 * A portrait that gives Odile a moustache reads as a bug, not as variety, so
 * the avatar picks its hairstyle bank from the given name rather than from the
 * hash. The cast is authored, finite and shared across locales (proper nouns
 * are not translated), so a lookup over the real roster is both exact and
 * cheap; the ending-based fallback only ever runs for a name nobody has
 * written yet.
 * ---------------------------------------------------------------------------
 */

export type Gender = 'f' | 'm'

const FEMININE = new Set([
  'adelaide', 'alice', 'aurelie', 'berthe', 'blanche', 'brigitte', 'camille', 'chantal',
  'chloe', 'clara', 'clemence', 'coralie', 'corinne', 'delphine', 'elise', 'emma',
  'ernestine', 'fanny', 'fatou', 'helene', 'hortense', 'ines', 'irina', 'isabelle',
  'josephine', 'julie', 'juliette', 'lea', 'lucie', 'manon', 'marceline', 'margot',
  'marion', 'michele', 'nadege', 'nadia', 'nathalie', 'nina', 'noemie', 'noor',
  'odette', 'odile', 'priscilla', 'reine', 'sabine', 'sandrine', 'severine', 'simone',
  'sofia', 'soizic', 'solange', 'sylviane', 'tania', 'valentine', 'victoire', 'yasmine', 'zoe',
])

const MASCULINE = new Set([
  'adam', 'amir', 'aristide', 'armand', 'armel', 'bastien', 'bernard', 'bertrand',
  'bilal', 'cedric', 'damien', 'denis', 'diego', 'edmond', 'fabrice', 'farid',
  'farouk', 'firmin', 'gaspard', 'gaston', 'gerard', 'guillaume', 'hippolyte', 'hugo',
  'igor', 'julien', 'karim', 'kevin', 'lucien', 'ludo', 'malik', 'marcel', 'mathis',
  'maurice', 'oscar', 'pascal', 'paul', 'philippe', 'prosper', 'raymond', 'regis',
  'renaud', 'robert', 'rocco', 'romain', 'sami', 'stefan', 'sylvain', 'tanguy',
  'theo', 'thibault', 'thierry', 'vincent', 'yanis', 'youssef',
])

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

/**
 * Accepts either a display name ("Odile Sarrazin") or an avatar key
 * ("bellevue:odile") — both reduce to the given name, which is what the cast
 * is keyed on.
 */
export function genderOf(nameOrKey: string): Gender {
  const tail = nameOrKey.includes(':') ? nameOrKey.slice(nameOrKey.lastIndexOf(':') + 1) : nameOrKey
  const first = fold(tail.trim().split(/[\s'’_-]+/)[0] ?? '')
  if (FEMININE.has(first)) return 'f'
  if (MASCULINE.has(first)) return 'm'
  // Unwritten name: French given names ending in a silent -e or -a are
  // overwhelmingly feminine. Wrong sometimes, never random.
  return /[ae]$/.test(first) ? 'f' : 'm'
}
