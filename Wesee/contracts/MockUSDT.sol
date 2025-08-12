// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        // Mint 1,000,000 USDT to the deployer for testing
        // USDT typically has 6 decimals, so we adjust accordingly
        _mint(msg.sender, 1000000 * 10**6);
    }

    // Override decimals to return 6 (like real USDT)
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    // Function to mint more tokens for testing purposes
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}