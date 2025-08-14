const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const cors = require('cors');
const { futimesSync } = require('fs');
require('dotenv').config({path: '../../backend/.env'});
const { ethers } = require('ethers')

const RPC_URL = process.env.RPC_URL;
const BACKEND_PRIVATE_KEY = process.env.BACKEND_PRIVATE_KEY;

const GAME_TOKEN_ADDRESS = process.env.GAME_TOKEN_ADDRESS;
const TOKEN_STORE_ADDRESS = process.env.TOKEN_STORE_ADDRESS;
const PLAY_GAME_ADDRESS = process.env.PLAY_GAME_ADDRESS; 

const GameTokenABI = require('../../artifacts/contracts/GameToken.sol/GameToken.json').abi;
const TokenStoreABI = require('../../artifacts/contracts/TokenStore.sol/TokenStore.json').abi;
const PlayGameABI = require('../../artifacts/contracts/PlayGame.sol/PlayGame.json').abi;

let provider,wallet;
try { 
    provider = new ethers.JsonRpcProvider(RPC_URL);
    wallet = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider);

    // walletAddress = await wallet.getAddress();

    console.log('Provider and wallet initialized');
    console.log('wallet address:', wallet.address);
} catch (error) {
    console.error('Error initializing provider or wallet:', error.message);
    process.exit(1);
}

const gameTokenContract = new ethers.Contract(GAME_TOKEN_ADDRESS, GameTokenABI, wallet);
const tokenStoreContract = new ethers.Contract(TOKEN_STORE_ADDRESS, TokenStoreABI, wallet);
const playGameContract = new ethers.Contract(PLAY_GAME_ADDRESS, PlayGameABI, wallet);

console.log('contracts initialized');
console.log('gameTokenContract address:', gameTokenContract.address);
console.log('tokenStoreContract address:', tokenStoreContract.address);
console.log('playGameContract adress:', playGameContract.address);


app.use(cors({
    origin: '*'
}));

app.get('/', (req, res) => {
    res.send('<h1>PING PONG SERVER -- </h1>');
});


let rooms = [];

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on("join", (playerData) => {
        console.log(rooms);

        // get room 
        let room;
        if (rooms.length > 0) {
            room = rooms.find(
                r => r.players.length === 1 && r.stake === playerData.stake
            );
        }

        if (room) {
            socket.join(room.id);
            socket.emit('playerNo', 2);

            // add player to room
            room.players.push({
                socketID: socket.id,
                playerNo: 2,
                score: 0,
                x: 690,
                y: 200,
            });

            // send message to room
            io.to(room.id).emit('startingGame');

            setTimeout(() => {
                io.to(room.id).emit('startedGame', room);

                // start game
                startGame(room);
            }, 3000);
        }
        else {
            room = {
                id: rooms.length + 1,
                players: [{
                    socketID: socket.id,
                    playerNo: 1,
                    score: 0,
                    x: 90,
                    y: 200,
                }],
                ball: {
                    x: 395,
                    y: 245,
                    dx: Math.random() < 0.5 ? 1 : -1,
                    dy: 0,
                },
                winner: 0,
            }
            rooms.push(room);
            socket.join(room.id);
            socket.emit('playerNo', 1);
        }
    });

    socket.on("stakeConfirmed", async (data) => {
        let room = rooms.find(room => room.id === data.roomID);
        if (room) {
            const player = room.players.find(p => p.socketID === socket.id);
            if (player) {
                player.staked = true;
                console.log(`Player ${player.playerNo} in room ${room.id} has staked.`);
            }

            if (room.players.length === 2 && room.players[0].staked && room.players[1].staked) {
                console.log(`Both players in room ${room.id} have staked. Starting game...`);
                io.to(room.id).emit('startingGame');

                setTimeout(() => {
                    io.to(room.id).emit('startedGame', room);
                    startGame(room);
                }, 3000);
            }
        }
    });

    socket.on("move", (data) => {
        let room = rooms.find(room => room.id === data.roomID);

        if (room) {
            if (data.direction === 'up') {
                room.players[data.playerNo - 1].y -= 10;

                if (room.players[data.playerNo - 1].y < 0) {
                    room.players[data.playerNo - 1].y = 0;
                }
            }
            else if (data.direction === 'down') {
                room.players[data.playerNo - 1].y += 10;

                if (room.players[data.playerNo - 1].y > 440) {
                    room.players[data.playerNo - 1].y = 440;
                }
            }
        }

        // update rooms
        rooms = rooms.map(r => {
            if (r.id === room.id) {
                return room;
            }
            else {
                return r;
            }
        });

        io.to(room.id).emit('updateGame', room);
    });

    socket.on("leave", (roomID) => {
        socket.leave(roomID);
    });



    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

function startGame(room) {
    let interval = setInterval(() => {
        room.ball.x += room.ball.dx * 5;
        room.ball.y += room.ball.dy * 5;

        // check if ball hits player 1
        if (room.ball.x < 110 && room.ball.y > room.players[0].y && room.ball.y < room.players[0].y + 60) {
            room.ball.dx = 1;

            // change ball direction
            if (room.ball.y < room.players[0].y + 30) {
                room.ball.dy = -1;
            }
            else if (room.ball.y > room.players[0].y + 30) {
                room.ball.dy = 1;
            }
            else {
                room.ball.dy = 0;
            }
        }

        // check if ball hits player 2
        if (room.ball.x > 690 && room.ball.y > room.players[1].y && room.ball.y < room.players[1].y + 60) {
            room.ball.dx = -1;

            // change ball direction
            if (room.ball.y < room.players[1].y + 30) {
                room.ball.dy = -1;
            }
            else if (room.ball.y > room.players[1].y + 30) {
                room.ball.dy = 1;
            }
            else {
                room.ball.dy = 0;
            }
        }

        // up and down walls
        if (room.ball.y < 5 || room.ball.y > 490) {
            room.ball.dy *= -1;
        }


        // left and right walls
        if (room.ball.x < 5) {
            room.players[1].score += 1;
            room.ball.x = 395;
            room.ball.y = 245;
            room.ball.dx = 1;
            room.ball.dy = 0;
        }

        if (room.ball.x > 795) {
            room.players[0].score += 1;
            room.ball.x = 395;
            room.ball.y = 245;
            room.ball.dx = -1;
            room.ball.dy = 0;
        }


        if (room.players[0].score === 10 || room.players[1].score === 10) {
            clearInterval(interval);
            
            let winnerAddress = room.winner === 1 ? room.players[0].walletAddress : room.players[1].walletAddress;

            console.log(`Game over for room ${room.id}. Winner: ${winnerAddress}`);
            
            playGameContract.commitResult(
                ethers.utils.formatBytes32String(room.id.toString()),
                winnerAddress
            ).then(tx => {
                tx.wait().then(receipt => {
                    console.log(`Payout transaction successful for winner ${winnerAddress}. Tx Hash: ${receipt.transactionHash}`);
                    io.to(room.id).emit('endGame', {
                        ...room,
                        winnerAddress,
                        txHash: receipt.transactionHash
                    });
                    rooms = rooms.filter(r => r.id !== room.id);
                }).catch(error => {
                    console.error('Error waiting for transaction:', error);
                    io.to(room.id).emit('endGame', { ...room, payoutError: true });
                });
            }).catch(error => {
                console.error('Error committing result:', error);
                io.to(room.id).emit('endGame', { ...room, payoutError: true });
            });
        }

        io.to(room.id).emit('updateGame', room);
    }, 1000 / 60);
}



server.listen(8000, () => {
    console.log('listening on *:8000');
});