import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.js";

const connectWalletBtn = document.getElementById('connectWalletBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const walletAddressDisplay = document.getElementById('walletAddressDisplay');
const stakeAmountInput = document.getElementById('stakeAmountInput');
const connectWalletSection = document.getElementById('connect-wallet-section');
const startBtn = document.getElementById('startBtn');
const message = document.getElementById('message');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let player1;
let player2;
let ball;

let isGameStarted = false;
let playerNo = 0;
let roomID;
let playerWalletAddress;
let playerStakeAmount;

const socket = io("http://localhost:8000", {
    transports: ['websocket']
});

let signer;
let gameTokenContract;
let playGameContract;
let mockUSDTContract;

connectWalletBtn.addEventListener('click', async () => {
    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = provider.getSigner();
            playerWalletAddress = await signer.getAddress();

            walletAddressDisplay.innerText = `Connected: ${playerWalletAddress}`;
            connectWalletBtn.style.display = 'none';
            joinGameBtn.style.display = 'block';
            
            // You will need to define the ABIs and contract addresses here
            // const GAME_TOKEN_ABI = [ ... ];
            // const PLAY_GAME_ABI = [ ... ];
            // const MOCK_USDT_ABI = [ ... ];
            // const MOCK_USDT_ADDRESS = "0x...";

            // gameTokenContract = new ethers.Contract(GAME_TOKEN_ADDRESS, GAME_TOKEN_ABI, signer);
            // playGameContract = new ethers.Contract(PLAY_GAME_ADDRESS, PLAY_GAME_ABI, signer);
            // mockUSDTContract = new ethers.Contract(MOCK_USDT_ADDRESS, MOCK_USDT_ABI, signer);

        } catch (error) {
            console.error(error);
            alert("Error connecting wallet.");
        }
    } else {
        alert("MetaMask is not installed!");
    }
});

joinGameBtn.addEventListener('click', () => {
    playerStakeAmount = stakeAmountInput.value;
    if (!playerStakeAmount || playerStakeAmount <= 0) {
        alert("Please enter a valid stake amount.");
        return;
    }
    
    if (socket.connected && playerWalletAddress) {
        connectWalletSection.style.display = 'none';
        socket.emit('join', { walletAddress: playerWalletAddress, stake: playerStakeAmount });
        message.innerText = "Waiting for another player...";
        message.style.display = 'block';
    } else {
        alert("Please connect your wallet first.");
    }
});

socket.on("playerNo", (newPlayerNo) => {
    playerNo = newPlayerNo;
});

socket.on("startStaking", (room) => {
    message.innerText = `Match found! Staking ${room.stake} GT...`;
    
    // Simulate approval and staking
    setTimeout(() => {
        socket.emit('stakeConfirmed', { roomID: room.id });
    }, 2000);
});

socket.on("startingGame", () => {
    isGameStarted = true;
    message.innerText = "Game is starting...";
});

socket.on("startedGame", (room) => {
    roomID = room.id;
    message.innerText = "";
    player1 = new Player(room.players[0].x, room.players[0].y, 20, 60, 'red');
    player2 = new Player(room.players[1].x, room.players[1].y, 20, 60, 'blue');
    player1.score = room.players[0].score;
    player2.score = room.players[1].score;
    ball = new Ball(room.ball.x, room.ball.y, 10, 'white');

    window.addEventListener('keydown', (e) => {
        if (isGameStarted) {
            if (e.keyCode === 38) {
                socket.emit("move", { roomID: roomID, playerNo: playerNo, direction: 'up' });
            } else if (e.keyCode === 40) {
                socket.emit("move", { roomID: roomID, playerNo: playerNo, direction: 'down' });
            }
        }
    });
    draw();
});

socket.on("updateGame", (room) => {
    player1.y = room.players[0].y;
    player2.y = room.players[1].y;
    player1.score = room.players[0].score;
    player2.score = room.players[1].score;
    ball.x = room.ball.x;
    ball.y = room.ball.y;
    draw();
});

socket.on("endGame", (room) => {
    isGameStarted = false;
    if (room.payoutError) {
        message.innerText = "Game over! Payout failed.";
    } else {
        message.innerText = `${room.winner === playerNo ? "You are Winner!" : "You are Loser!"} Payout successful! Tx Hash: ${room.txHash}`;
    }
    socket.emit("leave", roomID);
    setTimeout(() => {
        ctx.clearRect(0, 0, 800, 500);
        connectWalletSection.style.display = 'flex';
    }, 2000);
});

function draw() {
    ctx.clearRect(0, 0, 800, 500);
    player1.draw(ctx);
    player2.draw(ctx);
    ball.draw(ctx);
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.setLineDash([10, 10])
    ctx.moveTo(400, 5);
    ctx.lineTo(400, 495);
    ctx.stroke();
}