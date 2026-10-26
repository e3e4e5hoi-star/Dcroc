'use client'

import { TonConnectUIProvider } from '@tonconnect/ui-react'
import AirdropClient from './airdrop-client'

export default function AirdropPage() {
  return <TonConnectUIProvider manifestUrl="https://travian.icu/tonconnect-manifest.json"><AirdropClient /></TonConnectUIProvider>
}

