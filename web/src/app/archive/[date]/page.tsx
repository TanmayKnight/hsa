import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getDB } from '@/lib/db'
import type { Article } from '@/lib/types'
import HeroStory from '@/components/home/HeroStory'
import StoryGrid from '@/components/home/StoryGrid'
import ArticleCard from '@/components/article/ArticleCard'

interface Props {
  params: Promise<{ date: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params
  const d = new Date(`${date}T12:00:00Z`)
  const label = d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
  return { title: `${label} — The American Express Times Archive` }
}

export const revalidate = 300

function buildEditionLayout(articles: Article[]) {
  // Mirror homepage layout: first article as hero, next 4 as featured grid, rest as latest list
  const breaking = articles.find(a => a.is_breaking) ?? articles[0] ?? null
  const rest = articles.filter(a => a.slug !== breaking?.slug)
  return {
    hero: breaking,
    featured: rest.slice(0, 4),
    latest: rest.slice(4),
  }
}

export default async function ArchiveDatePage({ params }: Props) {
  const { date } = await params

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  let articles: Article[] = []
  try {
    articles = await getDB().getArticlesByDate(date)
  } catch { /* DB error */ }

  if (articles.length === 0) notFound()

  const { hero, featured, latest } = buildEditionLayout(articles)

  const editionLabel = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Edition header */}
      <div className="mb-8 border-b-4 border-double border-primary pb-4">
        <Link
          href="/archive"
          className="text-xs text-gray-400 hover:text-primary transition-colors inline-flex items-center gap-1 mb-3"
        >
          ← Back to Archive
        </Link>
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
              The American Express Times
            </p>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary">
              {editionLabel}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Edition</p>
            <p className="font-serif text-lg font-bold text-accent">
              {articles.length} article{articles.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Edition layout — mirrors homepage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main column */}
        <div className="lg:col-span-2 space-y-10">
          {hero && <HeroStory article={hero} />}
          {featured.length > 0 && <StoryGrid articles={featured} />}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          {/* More from this edition */}
          {latest.length > 0 && (
            <div className="bg-white rounded border border-gray-200 p-5">
              <h3 className="font-serif font-bold text-primary mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                <span className="text-accent">★</span> More from this edition
              </h3>
              <div className="space-y-1">
                {latest.map(a => (
                  <ArticleCard key={a.slug} article={a} variant="list" />
                ))}
              </div>
            </div>
          )}

          {/* Navigate editions */}
          <div className="bg-white rounded border border-gray-200 p-5">
            <h3 className="font-serif font-bold text-primary mb-3 text-sm uppercase tracking-wider">
              Browse Archive
            </h3>
            <Link
              href="/archive"
              className="block text-sm text-primary hover:text-accent font-semibold transition-colors"
            >
              ← All Editions
            </Link>
          </div>
        </aside>

      </div>
    </div>
  )
}
