import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDB } from '@/lib/db'
import ArticleCard from '@/components/article/ArticleCard'

interface Props {
  params: Promise<{ name: string }>
}

// Convert URL slug back to display category name
async function resolveCategory(urlName: string): Promise<string | null> {
  const categories = await getDB().getCategories()
  const decoded = decodeURIComponent(urlName).replace(/-/g, ' ')
  return categories.find(c => c.toLowerCase() === decoded.toLowerCase()) ?? null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params
  const category = await resolveCategory(name)
  if (!category) return {}
  return { title: category }
}

export const revalidate = 60

export default async function SectionPage({ params }: Props) {
  const { name } = await params
  const category = await resolveCategory(name)
  if (!category) notFound()

  const articles = await getDB().getArticlesByCategory(category, 30)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Section</p>
        <h1 className="font-serif text-3xl font-bold text-primary border-b-4 border-primary inline-block pb-1">
          {category}
        </h1>
      </div>

      {articles.length === 0 ? (
        <p className="text-gray-500 text-sm">No articles in this section yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map(a => <ArticleCard key={a.slug} article={a} variant="grid" />)}
        </div>
      )}
    </div>
  )
}
