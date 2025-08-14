// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Define an interface for the TokenStore contract
// This is not strictly necessary for deployment, but good practice
interface ITokenStore {
    // This is an example, you can add more functions as needed
}

contract GameToken is ERC20 {
    // The address of the TokenStore contract that is authorized to mint tokens.
    address public tokenStoreAddress;

    // A modifier to ensure only the TokenStore contract can call the mint function.
    modifier onlyTokenStore() {
        require(msg.sender == tokenStoreAddress, "Only TokenStore can mint tokens");
        _;
    }

    // The constructor sets the name and symbol of the ERC-20 token.
    constructor() ERC20("Game Token", "GT") {}

    // A function to set the address of the TokenStore contract.
    // This should be called once after deployment.
    // It's a good practice to restrict who can call this function,
    // for example, only the contract's deployer.
    function setTokenStoreAddress(address _tokenStoreAddress) external {
        // You would typically add an `onlyOwner` or similar check here.
        tokenStoreAddress = _tokenStoreAddress;
    }

    // The mint function, which is callable only by the TokenStore contract.
    function mint(address to, uint256 amount) external onlyTokenStore {
        _mint(to, amount);
    }
}