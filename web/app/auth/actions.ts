'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function signInWithGoogle(forceSelectAccount: boolean = false) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: forceSelectAccount ? {
        prompt: 'select_account',
      } : undefined,
    },
  })

  if (error) {
    console.error(error)
    return redirect('/error')
  }

  if (data.url) {
    redirect(data.url) // use the redirect URL from Supabase
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function login(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login Error:', error)
    return redirect('/login?message=Could not authenticate user: ' + error.message)
  }

  return redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    console.error('Signup Error:', error)
    return redirect('/signup?message=Could not authenticate user: ' + error.message)
  }

  return redirect('/login?message=Check email to continue sign in process')
}
