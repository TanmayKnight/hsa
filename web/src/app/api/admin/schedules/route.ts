import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const schedules = await getDB().getSchedules()
    return NextResponse.json({ schedules })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const schedule = await getDB().createSchedule({
      name: body.name,
      cron_expr: body.cron_expr,
      task: body.task ?? 'weekly_edition',
      enabled: body.enabled ?? true,
      last_run: null,
    })
    return NextResponse.json({ schedule }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}
