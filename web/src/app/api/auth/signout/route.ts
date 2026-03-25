import { type NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const loginUrl = new URL('/admin/login', req.url)
  const res = NextResponse.redirect(loginUrl)
  res.cookies.delete(COOKIE_NAME)
  return res
}
