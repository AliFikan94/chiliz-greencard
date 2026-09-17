import { createConfig, http, injected } from "wagmi";
import { walletConnect } from "wagmi/connectors";

import { chilizMainnet, chilizSpicy } from "./chains";

// Socios Wallet (and most mobile wallets) don't inject into the desktop
// browser, so they need WalletConnect's QR-pairing flow. That requires a
// free project ID from https://cloud.reown.com - without one, only
// browser-extension wallets like MetaMask (via `injected()`) are offered.
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: [chilizSpicy, chilizMainnet],
  connectors: [
    injected(),
    ...(walletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            showQrModal: true,
            metadata: {
              name: "Chiliz Academy",
              description: "Learn crypto. Earn your Greencard.",
              url: "https://chilizgreencard.app",
              icons: [],
            },
          }),
        ]
      : []),
  ],
  transports: {
    [chilizSpicy.id]: http(),
    [chilizMainnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
