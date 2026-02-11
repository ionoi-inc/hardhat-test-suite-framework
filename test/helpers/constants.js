const { ethers } = require("hardhat");

/**
 * Common constants for testing
 */
module.exports = {
  // Addresses
  ZERO_ADDRESS: ethers.ZeroAddress,
  DEAD_ADDRESS: "0x000000000000000000000000000000000000dEaD",
  
  // Numbers
  MAX_UINT256: ethers.MaxUint256,
  ZERO: 0n,
  ONE: 1n,
  
  // Time periods (in seconds)
  ONE_MINUTE: 60,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
  ONE_MONTH: 2592000, // 30 days
  ONE_YEAR: 31536000,
  
  // Common token amounts (in wei)
  ONE_TOKEN: ethers.parseEther("1"),
  TEN_TOKENS: ethers.parseEther("10"),
  HUNDRED_TOKENS: ethers.parseEther("100"),
  THOUSAND_TOKENS: ethers.parseEther("1000"),
  MILLION_TOKENS: ethers.parseEther("1000000"),
  
  // Common ETH amounts
  ONE_WEI: 1n,
  ONE_GWEI: ethers.parseUnits("1", "gwei"),
  ONE_ETHER: ethers.parseEther("1"),
  TEN_ETHER: ethers.parseEther("10"),
  HUNDRED_ETHER: ethers.parseEther("100"),
  
  // Gas limits
  DEFAULT_GAS_LIMIT: 300000,
  HIGH_GAS_LIMIT: 1000000,
  
  // Percentages (in basis points)
  PERCENT_1: 100,
  PERCENT_5: 500,
  PERCENT_10: 1000,
  PERCENT_25: 2500,
  PERCENT_50: 5000,
  PERCENT_100: 10000,
  
  // Common strings
  EMPTY_STRING: "",
  EMPTY_BYTES: "0x",
  
  // ERC20 Errors
  ERC20_ERRORS: {
    INSUFFICIENT_BALANCE: "ERC20InsufficientBalance",
    INSUFFICIENT_ALLOWANCE: "ERC20InsufficientAllowance",
    INVALID_SENDER: "ERC20InvalidSender",
    INVALID_RECEIVER: "ERC20InvalidReceiver",
    INVALID_SPENDER: "ERC20InvalidSpender",
    INVALID_APPROVER: "ERC20InvalidApprover",
  },
  
  // Ownable Errors
  OWNABLE_ERRORS: {
    UNAUTHORIZED: "OwnableUnauthorizedAccount",
    INVALID_OWNER: "OwnableInvalidOwner",
  },
  
  // Pausable Errors
  PAUSABLE_ERRORS: {
    ENFORCED_PAUSE: "EnforcedPause",
    EXPECTED_PAUSE: "ExpectedPause",
  },
};
