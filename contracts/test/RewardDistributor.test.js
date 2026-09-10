const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const RewardType = {
  MintLearnToken: 0,
  MintAchievementNFT: 1,
  PayoutNative: 2,
  PayoutERC20: 3,
};

async function signVoucher(signer, distributorAddress, chainId, voucher) {
  const domain = {
    name: "GreencardRewardDistributor",
    version: "1",
    chainId,
    verifyingContract: distributorAddress,
  };
  const types = {
    RewardVoucher: [
      { name: "user", type: "address" },
      { name: "rewardType", type: "uint8" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "uri", type: "string" },
      { name: "nonce", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ],
  };
  return signer.signTypedData(domain, types, voucher);
}

async function deployFixture() {
  const [admin, backendSigner, user, other] = await ethers.getSigners();

  const LearnToken = await ethers.getContractFactory("LearnToken");
  const learnToken = await LearnToken.deploy(admin.address);

  const AchievementNFT = await ethers.getContractFactory("AchievementNFT");
  const nft = await AchievementNFT.deploy(admin.address);

  const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
  const distributor = await RewardDistributor.deploy(
    admin.address,
    backendSigner.address,
    await learnToken.getAddress(),
    await nft.getAddress()
  );

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const fanToken = await MockERC20.deploy("Mock Fan Token", "MFT");

  const distributorAddress = await distributor.getAddress();
  await learnToken.connect(admin).grantRole(await learnToken.MINTER_ROLE(), distributorAddress);
  await nft.connect(admin).grantRole(await nft.MINTER_ROLE(), distributorAddress);
  await fanToken.mint(distributorAddress, ethers.parseEther("1000"));

  const chainId = (await ethers.provider.getNetwork()).chainId;

  return { admin, backendSigner, user, other, learnToken, nft, distributor, distributorAddress, fanToken, chainId };
}

function baseVoucher(overrides) {
  return {
    user: ethers.ZeroAddress,
    rewardType: RewardType.MintLearnToken,
    token: ethers.ZeroAddress,
    amount: 0n,
    uri: "",
    nonce: 1n,
    expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
    ...overrides,
  };
}

describe("RewardDistributor", function () {
  it("mints LEARN tokens on a valid voucher claim", async function () {
    const { user, backendSigner, distributor, distributorAddress, learnToken, chainId } = await deployFixture();

    const voucher = baseVoucher({
      user: user.address,
      rewardType: RewardType.MintLearnToken,
      amount: ethers.parseEther("10"),
    });
    const signature = await signVoucher(backendSigner, distributorAddress, chainId, voucher);

    await expect(distributor.connect(user).claim(voucher, signature))
      .to.emit(distributor, "RewardClaimed")
      .withArgs(user.address, RewardType.MintLearnToken, ethers.ZeroAddress, voucher.amount, voucher.nonce, anyValue);

    expect(await learnToken.balanceOf(user.address)).to.equal(voucher.amount);
  });

  it("mints an achievement NFT with the given metadata URI", async function () {
    const { user, backendSigner, distributor, distributorAddress, nft, chainId } = await deployFixture();

    const voucher = baseVoucher({
      user: user.address,
      rewardType: RewardType.MintAchievementNFT,
      uri: "ipfs://journey-1-complete",
      nonce: 2n,
    });
    const signature = await signVoucher(backendSigner, distributorAddress, chainId, voucher);

    await distributor.connect(user).claim(voucher, signature);

    expect(await nft.ownerOf(0)).to.equal(user.address);
    expect(await nft.tokenURI(0)).to.equal(voucher.uri);
  });

  it("pays out native CHZ from a funded treasury", async function () {
    const { admin, user, backendSigner, distributor, distributorAddress, chainId } = await deployFixture();

    await admin.sendTransaction({ to: distributorAddress, value: ethers.parseEther("5") });

    const voucher = baseVoucher({
      user: user.address,
      rewardType: RewardType.PayoutNative,
      amount: ethers.parseEther("1"),
      nonce: 3n,
    });
    const signature = await signVoucher(backendSigner, distributorAddress, chainId, voucher);

    await expect(distributor.connect(user).claim(voucher, signature)).to.changeEtherBalances(
      [user, distributor],
      [ethers.parseEther("1"), -ethers.parseEther("1")]
    );
  });

  it("pays out an arbitrary ERC20 (e.g. a Fan Token) from the treasury", async function () {
    const { user, backendSigner, distributor, distributorAddress, fanToken, chainId } = await deployFixture();

    const voucher = baseVoucher({
      user: user.address,
      rewardType: RewardType.PayoutERC20,
      token: await fanToken.getAddress(),
      amount: ethers.parseEther("50"),
      nonce: 4n,
    });
    const signature = await signVoucher(backendSigner, distributorAddress, chainId, voucher);

    await distributor.connect(user).claim(voucher, signature);

    expect(await fanToken.balanceOf(user.address)).to.equal(voucher.amount);
  });

  it("rejects a voucher signed by someone other than the trusted signer", async function () {
    const { user, other, distributor, distributorAddress, chainId } = await deployFixture();

    const voucher = baseVoucher({ user: user.address, amount: ethers.parseEther("10"), nonce: 5n });
    const signature = await signVoucher(other, distributorAddress, chainId, voucher);

    await expect(distributor.connect(user).claim(voucher, signature)).to.be.revertedWithCustomError(
      distributor,
      "InvalidSignature"
    );
  });

  it("rejects replaying an already-used voucher", async function () {
    const { user, backendSigner, distributor, distributorAddress, chainId } = await deployFixture();

    const voucher = baseVoucher({ user: user.address, amount: ethers.parseEther("10"), nonce: 6n });
    const signature = await signVoucher(backendSigner, distributorAddress, chainId, voucher);

    await distributor.connect(user).claim(voucher, signature);

    await expect(distributor.connect(user).claim(voucher, signature)).to.be.revertedWithCustomError(
      distributor,
      "VoucherAlreadyUsed"
    );
  });

  it("rejects an expired voucher", async function () {
    const { user, backendSigner, distributor, distributorAddress, chainId } = await deployFixture();

    const voucher = baseVoucher({
      user: user.address,
      amount: ethers.parseEther("10"),
      nonce: 7n,
      expiry: BigInt(Math.floor(Date.now() / 1000) - 1),
    });
    const signature = await signVoucher(backendSigner, distributorAddress, chainId, voucher);

    await expect(distributor.connect(user).claim(voucher, signature)).to.be.revertedWithCustomError(
      distributor,
      "VoucherExpired"
    );
  });

  it("rejects a claim submitted by someone other than the voucher's user", async function () {
    const { user, other, backendSigner, distributor, distributorAddress, chainId } = await deployFixture();

    const voucher = baseVoucher({ user: user.address, amount: ethers.parseEther("10"), nonce: 8n });
    const signature = await signVoucher(backendSigner, distributorAddress, chainId, voucher);

    await expect(distributor.connect(other).claim(voucher, signature)).to.be.revertedWithCustomError(
      distributor,
      "InvalidVoucherOwner"
    );
  });

  it("blocks claims while paused and allows them again after unpausing", async function () {
    const { admin, user, backendSigner, distributor, distributorAddress, chainId } = await deployFixture();

    await distributor.connect(admin).pause();

    const voucher = baseVoucher({ user: user.address, amount: ethers.parseEther("10"), nonce: 9n });
    const signature = await signVoucher(backendSigner, distributorAddress, chainId, voucher);

    await expect(distributor.connect(user).claim(voucher, signature)).to.be.revertedWithCustomError(
      distributor,
      "EnforcedPause"
    );

    await distributor.connect(admin).unpause();
    await expect(distributor.connect(user).claim(voucher, signature)).to.not.be.reverted;
  });

  it("only lets the owner rotate the trusted signer", async function () {
    const { admin, user, other, distributor } = await deployFixture();

    await expect(distributor.connect(user).setSigner(other.address)).to.be.revertedWithCustomError(
      distributor,
      "OwnableUnauthorizedAccount"
    );

    await expect(distributor.connect(admin).setSigner(other.address))
      .to.emit(distributor, "SignerUpdated");
    expect(await distributor.signer()).to.equal(other.address);
  });
});
