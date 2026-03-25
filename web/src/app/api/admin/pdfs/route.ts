import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const pdfs = await getDB().getPDFs()
    return NextResponse.json({ pdfs })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch PDFs' }, { status: 500 })
  }
}
