// src/app/app/page.tsx  (SERVER)
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import UserRaffle from './UserRaffleClient'

export default function Page() {
  return <UserRaffle />
}
