# Comprehensive Hardhat Test Suite Development Guide

## Overview
This guide provides a complete framework for developing professional smart contract test suites using Hardhat, covering everything from basic deployment tests to advanced security scenarios.

## Testing Philosophy

### Test Categories
1. **Unit Tests** - Test individual functions in isolation
2. **Integration Tests** - Test interactions between multiple contracts
3. **Edge Case Tests** - Test boundary conditions and extreme values
4. **Security Tests** - Test access control, reentrancy, overflow scenarios
5. **Gas Optimization Tests** - Monitor and optimize gas usage

### Testing Pyramid
```
        /\
       /  \  E2E/Integration (10%)
      /____\
     /      \  Integration (20%)
    /________\
   /          \ Unit Tests (70%)
  /__________\
```

## Project Structure
```
test/
├── unit/
│   ├── Token.test.js
│   ├── Staking.test.js
│   └── Governance.test.js
├── integration/
│   ├── TokenStaking.test.js
│   └── FullWorkflow.test.js
├── fixtures/
│   ├── deployments.js
│   └── testData.js
└── helpers/
    ├── time.js
    ├── errors.js
    └── constants.js
```

## Essential Testing Patterns

### 1. Fixture Pattern (Recommended)
Use `loadFixture` from `@nomicfoundation/hardhat-toolbox` for faster tests:

```javascript
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

async function deployTokenFixture() {
  const [owner, addr1, addr2] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("MyToken");
  const token = await Token.deploy("MyToken", "MTK", 1000000);
  
  return { token, owner, addr1, addr2 };
}

describe("MyToken", function () {
  it("Should assign initial supply to owner", async function () {
    const { token, owner } = await loadFixture(deployTokenFixture);
    // Test code here
  });
});
```

### 2. Test Organization Pattern
```javascript
describe("ContractName", function () {
  describe("Deployment", function () {
    it("Should set the right owner", async function () { });
    it("Should assign total supply to owner", async function () { });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () { });
    it("Should fail if sender doesn't have enough tokens", async function () { });
  });

  describe("Edge Cases", function () {
    it("Should handle zero address correctly", async function () { });
    it("Should handle max uint256 values", async function () { });
  });
});
```

### 3. Event Testing Pattern
```javascript
it("Should emit Transfer event", async function () {
  const { token, owner, addr1 } = await loadFixture(deployTokenFixture);
  
  await expect(token.transfer(addr1.address, 100))
    .to.emit(token, "Transfer")
    .withArgs(owner.address, addr1.address, 100);
});
```

### 4. Revert Testing Pattern
```javascript
it("Should revert with custom error", async function () {
  const { token, addr1 } = await loadFixture(deployTokenFixture);
  
  // For custom errors (Solidity 0.8.4+)
  await expect(token.connect(addr1).transfer(addr2.address, 1000))
    .to.be.revertedWithCustomError(token, "InsufficientBalance");
  
  // For string error messages
  await expect(token.connect(addr1).transfer(addr2.address, 1000))
    .to.be.revertedWith("ERC20: transfer amount exceeds balance");
});
```

### 5. State Change Testing Pattern
```javascript
it("Should update balances correctly", async function () {
  const { token, owner, addr1 } = await loadFixture(deployTokenFixture);
  
  const initialOwnerBalance = await token.balanceOf(owner.address);
  const initialAddr1Balance = await token.balanceOf(addr1.address);
  
  await token.transfer(addr1.address, 100);
  
  expect(await token.balanceOf(owner.address))
    .to.equal(initialOwnerBalance - 100n);
  expect(await token.balanceOf(addr1.address))
    .to.equal(initialAddr1Balance + 100n);
});
```

### 6. Time Manipulation Pattern
```javascript
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

it("Should handle time-locked functions", async function () {
  const { contract } = await loadFixture(deployFixture);
  
  // Increase time by 1 day
  await time.increase(86400);
  
  // Set time to specific timestamp
  const unlockTime = (await time.latest()) + 86400;
  await time.increaseTo(unlockTime);
  
  // Mine blocks
  await mine(100); // Mine 100 blocks
});
```

### 7. Impersonation Pattern
```javascript
const { impersonateAccount } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

it("Should allow impersonating accounts", async function () {
  const whaleAddress = "0x...";
  await impersonateAccount(whaleAddress);
  const whale = await ethers.getSigner(whaleAddress);
  
  // Use whale signer for transactions
  await contract.connect(whale).someFunction();
});
```

### 8. Snapshot Pattern (for complex setups)
```javascript
const { takeSnapshot } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Complex tests", function () {
  let snapshot;
  
  beforeEach(async function () {
    // Setup complex state
    snapshot = await takeSnapshot();
  });
  
  afterEach(async function () {
    await snapshot.restore();
  });
});
```

