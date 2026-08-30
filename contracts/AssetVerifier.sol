// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract AssetVerifier {
    IERC20 public usdtToken;
    address public owner;
    uint256 public verificationFee;
    
    struct Verification {
        bool isVerified;
        uint256 timestamp;
        uint256 amountPaid;
    }
    
    mapping(address => Verification) public verifications;
    mapping(address => bool) public authorizedVerifiers;
    
    event AssetVerified(address indexed user, uint256 amount, uint256 timestamp);
    event FeeUpdated(uint256 newFee);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedVerifiers[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }
    
    constructor(address _usdtToken, uint256 _verificationFee) {
        usdtToken = IERC20(_usdtToken);
        owner = msg.sender;
        verificationFee = _verificationFee;
        authorizedVerifiers[msg.sender] = true;
    }
    
    function verifyAssets() external {
        require(!verifications[msg.sender].isVerified, "Already verified");
        require(usdtToken.balanceOf(msg.sender) >= verificationFee, "Insufficient USDT balance");
        require(usdtToken.allowance(msg.sender, address(this)) >= verificationFee, "Insufficient allowance");
        
        // Transfer USDT from user to contract
        require(usdtToken.transferFrom(msg.sender, address(this), verificationFee), "Payment failed");
        
        // Mark as verified
        verifications[msg.sender] = Verification({
            isVerified: true,
            timestamp: block.timestamp,
            amountPaid: verificationFee
        });
        
        emit AssetVerified(msg.sender, verificationFee, block.timestamp);
    }
    
    function isVerified(address user) external view returns (bool) {
        return verifications[user].isVerified;
    }
    
    function getVerificationDetails(address user) external view returns (bool, uint256, uint256) {
        Verification memory verification = verifications[user];
        return (verification.isVerified, verification.timestamp, verification.amountPaid);
    }
    
    function setVerificationFee(uint256 _newFee) external onlyOwner {
        verificationFee = _newFee;
        emit FeeUpdated(_newFee);
    }
    
    function addVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = true;
        emit VerifierAdded(_verifier);
    }
    
    function removeVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }
    
    function withdrawUSDT(uint256 amount) external onlyOwner {
        require(usdtToken.transfer(owner, amount), "Withdrawal failed");
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdtToken.balanceOf(address(this));
        require(usdtToken.transfer(owner, balance), "Emergency withdrawal failed");
    }
}
