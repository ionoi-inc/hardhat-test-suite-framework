// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MyToken
 * @dev Advanced ERC20 token with minting, burning, pausing, and ownership features
 */
contract MyToken is ERC20, Ownable, Pausable, ReentrancyGuard {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public mintingFee = 0.001 ether;
    
    mapping(address => bool) public blacklisted;
    mapping(address => uint256) public lastMintTime;
    
    uint256 public constant MINT_COOLDOWN = 1 days;
    
    event TokensMinted(address indexed to, uint256 amount, uint256 fee);
    event TokensBurned(address indexed from, uint256 amount);
    event BlacklistUpdated(address indexed account, bool status);
    event MintingFeeUpdated(uint256 oldFee, uint256 newFee);
    event EmergencyWithdraw(address indexed to, uint256 amount);
    
    error InsufficientBalance(uint256 requested, uint256 available);
    error MaxSupplyExceeded(uint256 requested, uint256 remaining);
    error AccountBlacklisted(address account);
    error MintCooldownActive(uint256 timeRemaining);
    error InvalidAmount();
    error InvalidAddress();
    error InsufficientFee(uint256 required, uint256 provided);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(initialSupply <= MAX_SUPPLY, "Initial supply exceeds max");
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Mint tokens with fee (anyone can call with fee)
     */
    function mintWithFee(address to, uint256 amount) external payable nonReentrant whenNotPaused {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (blacklisted[to]) revert AccountBlacklisted(to);
        if (msg.value < mintingFee) revert InsufficientFee(mintingFee, msg.value);
        
        uint256 remaining = MAX_SUPPLY - totalSupply();
        if (amount > remaining) revert MaxSupplyExceeded(amount, remaining);
        
        // Check cooldown
        uint256 timeSinceLastMint = block.timestamp - lastMintTime[msg.sender];
        if (lastMintTime[msg.sender] > 0 && timeSinceLastMint < MINT_COOLDOWN) {
            revert MintCooldownActive(MINT_COOLDOWN - timeSinceLastMint);
        }
        
        lastMintTime[msg.sender] = block.timestamp;
        _mint(to, amount);
        
        emit TokensMinted(to, amount, msg.value);
    }

    /**
     * @dev Owner can mint without fee
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        
        uint256 remaining = MAX_SUPPLY - totalSupply();
        if (amount > remaining) revert MaxSupplyExceeded(amount, remaining);
        
        _mint(to, amount);
        emit TokensMinted(to, amount, 0);
    }

    /**
     * @dev Burn tokens from caller's balance
     */
    function burn(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        if (balanceOf(msg.sender) < amount) {
            revert InsufficientBalance(amount, balanceOf(msg.sender));
        }
        
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Update blacklist status
     */
    function setBlacklist(address account, bool status) external onlyOwner {
        if (account == address(0)) revert InvalidAddress();
        blacklisted[account] = status;
        emit BlacklistUpdated(account, status);
    }

    /**
     * @dev Update minting fee
     */
    function setMintingFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = mintingFee;
        mintingFee = newFee;
        emit MintingFeeUpdated(oldFee, newFee);
    }

    /**
     * @dev Pause token transfers
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdraw collected fees
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert InvalidAmount();
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit EmergencyWithdraw(owner(), balance);
    }

    /**
     * @dev Override transfer to add blacklist and pause checks
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        if (from != address(0) && blacklisted[from]) revert AccountBlacklisted(from);
        if (to != address(0) && blacklisted[to]) revert AccountBlacklisted(to);
        
        super._update(from, to, amount);
    }

    /**
     * @dev Get remaining supply that can be minted
     */
    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    /**
     * @dev Check if account can mint (cooldown expired)
     */
    function canMint(address account) external view returns (bool) {
        if (lastMintTime[account] == 0) return true;
        return block.timestamp >= lastMintTime[account] + MINT_COOLDOWN;
    }

    /**
     * @dev Get time until mint cooldown expires
     */
    function mintCooldownRemaining(address account) external view returns (uint256) {
        if (lastMintTime[account] == 0) return 0;
        
        uint256 cooldownEnd = lastMintTime[account] + MINT_COOLDOWN;
        if (block.timestamp >= cooldownEnd) return 0;
        
        return cooldownEnd - block.timestamp;
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}
