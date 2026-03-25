import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const edition_date: string =
      body.edition_date || new Date().toISOString().slice(0, 10)
    const edition = await getDB().createWeeklyEditionJob(edition_date)
    return NextResponse.json({ edition }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create weekly edition job' }, { status: 500 })
  }
}
