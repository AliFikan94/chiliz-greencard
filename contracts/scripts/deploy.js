const { ethers } = require("hardhat");

// Deploys LearnToken, AchievementNFT and RewardDistributor, then wires
// MINTER_ROLE on both tokens over to the distributor so it can fulfil
// claimed vouchers. Run with:
//   npx hardhat run scripts/deploy.js --network spicy
async function main() {
  const [deployer] = await ethers.getSigners();

  const admin = process.env.CONTRACT_ADMIN_ADDRESS || deployer.address;
  const backendSigner = process.env.BACKEND_SIGNER_ADDRESS;
  if (!backendSigner) {
    throw new Error("Set BACKEND_SIGNER_ADDRESS to the address the Django backend signs vouchers with.");
  }

  console.log("Deploying with:", deployer.address);
  console.log("Admin/owner will be:", admin);
  console.log("Trusted voucher signer will be:", backendSigner);

  const LearnToken = await ethers.getContractFactory("LearnToken");
  const learnToken = await LearnToken.deploy(admin);
  await learnToken.waitForDeployment();
  console.log("LearnToken deployed to:", await learnToken.getAddress());

  const AchievementNFT = await ethers.getContractFactory("AchievementNFT");
  const nft = await AchievementNFT.deploy(admin);
  await nft.waitForDeployment();
  console.log("AchievementNFT deployed to:", await nft.getAddress());

  const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
  const distributor = await RewardDistributor.deploy(
    admin,
    backendSigner,
    await learnToken.getAddress(),
    await nft.getAddress()
  );
  await distributor.waitForDeployment();
  const distributorAddress = await distributor.getAddress();
  console.log("RewardDistributor deployed to:", distributorAddress);

  // Only the deployer signer can grant roles here; if `admin` differs from
  // `deployer`, grant these roles manually from the admin account afterwards.
  if (admin.toLowerCase() === deployer.address.toLowerCase()) {
    const learnMinterTx = await learnToken.grantRole(await learnToken.MINTER_ROLE(), distributorAddress);
    await learnMinterTx.wait();
    console.log("Granted LearnToken MINTER_ROLE to RewardDistributor");

    const nftMinterTx = await nft.grantRole(await nft.MINTER_ROLE(), distributorAddress);
    await nftMinterTx.wait();
    console.log("Granted AchievementNFT MINTER_ROLE to RewardDistributor");
  } else {
    console.log(
      "admin != deployer: grant MINTER_ROLE on both tokens to the distributor from the admin account before going live."
    );
  }

  console.log("\nDeployment summary:");
  console.log(
    JSON.stringify(
      {
        learnToken: await learnToken.getAddress(),
        achievementNFT: await nft.getAddress(),
        rewardDistributor: distributorAddress,
        admin,
        backendSigner,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