## Advanced Testing Techniques

### 1. Fuzzing with Multiple Inputs
```javascript
const testValues = [0, 1, 100, 1000, ethers.MaxUint256];

testValues.forEach((value) => {
  it(`Should handle value ${value} correctly`, async function () {
    // Test with different values
  });
});
```

### 2. Gas Optimization Tracking
```javascript
it("Should use reasonable gas", async function () {
  const { token, addr1 } = await loadFixture(deployTokenFixture);
  
  const tx = await token.transfer(addr1.address, 100);
  const receipt = await tx.wait();
  
  console.log(`Gas used: ${receipt.gasUsed}`);
  expect(receipt.gasUsed).to.be.lessThan(50000);
});
```

### 3. Coverage for Access Control
```javascript
describe("Access Control", function () {
  it("Should allow owner to mint", async function () {
    const { token, owner } = await loadFixture(deployTokenFixture);
    await expect(token.mint(owner.address, 1000)).to.not.be.reverted;
  });
  
  it("Should prevent non-owner from minting", async function () {
    const { token, addr1 } = await loadFixture(deployTokenFixture);
    await expect(token.connect(addr1).mint(addr1.address, 1000))
      .to.be.revertedWith("Ownable: caller is not the owner");
  });
});
```

### 4. Reentrancy Testing
```javascript
it("Should prevent reentrancy attacks", async function () {
  const { vulnerable, attacker } = await loadFixture(deployFixture);
  
  await expect(attacker.attack(vulnerable.address))
    .to.be.revertedWith("ReentrancyGuard: reentrant call");
});
```

### 5. Integration Testing Pattern
```javascript
describe("Token + Staking Integration", function () {
  async function deployFullSystemFixture() {
    const [owner, user1] = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory("MyToken");
    const token = await Token.deploy();
    
    const Staking = await ethers.getContractFactory("Staking");
    const staking = await Staking.deploy(token.address);
    
    // Setup initial state
    await token.transfer(user1.address, 1000);
    await token.connect(user1).approve(staking.address, 1000);
    
    return { token, staking, owner, user1 };
  }
  
  it("Should allow staking and reward claiming", async function () {
    const { token, staking, user1 } = await loadFixture(deployFullSystemFixture);
    
    await staking.connect(user1).stake(100);
    await time.increase(86400); // 1 day
    await staking.connect(user1).claimRewards();
    
    expect(await token.balanceOf(user1.address)).to.be.greaterThan(900);
  });
});
```

## Common Test Helpers

### Constants Helper
```javascript
// helpers/constants.js
module.exports = {
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
  MAX_UINT256: ethers.MaxUint256,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
  ONE_YEAR: 31536000,
};
```

### Error Helper
```javascript
// helpers/errors.js
async function expectRevert(promise, errorMessage) {
  try {
    await promise;
    throw new Error("Expected transaction to revert");
  } catch (error) {
    expect(error.message).to.include(errorMessage);
  }
}

module.exports = { expectRevert };
```

### Time Helper
```javascript
// helpers/time.js
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

async function increaseTime(seconds) {
  await time.increase(seconds);
}

async function mineBlocks(count) {
  for (let i = 0; i < count; i++) {
    await network.provider.send("evm_mine");
  }
}

module.exports = { increaseTime, mineBlocks };
```

## Best Practices Checklist

- ✅ Use fixtures for faster test execution
- ✅ Test all state-changing functions
- ✅ Test access control and permissions
- ✅ Test edge cases (0, max values, boundaries)
- ✅ Test event emissions with correct parameters
- ✅ Test revert conditions and error messages
- ✅ Use descriptive test names
- ✅ Group related tests with describe blocks
- ✅ Keep tests independent and isolated
- ✅ Test integration between contracts
- ✅ Monitor gas usage for expensive operations
- ✅ Test with multiple user accounts
- ✅ Test time-dependent functionality
- ✅ Coverage for all public/external functions
- ✅ Test reentrancy protection
- ✅ Test integer overflow/underflow scenarios
- ✅ Test proper state transitions
- ✅ Document complex test scenarios

## Running Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/unit/Token.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run with coverage
npx hardhat coverage

# Run tests with console logs
npx hardhat test --logs

# Run tests on specific network
npx hardhat test --network localhost
```

## Coverage Goals

- **Statement Coverage**: >95%
- **Branch Coverage**: >90%
- **Function Coverage**: 100%
- **Line Coverage**: >95%

## Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Hardhat Network Helpers](https://hardhat.org/hardhat-network-helpers/docs)
- [Chai Matchers](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html)
- [OpenZeppelin Test Helpers](https://docs.openzeppelin.com/test-helpers/)
