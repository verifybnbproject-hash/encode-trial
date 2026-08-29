// Smart Contract Deployment Script for BSC
// This script helps you deploy the AssetVerifier contract

console.log("🚀 BNB Chain Asset Verifier Contract Deployment Guide")
console.log("=".repeat(60))

console.log("\n📋 Prerequisites:")
console.log("1. Install Hardhat: npm install --save-dev hardhat")
console.log("2. Install OpenZeppelin: npm install @openzeppelin/contracts")
console.log("3. Get BSC RPC URL from https://docs.bnbchain.org/docs/rpc")
console.log("4. Get private key from your wallet (keep it secure!)")

console.log("\n📝 Hardhat Configuration (hardhat.config.js):")
console.log(`
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.19",
  networks: {
    bsc: {
      url: "https://bsc-dataseed.binance.org/",
      accounts: ["YOUR_PRIVATE_KEY_HERE"], // Replace with your private key
      gasPrice: 5000000000, // 5 gwei
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: ["YOUR_PRIVATE_KEY_HERE"],
      gasPrice: 10000000000, // 10 gwei
    }
  }
};
`)

console.log("\n🔧 Deployment Script (scripts/deploy.js):")
console.log(`
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // USDT contract address on BSC Mainnet
  const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
  
  // Verification fee: 10 USDT (with 18 decimals)
  const VERIFICATION_FEE = ethers.utils.parseEther("10");

  const AssetVerifier = await ethers.getContractFactory("AssetVerifier");
  const verifier = await AssetVerifier.deploy(USDT_ADDRESS, VERIFICATION_FEE);

  await verifier.deployed();
  console.log("AssetVerifier deployed to:", verifier.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`)

console.log("\n🚀 Deployment Commands:")
console.log("1. For BSC Testnet: npx hardhat run scripts/deploy.js --network bscTestnet")
console.log("2. For BSC Mainnet: npx hardhat run scripts/deploy.js --network bsc")

console.log("\n⚠️  Important Notes:")
console.log("• Make sure you have BNB for gas fees")
console.log("• Test on BSC Testnet first")
console.log("• Update CONTRACT_CONFIG.VERIFIER_ADDRESS with deployed address")
console.log("• Verify contract on BSCScan for transparency")

console.log("\n🔍 Contract Verification:")
console.log("npx hardhat verify --network bsc DEPLOYED_CONTRACT_ADDRESS USDT_ADDRESS VERIFICATION_FEE")

console.log("\n✅ After deployment, update lib/contract-config.ts with:")
console.log("VERIFIER_ADDRESS: 'YOUR_DEPLOYED_CONTRACT_ADDRESS'")

console.log("\n🎉 Your Asset Verifier is ready to accept USDT payments!")
