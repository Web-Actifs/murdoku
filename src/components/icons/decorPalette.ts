/**
 * The single ink-and-gouache palette every drawn thing on a plan shares — the
 * decor icons (`DecorIcon`) and the furniture drawn straight onto the V2 board
 * (`V2ObjectArt`). Kept in its own module so the two cannot drift apart: a vat
 * in the legend and the same vat on the plan have to be the same steel.
 *
 * Most hues come as a light / base / dark triplet, used as: base = the main
 * mass, light = the face the light hits (top-left), dark = the shaded face.
 */
export const P = {
  ink: '#241f1d',
  charcoal: '#38404a',
  slate: '#4a5560',
  steel: '#7c8894',
  silver: '#b6c0c9',
  chrome: '#dfe6ec',
  cream: '#fff3e2',
  bone: '#e8e0cd',
  boneDark: '#cbc0a5',
  wood: '#c98b52',
  woodLight: '#e6b985',
  woodDark: '#9a6435',
  red: '#f2604a',
  redDark: '#cf4230',
  coral: '#ff8b78',
  gold: '#f5b93c',
  goldDark: '#d4881f',
  sun: '#ffd25e',
  green: '#3fa96b',
  greenDark: '#2c8352',
  greenLight: '#79d09a',
  teal: '#12b8a6',
  tealDark: '#0d8e80',
  blue: '#4a90e2',
  blueDark: '#2f6bb5',
  blueLight: '#8fbdf0',
  sky: '#7fd3f0',
  glass: '#cdeefb',
  purple: '#8a6bd1',
  purpleDark: '#5f4794',
  pink: '#f2789f',
  clay: '#d9663f',
  clayLight: '#ef8a63',
  white: '#ffffff',
}
