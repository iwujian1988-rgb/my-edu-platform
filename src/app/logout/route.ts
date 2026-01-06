import { redirect } from 'next/navigation'
import { logout } from '../login/actions'

export async function GET() {
  await logout()
  redirect('/login')
}
