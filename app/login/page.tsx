'use client'

import { useState } from 'react'
import { authWithEmailPassword } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    setMessage(null)
    
    const result = await authWithEmailPassword(formData)
    
    if (result?.error) {
      setError(result.error)
    } else if (result?.message) {
      setMessage(result.message)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Welcome to TutorTalk
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
             Sign in or create an account
          </p>
        </div>
        <form action={handleSubmit} className="mt-8 space-y-6">
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-t-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-b-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
                placeholder="Password"
              />
            </div>
          </div>

          {(error || message) && (
             <div className={`text-sm text-center ${error ? 'text-red-600' : 'text-green-600'}`}>
                {error || message}
             </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-70"
            >
              {loading ? 'Processing...' : 'Continue'}
            </button>
          </div>
          
          {/* <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-50 px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div>
             <button
              formAction={signInWithGoogle}
              className="flex w-full justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12.0003 20.45c4.6667 0 8.0833-3.2084 8.0833-8.0833 0-.7084-.0833-1.4167-.2083-2.0834H12.0003v3.9584h4.5833c-.2083 1.25-.9583 2.5-2.25 3.375l-.025.1583 2.675 2.0792.1875.0375c1.625-1.5 2.5833-3.7084 2.5833-6.2084 0-5.875-4.75-10.6666-10.6666-10.6666-3.2084 0-6.0834 1.4583-8.0417 3.75l-.15-.025-2.775-2.1458-.0958.1125c2.125-4.25 6.5-7.1667 11.5833-7.1667 3.25 0 6.1667 1.25 8.375 3.2917l-3.375 3.375c-1.375-0.9167-3.1667-1.4583-5-1.4583-3.875 0-7.125 2.6667-8.2917 6.25l-.1375-.0125-2.8291 2.1958-.0375.1417c1.2917 5.75 6.375 9.9166 12.3333 9.9166z"
                  fill="#4285F4"
                />
              </svg>
              <span className="text-sm font-semibold leading-6">Google</span>
            </button>
          </div> */}
        </form>
      </div>
    </div>
  )
}
