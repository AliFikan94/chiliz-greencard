# Greencard onchain rewards

Solidity contracts that turn a completed Greencard lesson into an onchain
reward on Chiliz Chain, without the backend ever custodying user funds.

## Contracts

- **`LearnToken.sol`** — ERC20 `$LEARN` reward token. Mintable only by
  addresses holding `MINTER_ROLE` (granted to `RewardDistributor`).
- **`AchievementNFT.sol`** — ERC721 completion badges with per-token metadata
  URIs. Mintable only by `MINTER_ROLE` holders.
- **`RewardDistributor.sol`** — the single contract the frontend talks to.
  The backend signs an EIP-712 `RewardVoucher` describing a reward a user
  earned; the user submits it themselves via `claim(voucher, signature)`,
  paying their own gas. One voucher schema covers four reward shapes
  (`MintLearnToken`, `MintAchievementNFT`, `PayoutNative` CHZ, `PayoutERC20`
  for e.g. a Fan Token), so onboarding a new reward *asset* later doesn't
  require touching this contract's logic — just issuing vouchers of that
  type from a funded treasury.

Each voucher is single-use (replay-protected by its own EIP-712 digest), can
only be claimed by the address it names, and expires after a backend-chosen
timestamp. The owner can pause claims and rotate the trusted signer if the
backend's signing key is ever compromised.

## Setup

```bash
npm install
cp .env.example .env   # fill in DEPLOYER_PRIVATE_KEY and BACKEND_SIGNER_ADDRESS
npm run compile
npm test
```

## Deploying to Chiliz Spicy testnet

Get testnet CHZ from the [Spicy faucet](https://spicy-faucet.chiliz.com),
set `DEPLOYER_PRIVATE_KEY` and `BACKEND_SIGNER_ADDRESS` in `.env`, then:

```bash
npm run deploy:spicy
```

Copy the three printed addresses into the Django backend's `.env`
(`LEARN_TOKEN_ADDRESS`, `ACHIEVEMENT_NFT_ADDRESS`, `REWARD_DISTRIBUTOR_ADDRESS`)
and set `CHILIZ_CHAIN_ID=88882`.

Chiliz Spicy testnet: chain id `88882`, RPC `https://spicy-rpc.chiliz.com`,
explorer `https://testnet.chiliscan.com`.
