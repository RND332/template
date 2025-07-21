import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { cytonic } from './cytonic';

export const config = getDefaultConfig({
  appName: 'Cytonic App',
  projectId: 'YOUR_PROJECT_ID',
  chains: [cytonic],
});

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
