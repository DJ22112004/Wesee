const hre = require("hardhat");
require("@nomicfoundation/hardhat-ethers");

async function main() {
    console.log("Starting deployment...");
    
    try {
        // Deploy MockUSDT for testing purposes
        console.log("Deploying MockUSDT...");
        const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
        const mockUSDT = await MockUSDT.deploy();
        await mockUSDT.waitForDeployment();
        const mockUSDTAddress = await mockUSDT.getAddress();
        console.log("MockUSDT deployed to:", mockUSDTAddress);
        
        // Deploy GameToken
        console.log("Deploying GameToken...");
        const GameToken = await hre.ethers.getContractFactory("GameToken");
        const gameToken = await GameToken.deploy();
        await gameToken.waitForDeployment();
        const gameTokenAddress = await gameToken.getAddress();
        console.log("GameToken deployed to:", gameTokenAddress);
        
        // Define the conversion rate: 1 USDT = 1 GT
        const gtPerUsdt = hre.ethers.parseUnits("1", 18);
        
        // Get the deployer's address to use as the backend operator
        const [deployer] = await hre.ethers.getSigners();
        const backendOperatorAddress = deployer.address;
        console.log("Deployer address (backend operator):", backendOperatorAddress);
        
        // Deploy TokenStore, passing the addresses and conversion rate
        console.log("Deploying TokenStore...");
        const TokenStore = await hre.ethers.getContractFactory("TokenStore");
        const tokenStore = await TokenStore.deploy(mockUSDTAddress, gameTokenAddress, gtPerUsdt);
        await tokenStore.waitForDeployment();
        const tokenStoreAddress = await tokenStore.getAddress();
        console.log("TokenStore deployed to:", tokenStoreAddress);
        
        // Deploy PlayGame, passing the GameToken and backend operator addresses
        console.log("Deploying PlayGame...");
        const PlayGame = await hre.ethers.getContractFactory("PlayGame");
        const playGame = await PlayGame.deploy(gameTokenAddress, backendOperatorAddress);
        await playGame.waitForDeployment();
        const playGameAddress = await playGame.getAddress();
        console.log("PlayGame deployed to:", playGameAddress);
        
        // After deployment, set the TokenStore address in the GameToken contract
        console.log("Setting TokenStore address in GameToken...");
        await gameToken.setTokenStoreAddress(tokenStoreAddress);
        console.log("GameToken's tokenStoreAddress set to:", tokenStoreAddress);
        
        console.log("Deployment complete!");
    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1);
    }
}

main();