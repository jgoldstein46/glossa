'use client'

import { signout } from '@/app/login/actions'

export default function LogoutButton() {
  return (
    <form action={signout}>
        <button 
            type="submit"
            className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-600"
        >
            Log out
        </button>
    </form>
  )
}
