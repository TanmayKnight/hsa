import Link from 'next/link'
import type { Article } from '@/lib/types'

export default function BreakingBanner({ article }: { article: Article }) {
  return (
    <div className="bg-accent text-white">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
        <span className="shrink-0 bg-white text-accent text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">
          ★ Breaking
        </span>
        <span className="text-white/30 text-xs">|</span>
        <Link
          href={`/article/${article.slug}`}
          className="text-sm font-semibold truncate hover:underline underline-offset-2"
        >
          {article.title}
        </Link>
      </div>
    </div>
  )
}
