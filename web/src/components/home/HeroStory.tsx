import Link from 'next/link'
import type { Article } from '@/lib/types'
import { categoryGradient, formatShortDate, truncate } from '@/lib/utils'

export default function HeroStory({ article }: { article: Article }) {
  return (
    <Link href={`/article/${article.slug}`} className="block group">
      {/* Hero image — real thumbnail if available, else category gradient */}
      <div className="relative w-full h-72 md:h-96 rounded-t overflow-hidden">
        {article.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${categoryGradient(article.category)}`} />
        )}
        {/* Category tag overlaid bottom-left */}
        <div className="absolute bottom-0 left-0 right-0 p-6
                        bg-gradient-to-t from-black/60 to-transparent">
          <span className="bg-accent text-white section-tag">
            {article.category}
          </span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-b border border-t-0 border-gray-200 card-hover">
        {/* Red top accent rule */}
        <div className="w-10 h-0.5 bg-accent mb-4" />
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary leading-tight mb-3
                       group-hover:text-accent transition-colors">
          {article.title}
        </h2>
        <p className="text-gray-600 text-base leading-relaxed mb-4">
          {truncate(article.summary, 45)}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{formatShortDate(article.published_at)}</span>
          <span className="font-semibold text-accent group-hover:underline underline-offset-2 transition-colors">
            Read full story →
          </span>
        </div>
      </div>
    </Link>
  )
}
