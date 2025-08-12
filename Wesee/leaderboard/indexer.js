const { ethers } = require('ethers');
const express = require('express');
require('dotenv').config({ path: '../backend/.env' }); // Assuming .env is in the parent directory

const app = express();
const port = 3001; // Use a different port to avoid conflict with the backend server

// Load environment variables
const RPC_URL = process.env.RPC_URL;
const GAME_TOKEN_ADDRESS = process.env.GAME_TOKEN_ADDRESS;
const TOKEN_STORE_ADDRESS = process.env.TOKEN_STORE_ADDRESS;
const PLAY_GAME_ADDRESS = process.env.PLAY_GAME_ADDRESS;

// Correct paths to ABI files
const TokenStoreABI = require('../artifacts/contracts/TokenStore.sol/TokenStore.json').abi;
const PlayGameABI = require('../artifacts/contracts/PlayGame.sol/PlayGame.json').abi;

// In-memory data structure to store leaderboard stats
let leaderboardData = {}; // keys: address, values: { winsByAddress, totalGtWon, matchesPlayed }

// Setup provider and contract instances
const provider = new ethers.JsonRpcProvider(RPC_URL);
const tokenStoreContract = new ethers.Contract(TOKEN_STORE_ADDRESS, TokenStoreABI, provider);
const playGameContract = new ethers.Contract(PLAY_GAME_ADDRESS, PlayGameABI, provider);

// Function to update the leaderboard
function updateLeaderboard(address, gtWon, isWinner = false) {
    if (!leaderboardData[address]) {
        leaderboardData[address] = { winsByAddress: 0, totalGtWon: BigInt(0), matchesPlayed: 0 };
    }
    if (isWinner) {
        leaderboardData[address].winsByAddress += 1;
    }
    leaderboardData[address].totalGtWon += gtWon;
    leaderboardData[address].matchesPlayed += 1;
}

// Event listener for Purchase event from TokenStore contract
tokenStoreContract.on('Purchase', (buyer, usdtAmount, gtOut) => {
    console.log(`[Event] Purchase: ${buyer} bought ${ethers.formatUnits(gtOut, 18)} GT`);
    // The instructions don't specify how to track purchases,
    // so we can log it here.
});

// Event listener for Staked event from PlayGame contract
playGameContract.on('Staked', (matchId, staker) => {
    console.log(`[Event] Staked: Player ${staker} staked for match ${matchId}`);
});

// Event listener for Settled event from PlayGame contract
playGameContract.on('Settled', (matchId, winner) => {
    console.log(`[Event] Settled: Match ${matchId} settled, winner is ${winner}`);
    // The instructions mention tracking wins and GT won
    if (winner !== ethers.ZeroAddress) { // Assuming winner is not zero address for a valid settlement
        // You'll need to fetch the stake amount from the match details
        // For simplicity, this is an example implementation
        // A more robust implementation would fetch details from the contract
        updateLeaderboard(winner, BigInt(0), true); // Update winner's stats
    }
});

// Event listener for Refunded event from PlayGame contract
playGameContract.on('Refunded', (matchId) => {
    console.log(`[Event] Refunded: Match ${matchId} refunded.`);
    // No leaderboard stats to update here, just logging
});

// API endpoint to serve the leaderboard
app.get('/leaderboard', (req, res) => {
    // Convert the object to an array and sort by totalGtWon
    const sortedLeaderboard = Object.keys(leaderboardData)
        .map(address => ({ address, ...leaderboardData[address] }))
        .sort((a, b) => Number(b.totalGtWon - a.totalGtWon));

    // Return the top 10 winners
    res.json(sortedLeaderboard.slice(0, 10));
});

app.listen(port, () => {
    console.log(`Leaderboard Indexer listening at http://localhost:${port}`);
    console.log('Listening for blockchain events...');
});