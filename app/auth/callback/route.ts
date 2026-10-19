import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const oauthError = url.searchParams.get('error_description') ?? url.searchParams.get('error')
  const requestedNext = url.searchParams.get('next')
  const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/dashboard'

  if (oauthError) {
    const failure = new URL('/', url.origin)
    failure.searchParams.set('authError', oauthError)
    return NextResponse.redirect(failure)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const failure = new URL('/', url.origin)
      failure.searchParams.set('authError', error.message)
      return NextResponse.redirect(failure)
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
