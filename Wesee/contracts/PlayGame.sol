// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PlayGame is Ownable, ReentrancyGuard {
    // Enums for match status
    enum MatchStatus {
        CREATED,
        STAKED,
        SETTLED
    }

    // Struct to hold match details
    struct Match {
        address player1;
        address player2;
        uint256 stakeAmount;
        MatchStatus status;
        uint256 startTime;
        address winner;
    }

    // State variables
    mapping(bytes32 => Match) public matches;
    IERC20 public gameToken;
    address public backendOperatorAddress;
    uint256 public constant TIMEOUT_DURATION = 24 hours;

    // Events
    event MatchCreated(bytes32 indexed matchId, address player1, address player2, uint256 stakeAmount);
    event Staked(bytes32 indexed matchId, address staker);
    event Settled(bytes32 indexed matchId, address winner);
    event Refunded(bytes32 indexed matchId);

    // Constructor to initialize the contract
    constructor(address _gameTokenAddress, address _backendOperatorAddress) Ownable(msg.sender) {
        require(_gameTokenAddress != address(0), "Invalid GameToken address");
        require(_backendOperatorAddress != address(0), "Invalid backend operator address");
        gameToken = IERC20(_gameTokenAddress);
        backendOperatorAddress = _backendOperatorAddress;
    }

    // Owner function to create a new match
    function createMatch(bytes32 matchId, address p1, address p2, uint256 stakeAmount) external onlyOwner {
        require(matches[matchId].player1 == address(0), "Match already exists");
        require(p1 != address(0) && p2 != address(0), "Invalid player addresses");
        require(p1 != p2, "Players cannot be the same");
        require(stakeAmount > 0, "Stake amount must be greater than zero");

        matches[matchId] = Match({
            player1: p1,
            player2: p2,
            stakeAmount: stakeAmount,
            status: MatchStatus.CREATED,
            startTime: block.timestamp,
            winner: address(0)
        });

        emit MatchCreated(matchId, p1, p2, stakeAmount);
    }

    // Function for players to stake their tokens
    function stake(bytes32 matchId) external nonReentrant {
        Match storage currentMatch = matches[matchId];
        require(currentMatch.player1 != address(0), "Match does not exist");
        require(currentMatch.status == MatchStatus.CREATED, "Match is not in the created state");
        require(msg.sender == currentMatch.player1 || msg.sender == currentMatch.player2, "Only players can stake");

        // Pull exactly the stake amount from the caller
        gameToken.transferFrom(msg.sender, address(this), currentMatch.stakeAmount);

        // Check if both players have staked
        if (gameToken.balanceOf(address(this)) == currentMatch.stakeAmount * 2) {
            currentMatch.status = MatchStatus.STAKED;
            currentMatch.startTime = block.timestamp;
        }

        emit Staked(matchId, msg.sender);
    }

    // Function to commit the result of the match
    function commitResult(bytes32 matchId, address winner) external nonReentrant {
        require(msg.sender == backendOperatorAddress, "Only the backend operator can commit results");
        Match storage currentMatch = matches[matchId];
        require(currentMatch.status == MatchStatus.STAKED, "Match is not in the staked state");
        require(winner == currentMatch.player1 || winner == currentMatch.player2, "Winner must be one of the players");

        // Double-submit safeguard
        require(currentMatch.winner == address(0), "Result already committed");
        currentMatch.winner = winner;

        // Payout to the winner and remaining stake to the loser
        address loser = (winner == currentMatch.player1) ? currentMatch.player2 : currentMatch.player1;
        gameToken.transfer(winner, currentMatch.stakeAmount * 2);

        // Set status to SETTLED
        currentMatch.status = MatchStatus.SETTLED;
        emit Settled(matchId, winner);
    }

    // Function to refund players if the match times out
    function refund(bytes32 matchId) external nonReentrant {
        Match storage currentMatch = matches[matchId];
        require(currentMatch.status == MatchStatus.STAKED, "Match is not in the staked state");
        require(block.timestamp > currentMatch.startTime + TIMEOUT_DURATION, "Timeout period has not passed");

        // Refund both players
        gameToken.transfer(currentMatch.player1, currentMatch.stakeAmount);
        gameToken.transfer(currentMatch.player2, currentMatch.stakeAmount);

        // Update status to REFUNDED (or a similar state)
        currentMatch.status = MatchStatus.SETTLED; // Using SETTLED to mark as resolved
        emit Refunded(matchId);
    }
}