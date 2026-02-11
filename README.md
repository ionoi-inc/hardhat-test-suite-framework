# Hardhat Test Suite Framework

Comprehensive Hardhat test suite framework for smart contract testing with advanced patterns and best practices.

## Overview

This repository provides a production-ready testing framework for Ethereum smart contracts using Hardhat. It demonstrates professional testing patterns, including unit tests, integration tests, fixture management, and advanced testing techniques for real-world DeFi applications.

## Features

### Testing Patterns
- **Fixture-Based Testing** - Efficient test setup using `loadFixture` for faster execution
- **Unit Tests** - Comprehensive coverage of individual contract functions
- **Integration Tests** - Complex multi-user workflows and edge cases
- **Advanced Tests** - Access control, security, gas optimization, and edge cases
- **Reusable Fixtures** - Pre-configured test scenarios for common setups
- **Helper Libraries** - Constants and utilities for consistent test data

### Smart Contract Features (Example Token)
- ERC20 token with advanced features
- Minting with fees and cooldown periods
- Pausable transfers
- Blacklist functionality
- Owner-only administrative functions
- Reentrancy protection
- Custom error handling
- Emergency withdrawal mechanism

### Test Coverage
- ✅ Deployment and initialization
- ✅ Token transfers and approvals
- ✅ Minting (owner and fee-based)
- ✅ Burning functionality
- ✅ Access control and ownership
- ✅ Pausable mechanism
- ✅ Blacklist functionality
- ✅ Edge cases and error handling
- ✅ Gas optimization scenarios
- ✅ Multi-user workflows
- ✅ Time-based functionality (cooldowns)
- ✅ Maximum supply constraints

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Clone the repository:
```bash
git clone https://github.com/ionoi-inc/hardhat-test-suite-framework.git
cd hardhat-test-suite-framework
```

2. Install dependencies:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts
```

3. Initialize Hardhat (if not already configured):
```bash
npx hardhat init
```

## Project Structure

```
hardhat-test-suite-framework/
├── contracts/
│   └── MyToken.sol              # Example ERC20 token with advanced features
├── test/
│   ├── unit/
│   │   ├── MyToken.basic.test.js     # Basic functionality tests
│   │   └── MyToken.advanced.test.js   # Advanced features and edge cases
│   ├── integration/
│   │   └── ComplexScenarios.test.js   # Multi-user workflows
│   └── helpers/
│       ├── constants.js               # Reusable test constants
│       └── fixtures.js                # Fixture functions for test setup
├── docs/
│   └── hardhat-testing-guide.md       # Comprehensive testing guide
├── hardhat.config.js
├── package.json
└── README.md
```

## Usage

### Running Tests

Run all tests:
```bash
npx hardhat test
```

Run specific test file:
```bash
npx hardhat test test/unit/MyToken.basic.test.js
```

Run tests with gas reporting:
```bash
REPORT_GAS=true npx hardhat test
```

Run tests with coverage:
```bash
npx hardhat coverage
```

### Test Categories

#### 1. Basic Unit Tests (`test/unit/MyToken.basic.test.js`)
Covers fundamental functionality:
- Deployment and initialization
- Token transfers
- Approvals and allowances
- Balance checks
- Event emissions

```bash
npx hardhat test test/unit/MyToken.basic.test.js
```

#### 2. Advanced Tests (`test/unit/MyToken.advanced.test.js`)
Covers complex scenarios:
- Access control (owner-only functions)
- Pausable functionality
- Blacklist management
- Minting with fees and cooldowns
- Edge cases and error handling
- Maximum supply constraints

```bash
npx hardhat test test/unit/MyToken.advanced.test.js
```

#### 3. Integration Tests (`test/integration/ComplexScenarios.test.js`)
Covers multi-user workflows:
- Complex distribution scenarios
- Fee collection and withdrawal
- Multi-step approval chains
- Emergency scenarios
- Time-based functionality

```bash
npx hardhat test test/integration/ComplexScenarios.test.js
```

## Testing Best Practices

### 1. Use Fixtures for Test Setup
```javascript
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

