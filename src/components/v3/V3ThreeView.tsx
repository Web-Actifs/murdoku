import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { cellKey } from '../../core3/model/geometry'
import type { Cell } from '../../core3/model/types'
import { useV3Session } from '../../store/v3Session'
import { personColor } from '../game/planStyle'
import { useV3Text } from './useV3Text'
import { roomStyles } from './v3Style'

/**
 * The same building, as an actual 3D scene you can walk around.
 *
 * This exists to be compared against the isometric SVG view, and the comparison
 * is the point rather than a formality — they trade off in opposite directions:
 *
 *   SVG isometric   keeps the hand-drawn portraits and the printed-plan look,
 *                   costs nothing to load, is crisp at any zoom, but shows the
 *                   building from exactly one angle.
 *   Real 3D         orbits freely, so a volume that crosses two levels can be
 *                   looked *into* rather than inferred, and the coal chute is a
 *                   thing in space — but the portraits become coloured pawns,
 *                   because a gouache face on a billboard in a WebGL scene is a
 *                   texture pipeline, not a drawing.
 *
 * Loaded lazily: `three` is roughly the size of the rest of the app, and a
 * player who never opens this tab should never pay for it.
 */

const GAP = 2.4
const SLAB = 0.14

function toColor(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

/** Drag to orbit, wheel to pull back. Thirty lines instead of a controls dependency. */
function Orbit({ target }: { target: [number, number, number] }) {
  const { camera, gl } = useThree()
  const state = useRef({ theta: Math.PI * 0.25, phi: Math.PI * 0.3, radius: 16, dragging: false, x: 0, y: 0 })

  useEffect(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      state.current.dragging = true
      state.current.x = e.clientX
      state.current.y = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!state.current.dragging) return
      state.current.theta -= (e.clientX - state.current.x) * 0.008
      state.current.phi = Math.min(Math.PI * 0.48, Math.max(0.08, state.current.phi - (e.clientY - state.current.y) * 0.006))
      state.current.x = e.clientX
      state.current.y = e.clientY
    }
    const up = (e: PointerEvent) => {
      state.current.dragging = false
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      state.current.radius = Math.min(38, Math.max(6, state.current.radius + e.deltaY * 0.012))
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  useFrame(() => {
    const { theta, phi, radius } = state.current
    camera.position.set(
      target[0] + radius * Math.sin(phi) * Math.sin(theta),
      target[1] + radius * Math.cos(phi),
      target[2] + radius * Math.sin(phi) * Math.cos(theta),
    )
    camera.lookAt(target[0], target[1], target[2])
  })

  return null
}

function Pawn({ color, victim }: { color: string; victim: boolean }) {
  const body = victim ? '#8a8177' : color
  return (
    <group>
      {/* The body lies flat: a corpse should read as a corpse from any angle. */}
      <mesh position={victim ? [0, 0.14, 0] : [0, 0.26, 0]} rotation={victim ? [Math.PI / 2, 0, 0] : [0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.21, 0.44, 18]} />
        <meshStandardMaterial color={toColor(body)} roughness={0.65} />
      </mesh>
      <mesh position={victim ? [0, 0.14, 0.32] : [0, 0.58, 0]} castShadow>
        <sphereGeometry args={[0.155, 18, 18]} />
        <meshStandardMaterial color={toColor(body)} roughness={0.5} />
      </mesh>
    </group>
  )
}

export default function V3ThreeView() {
  const { def, puzzle, displayed, blocked, accessible, clickCell, state, progress } = useV3Session()
  const text = useV3Text(def)
  const [hovered, setHovered] = useState<string | null>(null)

  const { board } = puzzle
  const styles = roomStyles(def)
  const frozen = state.phase !== 'investigating'

  const cx = (board.cols - 1) / 2
  const cz = (board.rows - 1) / 2
  const target: [number, number, number] = [0, ((board.floors - 1) * GAP) / 2, 0]

  const position = (cell: Cell): [number, number, number] => [cell.col - cx, cell.floor * GAP, cell.row - cz]

  /** Both mouths of a discovered link, so the chute is a thing in the room rather than a footnote. */
  const roomCentre = (roomId: string): THREE.Vector3 => {
    const cells = board.cells.filter((c) => c.roomId === roomId)
    const v = new THREE.Vector3()
    for (const c of cells) v.add(new THREE.Vector3(...position(c)))
    return v.divideScalar(cells.length || 1)
  }
  const chute = progress.discovery.unlockedLinks.has('goulotte')
    ? { from: roomCentre('chaufferie'), to: roomCentre('arriere') }
    : null

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-[var(--radius-md)] bg-[#efe7d8]">
      <Canvas shadows camera={{ fov: 38, position: [10, 10, 10] }} dpr={[1, 2]}>
        <color attach="background" args={['#efe7d8']} />
        <ambientLight intensity={1.15} />
        <directionalLight position={[6, 12, 8]} intensity={2.1} castShadow />
        <directionalLight position={[-8, 6, -6]} intensity={0.6} />
        <Orbit target={target} />

        {board.cells.map((cell) => {
          const key = cellKey(cell)
          const [x, y, z] = position(cell)
          const style = styles.get(cell.roomId)!
          const open = accessible(cell.floor)
          const isBlocked = blocked.has(key)

          return (
            <group key={key}>
              <mesh
                position={[x, y, z]}
                receiveShadow
                onPointerOver={(e) => {
                  e.stopPropagation()
                  setHovered(key)
                }}
                onPointerOut={() => setHovered((h) => (h === key ? null : h))}
                onClick={(e) => {
                  e.stopPropagation()
                  if (open && !frozen) clickCell(key)
                }}
              >
                <boxGeometry args={[0.98, SLAB, 0.98]} />
                <meshStandardMaterial
                  color={toColor(hovered === key ? '#cfe0ff' : style.bg)}
                  transparent
                  opacity={open ? 1 : 0.35}
                  roughness={0.9}
                />
              </mesh>

              {/* Anything nobody can stand on gets volume, so the floor reads as furnished. */}
              {isBlocked && (
                <mesh position={[x, y + 0.22, z]} castShadow>
                  <boxGeometry args={[0.72, 0.34, 0.72]} />
                  <meshStandardMaterial color={toColor(style.tile)} transparent opacity={open ? 0.95 : 0.3} roughness={0.85} />
                </mesh>
              )}
            </group>
          )
        })}

        {def.people.map((person) => {
          const key = displayed[person.id]
          if (!key) return null
          const cell = board.cellsByKey.get(key)
          if (!cell) return null
          const [x, y, z] = position(cell)
          return (
            <group key={person.id} position={[x, y + SLAB / 2, z]}>
              <Pawn color={personColor(`ormes:${person.id}`)} victim={person.id === def.victimId} />
            </group>
          )
        })}

        {chute && <ChuteLine from={chute.from} to={chute.to} />}
      </Canvas>

      <div className="pointer-events-none -mt-8 flex flex-wrap justify-center gap-x-3 gap-y-1 px-3 pb-2 text-[0.6rem] font-bold">
        {def.people.map((person) => (
          <span key={person.id} className="flex items-center gap-1 rounded-full bg-[rgb(255_243_226/0.85)] px-1.5 py-[1px]">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: person.id === def.victimId ? '#8a8177' : personColor(`ormes:${person.id}`) }}
            />
            {text.person(person.id)}
          </span>
        ))}
      </div>
    </div>
  )
}

/** The chute drawn as a cylinder between the two rooms it joins — a hole with a direction. */
function ChuteLine({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const mid = from.clone().add(to).multiplyScalar(0.5)
  const dir = to.clone().sub(from)
  const length = dir.length()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())

  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.07, 0.07, length, 12]} />
      <meshStandardMaterial color={toColor('#c8321f')} roughness={0.5} />
    </mesh>
  )
}
