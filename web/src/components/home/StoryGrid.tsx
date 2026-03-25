import type { Article } from '@/lib/types'
import ArticleCard from '@/components/article/ArticleCard'

export default function StoryGrid({ articles }: { articles: Article[] }) {
  if (!articles.length) return null
  return (
    <section>
      <h2 className="font-serif text-lg font-bold text-primary pb-2 border-b-2 border-primary mb-4 flex items-center gap-2">
        <span className="text-accent">★</span> Featured Stories
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {articles.map(a => <ArticleCard key={a.slug} article={a} variant="grid" />)}
      </div>
    </section>
  )
}
