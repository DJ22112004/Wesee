Blockchain Game Technical Assessment
This project is an end-to-end decentralized application (dApp) built to assess skills in Blockchain, Smart Contracts, Crypto, Web3, and System Architecture. The solution is divided into three main components: smart contracts, a backend gateway, and a simple frontend, along with a separate leaderboard indexer.


1. Architecture
The application is built with the following architecture:

Smart Contracts: The core logic is implemented in Solidity and deployed on a local Hardhat network. The contracts handle the game's tokens, a token store for purchases, and the main game logic for matches and staking.

Backend (Minimal Gateway): A Node.js server using Express.js and ethers.js that acts as a middleware. It exposes a set of API endpoints for the frontend to interact with the deployed smart contracts.

Frontend: A single HTML page with JavaScript that provides a user interface to interact with the backend gateway.

Indexer/Leaderboard: A separate Node.js script that listens for blockchain events and maintains an in-memory leaderboard, which can be queried via an API.

2. Setup and Installation
Prerequisites
Node.js (v18 or higher)

npm (v8 or higher)

Installation
Clone the repository.

Navigate to the project's root directory (Wesee).

Install all project dependencies by running:

Bash

npm install
Navigate to the backend folder and install its dependencies:

Bash

cd backend
npm install
Create a .env file in the backend folder and populate it with the contract addresses and private key from your deployment step.

3. Running the Application
To run the application, you must start each component in the correct order in separate terminal windows.

Step 1: Start the Local Hardhat Node
Open a terminal in the project's root directory and start the local blockchain network. This terminal must remain open for the duration of the demo.

Bash

npx hardhat node
Step 2: Deploy the Smart Contracts
Open a second terminal in the project's root directory and run the deployment script. Copy the contract addresses and the deployer's private key, and paste them into your backend/.env file.

Bash

npx hardhat run scripts/deploy.js --network localhost
Step 3: Start the Backend Server
Open a third terminal, navigate to the backend folder, and start the server.

Bash

cd backend
node server.js
Step 4: Start the Leaderboard Indexer
Open a fourth terminal, navigate to the leaderboard folder, and start the indexer.

Bash

cd leaderboard
node indexer.js
Step 5: Open the Frontend
Open the frontend/index.html file in your web browser.

4. Happy-Path Demo
This section guides you through a basic flow to demonstrate the core functionality.

Buy GT Tokens: On the frontend, enter an amount of USDT (e.g., 100) and click "Buy GT with USDT". This will trigger a transaction via the backend to mint new GT tokens.

Create/Stake a Match:

On the frontend, enter a matchId and two player addresses.

Click "Create/Stake Match" to create a new match.

Submit a Result:

On the frontend, enter the same matchId and the address of the winning player.

Click "Submit Result" to finalize the match. The backend will call the smart contract to transfer the prize to the winner.

View Leaderboard: You can access the leaderboard by navigating to the API endpoint http://localhost:3001/leaderboard.

5. Assumptions
Hardhat is the development environment of choice.

The artifacts folder, node_modules folder, and .env file are not committed to the repository for security reasons.

The backend's POST endpoints expect a JSON body.

The project is run on a local machine and all services communicate via localhost.
