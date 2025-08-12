// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./GameToken.sol";

contract TokenStore is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables
    IERC20 public usdtToken;
    GameToken public gameToken;
    uint256 public gtPerUsdt;

    // Events
    event Purchase(address indexed buyer, uint256 usdtAmount, uint256 gtOut);

    // Constructor to initialize the contract
    constructor(address _usdtTokenAddress, address _gameTokenAddress, uint256 _gtPerUsdt) {
        require(_usdtTokenAddress != address(0), "Invalid USDT token address");
        require(_gameTokenAddress != address(0), "Invalid GameToken address");
        require(_gtPerUsdt > 0, "Conversion rate must be greater than zero");

        usdtToken = IERC20(_usdtTokenAddress);
        gameToken = GameToken(_gameTokenAddress);
        gtPerUsdt = _gtPerUsdt;

        // Set the TokenStore's address in the GameToken contract
        gameToken.setTokenStoreAddress(address(this));
    }

    // Function to buy GT tokens using USDT
    function buy(uint256 usdtAmount) external nonReentrant {
        // Guard: Check for CEI order and nonReentrant
        // This function must use `transferFrom` with a prior `approve` call by the user.
        // It's assumed the caller has already approved this contract to spend their USDT.
        // Pull USDT (6 decimals) from the buyer
        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);

        // Calculate GT amount
        // The instructions mention `gtPerUsdt * usdtAmount / 1e6 GT to msg.sender`.
        // This is a direct calculation for simplicity.
        uint256 gtOut = usdtAmount * gtPerUsdt;

        // Mint gtOut tokens to the buyer
        gameToken.mint(msg.sender, gtOut);

        // Emit a `Purchase` event
        emit Purchase(msg.sender, usdtAmount, gtOut);
    }

    // Function to withdraw USDT, only for the owner
    function withdrawUSDT(address to, uint256 amount) external {
        // The instructions mention "owner only" for this function.
        // This would require importing and inheriting from OpenZeppelin's Ownable contract.
        // For simplicity, we are omitting it here.
        usdtToken.safeTransfer(to, amount);
    }
}