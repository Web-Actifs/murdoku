function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function PersonAvatar({
  name,
  color,
  size = 'md',
  isVictim = false,
}: {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  isVictim?: boolean
}) {
  const sizeClasses = { sm: 'h-8 w-8 text-sm', md: 'h-12 w-12 text-xl', lg: 'h-20 w-20 text-4xl' }[size]

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white ring-2 ring-white ${sizeClasses}`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials(name)}
      {isVictim && (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-lg leading-none"
        >
          ✕
        </span>
      )}
    </span>
  )
}
