const { ethers } = require("hardhat");

/**
 * Reusable fixtures for testing
 */

/**
 * Deploy MyToken with default parameters
 */
async function deployTokenFixture() {
  const [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();
  
  const MyToken = await ethers.getContractFactory("MyToken");
  const initialSupply = ethers.parseEther("1000000");
  const token = await MyToken.deploy("MyToken", "MTK", initialSupply);
  
  return { 
    token, 
    owner, 
    addr1, 
    addr2, 
    addr3,
    addr4,
    addr5,
    initialSupply 
  };
}

/**
 * Deploy MyToken with custom parameters
 */
async function deployTokenWithParamsFixture(name = "CustomToken", symbol = "CTK", supply = "500000") {
  const [owner, addr1, addr2, addr3] = await ethers.getSigners();
  
  const MyToken = await ethers.getContractFactory("MyToken");
  const initialSupply = ethers.parseEther(supply);
  const token = await MyToken.deploy(name, symbol, initialSupply);
  
  return { token, owner, addr1, addr2, addr3, initialSupply };
}

/**
 * Deploy token and distribute to multiple addresses
 */
async function deployTokenWithDistributionFixture() {
  const { token, owner, addr1, addr2, addr3, initialSupply } = await deployTokenFixture();
  
  // Distribute tokens
  const amount1 = ethers.parseEther("10000");
  const amount2 = ethers.parseEther("20000");
  const amount3 = ethers.parseEther("30000");
  
  await token.transfer(addr1.address, amount1);
  await token.transfer(addr2.address, amount2);
  await token.transfer(addr3.address, amount3);
  
  return {
    token,
    owner,
    addr1,
    addr2,
    addr3,
    initialSupply,
    distributions: {
      addr1: amount1,
      addr2: amount2,
      addr3: amount3,
    }
  };
}

/**
 * Deploy token with some addresses blacklisted
 */
async function deployTokenWithBlacklistFixture() {
  const { token, owner, addr1, addr2, addr3 } = await deployTokenFixture();
  
  // Blacklist addr2
  await token.setBlacklist(addr2.address, true);
  
  return {
    token,
    owner,
    addr1,
    addr2, // blacklisted
    addr3,
    blacklisted: [addr2.address]
  };
}

/**
 * Deploy token in paused state
 */
async function deployTokenPausedFixture() {
  const fixture = await deployTokenFixture();
  
  await fixture.token.pause();
  
  return fixture;
}

/**
 * Deploy token with minting fees collected
 */
async function deployTokenWithFeesFixture() {
  const { token, owner, addr1, addr2, addr3 } = await deployTokenFixture();
  
  // Perform some minting with fees
  const fee = await token.mintingFee();
  const mintAmount = ethers.parseEther("1000");
  
  await token.connect(addr1).mintWithFee(addr1.address, mintAmount, { value: fee });
  
  const contractBalance = await ethers.provider.getBalance(await token.getAddress());
  
  return {
    token,
    owner,
    addr1,
    addr2,
    addr3,
    contractBalance,
    mintingFee: fee
  };
}

/**
 * Deploy token with approvals set up
 */
async function deployTokenWithApprovalsFixture() {
  const { token, owner, addr1, addr2, addr3 } = await deployTokenFixture();
  
  const approvalAmount1 = ethers.parseEther("5000");
  const approvalAmount2 = ethers.parseEther("10000");
  
  // Set up approvals
  await token.approve(addr1.address, approvalAmount1);
  await token.approve(addr2.address, approvalAmount2);
  
  return {
    token,
    owner,
    addr1,
    addr2,
    addr3,
    approvals: {
      addr1: approvalAmount1,
      addr2: approvalAmount2,
    }
  };
}

/**
 * Deploy token with max supply nearly reached
 */
async function deployTokenNearMaxSupplyFixture() {
  const [owner, addr1, addr2] = await ethers.getSigners();
  
  const MyToken = await ethers.getContractFactory("MyToken");
  const maxSupply = ethers.parseEther("1000000000"); // 1 billion
  const nearMaxSupply = maxSupply - ethers.parseEther("1000"); // Leave only 1000 tokens
  
  const token = await MyToken.deploy("MyToken", "MTK", nearMaxSupply);
  
  return {
    token,
    owner,
    addr1,
    addr2,
    maxSupply,
    remainingSupply: ethers.parseEther("1000")
  };
}

/**
 * Deploy multiple tokens for cross-token testing
 */
async function deployMultipleTokensFixture() {
  const [owner, addr1, addr2, addr3] = await ethers.getSigners();
  
  const MyToken = await ethers.getContractFactory("MyToken");
  
  const token1 = await MyToken.deploy("Token1", "TK1", ethers.parseEther("1000000"));
  const token2 = await MyToken.deploy("Token2", "TK2", ethers.parseEther("2000000"));
  const token3 = await MyToken.deploy("Token3", "TK3", ethers.parseEther("500000"));
  
  return {
    token1,
    token2,
    token3,
    owner,
    addr1,
    addr2,
    addr3
  };
}

/**
 * Create a snapshot fixture for complex test setups
 */
async function createComplexScenarioFixture() {
  const { token, owner, addr1, addr2, addr3 } = await deployTokenFixture();
  
  // Complex setup
  await token.transfer(addr1.address, ethers.parseEther("50000"));
  await token.transfer(addr2.address, ethers.parseEther("30000"));
  
  await token.connect(addr1).approve(addr2.address, ethers.parseEther("10000"));
  await token.connect(addr2).approve(addr3.address, ethers.parseEther("5000"));
  
  // Mint with fee
  const fee = await token.mintingFee();
  await token.connect(addr3).mintWithFee(addr3.address, ethers.parseEther("1000"), { value: fee });
  
  return {
    token,
    owner,
    addr1,
    addr2,
    addr3,
    state: {
      ownerBalance: await token.balanceOf(owner.address),
      addr1Balance: await token.balanceOf(addr1.address),
      addr2Balance: await token.balanceOf(addr2.address),
      addr3Balance: await token.balanceOf(addr3.address),
      totalSupply: await token.totalSupply(),
      contractEthBalance: await ethers.provider.getBalance(await token.getAddress())
    }
  };
}

module.exports = {
  deployTokenFixture,
  deployTokenWithParamsFixture,
  deployTokenWithDistributionFixture,
  deployTokenWithBlacklistFixture,
  deployTokenPausedFixture,
  deployTokenWithFeesFixture,
  deployTokenWithApprovalsFixture,
  deployTokenNearMaxSupplyFixture,
  deployMultipleTokensFixture,
  createComplexScenarioFixture,
};
