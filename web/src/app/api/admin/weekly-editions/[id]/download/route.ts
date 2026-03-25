import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const editions = await getDB().getWeeklyEditions(100)
    const edition = editions.find(e => e.id === parseInt(id))
    if (!edition || edition.status !== 'done' || !edition.pdf_path) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // pdf_path is an absolute path on the Python worker host.
    // In local dev the Next.js server and Python share the same filesystem.
    const filePath = path.isAbsolute(edition.pdf_path)
      ? edition.pdf_path
      : path.join(process.cwd(), '..', edition.pdf_path)

    const buffer = await readFile(filePath)
    const filename = `edition_${edition.edition_date}.pdf`
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to serve PDF' }, { status: 500 })
  }
}
