import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { sepolia } from '@reown/appkit/networks';
import { http } from 'wagmi';
import { APP_URL, REOWN_PROJECT_ID, RPC_URL } from './contracts';

export const networks = [sepolia];

export const wagmiAdapter = new WagmiAdapter({
  projectId: REOWN_PROJECT_ID,
  networks,
  transports: {
    [sepolia.id]: http(RPC_URL),
  },
});

export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [sepolia],
  defaultNetwork: sepolia,
  projectId: REOWN_PROJECT_ID,
  metadata: {
    name: 'CircleFlow',
    description: 'On-Chain Rotating Savings Protocol',
    url: typeof window !== 'undefined' ? window.location.origin : APP_URL,
    icons: ['https://avatars.githubusercontent.com/u/179229932'],
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#22c55e',
    '--w3m-border-radius-master': '8px',
  },
});

export const config = wagmiAdapter.wagmiConfig;

