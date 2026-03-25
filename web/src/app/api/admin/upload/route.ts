import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { isAuthenticated } from '@/lib/auth'
import { getDB } from '@/lib/db'

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('pdf') as File | null

  if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'A PDF file is required' }, { status: 400 })
  }

  try {
    // Resolve inbox path — defaults to ../inbox relative to web/
    const inboxPath = process.env.INBOX_PATH
      ? path.resolve(process.env.INBOX_PATH)
      : path.join(process.cwd(), '..', 'inbox')

    await mkdir(inboxPath, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    const dest = path.join(inboxPath, file.name)
    await writeFile(dest, buffer)

    // Create a pending DB record immediately so the admin sees it right away
    try {
      await getDB().createPendingPDF(file.name)
    } catch {
      // Non-fatal — pipeline will create its own record when it starts
    }

    return NextResponse.json({
      ok: true,
      filename: file.name,
      message: 'Queued for processing',
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 })
  }
}
