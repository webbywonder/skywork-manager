interface BadgeProps {
  variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue'
  children: React.ReactNode
}

const variantClasses: Record<BadgeProps['variant'], string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-800',
}

/**
 * Status badge with colour coding.
 */
export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  )
}
