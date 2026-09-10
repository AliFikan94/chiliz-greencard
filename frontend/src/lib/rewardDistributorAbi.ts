// Matches contracts/contracts/RewardDistributor.sol. Only the pieces the
// frontend calls directly are included.
export const rewardDistributorAbi = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "voucher",
        type: "tuple",
        components: [
          { name: "user", type: "address" },
          { name: "rewardType", type: "uint8" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "uri", type: "string" },
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;
