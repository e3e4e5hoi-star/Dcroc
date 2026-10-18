import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({ error: 'Legacy authentication endpoint disabled' }, { status: 410 })
}

export function POST() {
  return NextResponse.json({ error: 'Legacy authentication endpoint disabled' }, { status: 410 })
}