async function deployTokenFixture() {
  const [owner, addr1, addr2] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("MyToken");
  const token = await Token.deploy("MyToken", "MTK", ethers.parseEther("1000000"));
  return { token, owner, addr1, addr2 };
}

it("Should transfer tokens", async function () {
  const { token, owner, addr1 } = await loadFixture(deployTokenFixture);
  // Test logic here
});
```

### 2. Test Both Success and Failure Cases
```javascript
// Success case
await expect(token.transfer(addr1.address, amount))
  .to.emit(token, "Transfer")
  .withArgs(owner.address, addr1.address, amount);

// Failure case
await expect(
  token.transfer(addr1.address, tooMuchAmount)
).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
```

### 3. Use Custom Errors for Gas Efficiency
```javascript
// Contract
error InsufficientBalance(uint256 requested, uint256 available);

// Test
await expect(
  token.burn(amount)
).to.be.revertedWithCustomError(token, "InsufficientBalance")
  .withArgs(amount, balance);
```

### 4. Test Time-Dependent Functionality
```javascript
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Fast forward time
await time.increase(86400); // 1 day

// Set specific timestamp
await time.increaseTo(futureTimestamp);
```

### 5. Organize with Nested Describes
```javascript
describe("MyToken", function () {
  describe("Deployment", function () {
    it("Should set the correct name", async function () { });
    it("Should set the correct symbol", async function () { });
  });
  
  describe("Transfers", function () {
    it("Should transfer tokens", async function () { });
    it("Should fail with insufficient balance", async function () { });
  });
});
```

## Helper Modules

### Constants (`test/helpers/constants.js`)
Provides reusable constants:
- Common addresses (zero, dead)
- Time periods (day, week, month)
- Token amounts (one, thousand, million)
- ETH amounts (wei, gwei, ether)
- Standard error messages

### Fixtures (`test/helpers/fixtures.js`)
Pre-configured test scenarios:
- `deployTokenFixture` - Basic deployment
- `deployTokenWithDistributionFixture` - Pre-distributed tokens
- `deployTokenWithBlacklistFixture` - With blacklisted addresses
- `deployTokenPausedFixture` - In paused state
- `deployTokenWithFeesFixture` - With collected fees
- `createComplexScenarioFixture` - Multi-step setup

## Documentation

See [docs/hardhat-testing-guide.md](docs/hardhat-testing-guide.md) for comprehensive testing patterns and best practices.

## Example Test Output

```
MyToken - Basic Tests
  Deployment
    ✓ Should set the correct name and symbol (523ms)
    ✓ Should assign the initial supply to the owner (89ms)
  Transfers
    ✓ Should transfer tokens between accounts (145ms)
    ✓ Should fail when sender has insufficient balance (67ms)
  
MyToken - Advanced Tests
  Access Control
    ✓ Should allow owner to mint tokens (234ms)
    ✓ Should prevent non-owner from minting (78ms)
  Pausable
    ✓ Should pause and unpause transfers (189ms)
    
Integration Tests
  Multi-User Workflows
    ✓ Should handle complex distribution workflow (456ms)
    ✓ Should manage fee collection and emergency withdrawal (312ms)

  58 passing (8.4s)
```

## Gas Reporting

Enable gas reporting in `hardhat.config.js`:
```javascript
module.exports = {
  gasReporter: {
    enabled: true,
    currency: "USD",
    gasPrice: 21
  }
};
```

## Code Coverage

Generate coverage report:
```bash
npx hardhat coverage
```

Coverage report will be generated in `coverage/` directory.

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Write tests for new features
2. Ensure all tests pass
3. Follow existing code style
4. Update documentation as needed

## License

MIT License - see LICENSE file for details

## Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Hardhat Network Helpers](https://hardhat.org/hardhat-network-helpers/docs/overview)
- [Chai Matchers](https://hardhat.org/hardhat-chai-matchers/docs/overview)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

## Author

Created by dutchiono as a comprehensive reference for professional smart contract testing.

---

**Note**: This is a testing framework and example implementation. The MyToken contract is for educational purposes only and should not be used in production without thorough security audits.