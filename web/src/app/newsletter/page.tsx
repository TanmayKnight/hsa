import Link from 'next/link'
import type { Metadata } from 'next'
import { getDB } from '@/lib/db'

export const metadata: Metadata = { title: 'Email Digests — The American Express Times' }
export const revalidate = 60

function formatSentDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatSentTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

/** Extract YYYY-MM-DD from the sent_at timestamp for linking to the archive */
function toArchiveDate(iso: string) {
  return iso.slice(0, 10)
}

export default async function NewsletterPage() {
  let digests: { batch_id: string; sent_at: string; article_slugs: string[] }[] = []
  try {
    digests = await getDB().getDigests()
  } catch { /* empty DB */ }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* ── Page header ── */}
      <div className="mb-10 border-b-4 border-double border-primary pb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-1">
              The American Express Times
            </p>
            <h1 className="font-serif text-4xl font-bold text-primary">Email Digests</h1>
            <p className="text-gray-500 text-sm mt-2">
              Every digest sent to subscribers — browse past editions and read the full articles.
            </p>
          </div>
          {digests.length > 0 && (
            <div className="text-right shrink-0">
              <p className="text-3xl font-serif font-bold text-primary">{digests.length}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider">
                Digest{digests.length !== 1 ? 's' : ''} sent
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {digests.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4 text-gray-200">✉</div>
          <p className="font-serif text-xl text-gray-400 mb-1">No digests sent yet</p>
          <p className="text-sm text-gray-400">
            Digests are sent automatically after PDFs are processed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {digests.map((d, i) => {
            const num = digests.length - i

            return (
              <div
                key={d.batch_id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden
                           shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                {/* Card top bar */}
                <div className="bg-primary px-6 py-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor"
                        strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7
                             a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-serif font-bold text-white text-xl leading-tight">
                        Digest #{num}
                      </p>
                      <p className="text-white/60 text-xs mt-0.5">
                        Sent {formatSentDate(d.sent_at)} &middot; {formatSentTime(d.sent_at)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/15 text-white text-sm font-bold px-4 py-2 rounded-full shrink-0">
                    {d.article_slugs.length} article{d.article_slugs.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Card footer — link to archive edition */}
                <div className="px-6 py-4 flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    All articles from this digest are available in the edition archive.
                  </p>
                  <Link
                    href={`/archive/${toArchiveDate(d.sent_at)}`}
                    className="shrink-0 ml-4 inline-flex items-center gap-1.5 text-sm font-semibold
                               text-primary hover:text-accent transition-colors whitespace-nowrap"
                  >
                    View edition
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor"
                      strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
