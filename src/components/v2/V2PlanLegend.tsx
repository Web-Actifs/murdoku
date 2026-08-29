import { unoccupiableCells } from '../../core/model/geometry'
import { useV2Session } from '../../store/v2Session'
import { DecorIcon } from '../icons/DecorIcon'
import { roomPalette } from '../game/planStyle'
import { iconForObjectType } from './objectIcon'
import { useV2Text } from './useV2Text'

export function V2PlanLegend() {
  const { puzzle } = useV2Session()
  const text = useV2Text(puzzle.id)
  const blocked = unoccupiableCells(puzzle.board)

  return (
    <details className="group rounded-[var(--radius-md)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm shadow-[var(--shadow-card)]">
      <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-[var(--color-text)]">
        {text.t('case.legendHeading')}
        <span aria-hidden className="text-2xl leading-none text-[var(--color-text)] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-wrap gap-x-3 gap-y-2">
          {puzzle.zones.map((zone, i) => (
            <span
              key={zone.id}
              className="flex items-center gap-1.5 rounded-full border-[1.5px] border-[#241f1d] bg-[var(--color-surface-alt)] py-0.5 pl-1 pr-2.5"
            >
              <span
                aria-hidden
                className="h-5 w-5 shrink-0 rounded-full border border-[#241f1d]"
                style={{ backgroundColor: roomPalette[i % roomPalette.length].bg }}
              />
              <span className="text-xs font-semibold">{text.zone(zone.id)}</span>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-2 border-t border-[var(--color-border)] pt-2">
          {puzzle.board.objects.map((object) => {
            const icon = iconForObjectType(object.type)
            const standable = object.occupiable
            return (
              <span
                key={object.id}
                className="flex items-center gap-1.5 rounded-full border-[1.5px] border-[#241f1d] bg-[var(--color-surface-alt)] py-0.5 pl-1 pr-2.5"
                title={text.t(standable ? 'v2.play.objectOccupiable' : 'v2.play.objectBlocked')}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {icon ? <DecorIcon type={icon} className="h-4 w-4" /> : <span aria-hidden>{standable ? '▫' : '▨'}</span>}
                </span>
                <span className="text-xs font-semibold">{text.object(object.id)}</span>
                {!standable && <span className="text-[0.6rem] uppercase tracking-wide text-[var(--color-text-muted)]">{text.t('v2.play.blockedTag')}</span>}
              </span>
            )
          })}
        </div>

        <p className="border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-text-muted)]">{text.t('v2.play.rulesNote')}</p>
        {blocked.size > 0 && <p className="text-xs text-[var(--color-text-muted)]">{text.t('v2.play.blockedNote')}</p>}
      </div>
    </details>
  )
}
