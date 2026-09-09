import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import '../i18n/index'
import { V3PlayPage } from './V3PlayPage'

/**
 * Does the V3 page actually mount?
 *
 * Everything else in this suite tests the engine and the case; nothing tested
 * the React tree, and a component that throws on mount fails as a white page
 * rather than as a red test. This renders the whole page to a string with the
 * real i18n bundle and the real puzzle data, then looks for things that can only
 * be there if the engine, the translations and the components agree — a raw
 * `v3:ui.` key in the output means the bundle and a component have drifted apart,
 * which is the single most likely way this screen rots.
 *
 * `renderToString` runs no effects and does not load the WebGL view, which is
 * exactly right: this is a smoke test, not a substitute for opening the page.
 */
const html = renderToString(
  <MemoryRouter initialEntries={['/v3']}>
    <V3PlayPage />
  </MemoryRouter>,
)

/**
 * React escapes apostrophes to `&#x27;`, and half the French in this case has
 * one. Decoding once here beats writing every assertion twice.
 */
const text = html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/’/g, "'")
const has = (needle: string) => text.includes(needle.replace(/’/g, "'"))

describe('the V3 page renders', () => {
  it('puts the case on the screen', () => {
    expect(has('Le 12, rue des Ormes')).toBe(true)
    expect(has('pensé à lever les yeux')).toBe(true)
  })

  it('draws the ground floor with its rooms and its people', () => {
    expect(has('arrière-cuisine')).toBe(true)
    expect(has('Mathilde Crevier')).toBe(true)
    expect(has('la cuisinière')).toBe(true)
  })

  it('renders testimonies as sentences rather than as constraint objects', () => {
    expect(has('autre se trouvait dans la même pièce')).toBe(true)
  })

  it('opens on the one level the player can reach, and marks the other two shut', () => {
    // The plan starts on the ground floor — the level that is *open* — so the
    // "Niveau fermé" stamp is correctly absent here; the lock shows on the level
    // tabs instead. Getting this backwards was the first thing this test caught.
    expect(has('Niveau fermé')).toBe(false)
    expect(text.split('✕').length - 1).toBe(2)
  })

  it('names the first door, and only the first', () => {
    expect(has('La porte de l’escalier')).toBe(true)
    expect(has('En attente d’une preuve')).toBe(true)
  })

  it('keeps the later acts sealed', () => {
    expect(has('derrière une porte')).toBe(true)
    // The act-II headline must not be readable before act II.
    expect(has('exactement à l’aplomb')).toBe(false)
  })

  it('leaks no raw translation keys', () => {
    expect(['v3:ui.', 'v3:case.', 'v3:clue.'].some((k) => text.includes(k))).toBe(false)
  })
})
