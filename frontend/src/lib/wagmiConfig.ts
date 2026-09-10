import { createConfig, http, injected } from "wagmi";

import { chilizMainnet, chilizSpicy } from "./chains";

export const wagmiConfig = createConfig({
  chains: [chilizSpicy, chilizMainnet],
  connectors: [injected()],
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
