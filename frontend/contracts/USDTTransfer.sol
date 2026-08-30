// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract USDTTransfer {
    event TransferRequested(address indexed from, address indexed to, uint256 amount);
    event TransferCompleted(address indexed from, address indexed to, uint256 amount);

    function requestTransfer(address to, uint256 amount) external {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than zero");

        emit TransferRequested(msg.sender, to, amount);
    }

    function executeTransfer(address to, uint256 amount) external {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than zero");

        emit TransferCompleted(msg.sender, to, amount);
    }
}
