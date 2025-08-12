const express = require('express');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.json());

console.log('Starting server...');

// Load environment variables
const RPC_URL = process.env.RPC_URL;
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;

// Contract addresses
const GAME_TOKEN_ADDRESS = process.env.GAME_TOKEN_ADDRESS;
const TOKEN_STORE_ADDRESS = process.env.TOKEN_STORE_ADDRESS;
const PLAY_GAME_ADDRESS = process.env.PLAY_GAME_ADDRESS;

console.log('Environment variables loaded:');
console.log('RPC_URL:', RPC_URL);
console.log('GAME_TOKEN_ADDRESS:', GAME_TOKEN_ADDRESS);
console.log('TOKEN_STORE_ADDRESS:', TOKEN_STORE_ADDRESS);
console.log('PLAY_GAME_ADDRESS:', PLAY_GAME_ADDRESS);

// Check if environment variables are set
if (!RPC_URL || !BACKEND_PRIVATE_KEY || !GAME_TOKEN_ADDRESS || !TOKEN_STORE_ADDRESS || !PLAY_GAME_ADDRESS) {
    console.error('Missing required environment variables. Please check your .env file.');
    process.exit(1);
}

// Try to load ABIs with error handling
let GameTokenABI, TokenStoreABI, PlayGameABI;

try {
    // Corrected paths for the ABIs
    GameTokenABI = require('../artifacts/contracts/GameToken.sol/GameToken.json').abi;
    TokenStoreABI = require('../artifacts/contracts/TokenStore.sol/TokenStore.json').abi;
    PlayGameABI = require('../artifacts/contracts/PlayGame.sol/PlayGame.json').abi;
    console.log('ABIs loaded successfully');
} catch (error) {
    console.error('Error loading ABIs. Make sure contracts are compiled:', error.message);
    console.error('Run `npx hardhat compile` from your project\'s root directory.');
    process.exit(1);
}

// Setup provider and wallet with error handling
let provider, wallet;

try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider);
    console.log('Provider and wallet initialized');
    console.log('Wallet address:', wallet.address);
} catch (error) {
    console.error('Error initializing provider or wallet:', error.message);
    process.exit(1);
}

// Contract instances
const gameTokenContract = new ethers.Contract(GAME_TOKEN_ADDRESS, GameTokenABI, wallet);
const tokenStoreContract = new ethers.Contract(TOKEN_STORE_ADDRESS, TokenStoreABI, wallet);
const playGameContract = new ethers.Contract(PLAY_GAME_ADDRESS, PlayGameABI, wallet);

// Test endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        message: 'Server is running',
        wallet: wallet.address,
        contracts: {
            gameToken: GAME_TOKEN_ADDRESS,
            tokenStore: TOKEN_STORE_ADDRESS,
            playGame: PLAY_GAME_ADDRESS
        }
    });
});

// Endpoint 1: GET /purchase?amount=USDT
app.get('/purchase', async (req, res) => {
    try {
        const usdtAmount = req.query.amount;
        if (!usdtAmount) {
            return res.status(400).json({ error: 'USDT amount is required.' });
        }

        console.log(`Processing purchase for ${usdtAmount} USDT`);

        // Call the buy function on the TokenStore contract
        const tx = await tokenStoreContract.buy(ethers.parseUnits(usdtAmount, 6));
        console.log('Transaction hash:', tx.hash);

        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);

        res.status(200).json({
            message: 'Purchase transaction successful',
            txHash: tx.hash,
            blockNumber: receipt.blockNumber
        });
    } catch (error) {
        console.error('Error during purchase:', error);
        res.status(500).json({ error: 'Failed to process purchase', details: error.message });
    }
});

// Endpoint 2: POST /match/start
app.post('/match/start', async (req, res) => {
    try {
        const { matchId, p1, p2, stakeAmount } = req.body;
        if (!matchId || !p1 || !p2 || !stakeAmount) {
            return res.status(400).json({ error: 'Match details are required.' });
        }

        console.log(`Creating match: ${matchId}, Players: ${p1}, ${p2}, Stake: ${stakeAmount}`);

        // Call the createMatch function on the PlayGame contract
        const tx = await playGameContract.createMatch(matchId, p1, p2, ethers.parseUnits(stakeAmount, 18));
        console.log('Transaction hash:', tx.hash);

        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);

        res.status(200).json({
            message: 'Match creation transaction successful',
            txHash: tx.hash,
            blockNumber: receipt.blockNumber
        });
    } catch (error) {
        console.error('Error starting match:', error);
        res.status(500).json({ error: 'Failed to start match', details: error.message });
    }
});

// Endpoint 3: POST /match/result
app.post('/match/result', async (req, res) => {
    try {
        const { matchId, winner } = req.body;
        if (!matchId || !winner) {
            return res.status(400).json({ error: 'Match ID and winner are required.' });
        }

        console.log(`Committing result for match: ${matchId}, Winner: ${winner}`);

        // Call the commitResult function on the PlayGame contract
        const tx = await playGameContract.commitResult(matchId, winner);
        console.log('Transaction hash:', tx.hash);

        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);

        res.status(200).json({
            message: 'Match result transaction successful',
            txHash: tx.hash,
            blockNumber: receipt.blockNumber
        });
    } catch (error) {
        console.error('Error committing result:', error);
        res.status(500).json({ error: 'Failed to commit match result', details: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
    console.log('Available endpoints:');
    console.log('   GET  /health - Server health check');
    console.log('   GET  /purchase?amount=<usdt_amount> - Purchase GT tokens');
    console.log('   POST /match/start - Create a new match');
    console.log('   POST /match/result - Commit match result');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});