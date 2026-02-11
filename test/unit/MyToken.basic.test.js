const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MyToken - Basic Tests", function () {
  // Fixture for deploying the contract
  async function deployTokenFixture() {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    const MyToken = await ethers.getContractFactory("MyToken");
    const initialSupply = ethers.parseEther("1000000"); // 1 million tokens
    const token = await MyToken.deploy("MyToken", "MTK", initialSupply);
    
    return { token, owner, addr1, addr2, addr3, initialSupply };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      expect(await token.name()).to.equal("MyToken");
      expect(await token.symbol()).to.equal("MTK");
    });

    it("Should set the correct decimals", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      expect(await token.decimals()).to.equal(18);
    });

    it("Should assign the initial supply to the owner", async function () {
      const { token, owner, initialSupply } = await loadFixture(deployTokenFixture);
      
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(initialSupply);
    });

    it("Should set the correct total supply", async function () {
      const { token, initialSupply } = await loadFixture(deployTokenFixture);
      
      expect(await token.totalSupply()).to.equal(initialSupply);
    });

    it("Should set the deployer as the owner", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should not be paused initially", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      expect(await token.paused()).to.equal(false);
    });

    it("Should set the correct max supply", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      const maxSupply = ethers.parseEther("1000000000"); // 1 billion
      expect(await token.MAX_SUPPLY()).to.equal(maxSupply);
    });

    it("Should set the default minting fee", async function () {
      const { token } = await loadFixture(deployTokenFixture);
      
      expect(await token.mintingFee()).to.equal(ethers.parseEther("0.001"));
    });

    it("Should revert if initial supply exceeds max supply", async function () {
      const MyToken = await ethers.getContractFactory("MyToken");
      const tooLargeSupply = ethers.parseEther("2000000000"); // 2 billion
      
      await expect(
        MyToken.deploy("MyToken", "MTK", tooLargeSupply)
      ).to.be.revertedWith("Initial supply exceeds max");
    });
  });

  describe("Basic Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);
      
      const transferAmount = ethers.parseEther("100");
      
      await expect(
        token.transfer(addr1.address, transferAmount)
      ).to.changeTokenBalances(
        token,
        [owner, addr1],
        [-transferAmount, transferAmount]
      );
    });

    it("Should emit Transfer event on transfer", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);
      
      const transferAmount = ethers.parseEther("100");
      
      await expect(token.transfer(addr1.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, addr1.address, transferAmount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const { token, addr1, addr2 } = await loadFixture(deployTokenFixture);
      
      const largeAmount = ethers.parseEther("1000");
      
      await expect(
        token.connect(addr1).transfer(addr2.address, largeAmount)
      ).to.be.reverted;
    });

    it("Should update balances after transfers", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
      
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("50");
      
      // Transfer from owner to addr1
      await token.transfer(addr1.address, amount1);
      expect(await token.balanceOf(addr1.address)).to.equal(amount1);
      
      // Transfer from addr1 to addr2
      await token.connect(addr1).transfer(addr2.address, amount2);
      expect(await token.balanceOf(addr1.address)).to.equal(amount1 - amount2);
      expect(await token.balanceOf(addr2.address)).to.equal(amount2);
    });
  });

  describe("Allowances", function () {
    it("Should approve tokens for delegated transfer", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);
      
      const approveAmount = ethers.parseEther("100");
      
      await expect(token.approve(addr1.address, approveAmount))
        .to.emit(token, "Approval")
        .withArgs(owner.address, addr1.address, approveAmount);
      
      expect(await token.allowance(owner.address, addr1.address))
        .to.equal(approveAmount);
    });

    it("Should transfer tokens using transferFrom", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
      
      const amount = ethers.parseEther("100");
      
      // Owner approves addr1 to spend tokens
      await token.approve(addr1.address, amount);
      
      // addr1 transfers tokens from owner to addr2
      await expect(
        token.connect(addr1).transferFrom(owner.address, addr2.address, amount)
      ).to.changeTokenBalances(
        token,
        [owner, addr2],
        [-amount, amount]
      );
    });

    it("Should decrease allowance after transferFrom", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
      
      const approveAmount = ethers.parseEther("100");
      const transferAmount = ethers.parseEther("60");
      
      await token.approve(addr1.address, approveAmount);
      await token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
      
      expect(await token.allowance(owner.address, addr1.address))
        .to.equal(approveAmount - transferAmount);
    });

    it("Should fail transferFrom without approval", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
      
      const amount = ethers.parseEther("100");
      
      await expect(
        token.connect(addr1).transferFrom(owner.address, addr2.address, amount)
      ).to.be.reverted;
    });

    it("Should fail transferFrom with insufficient allowance", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
      
      const approveAmount = ethers.parseEther("50");
      const transferAmount = ethers.parseEther("100");
      
      await token.approve(addr1.address, approveAmount);
      
      await expect(
        token.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount)
      ).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return correct remaining supply", async function () {
      const { token, initialSupply } = await loadFixture(deployTokenFixture);
      
      const maxSupply = await token.MAX_SUPPLY();
      const expectedRemaining = maxSupply - initialSupply;
      
      expect(await token.remainingSupply()).to.equal(expectedRemaining);
    });

    it("Should indicate accounts can mint initially", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);
      
      expect(await token.canMint(addr1.address)).to.equal(true);
    });

    it("Should return zero cooldown for accounts that haven't minted", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);
      
      expect(await token.mintCooldownRemaining(addr1.address)).to.equal(0);
    });

    it("Should return correct balance for multiple accounts", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
      
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("200");
      
      await token.transfer(addr1.address, amount1);
      await token.transfer(addr2.address, amount2);
      
      expect(await token.balanceOf(addr1.address)).to.equal(amount1);
      expect(await token.balanceOf(addr2.address)).to.equal(amount2);
    });

    it("Should return false for blacklisted status by default", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);
      
      expect(await token.blacklisted(addr1.address)).to.equal(false);
    });
  });

  describe("Balance Queries", function () {
    it("Should return zero balance for accounts with no tokens", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);
      
      expect(await token.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should return correct balance after multiple transfers", async function () {
      const { token, owner, addr1 } = await loadFixture(deployTokenFixture);
      
      await token.transfer(addr1.address, ethers.parseEther("100"));
      await token.transfer(addr1.address, ethers.parseEther("50"));
      await token.transfer(addr1.address, ethers.parseEther("25"));
      
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("175"));
    });
  });

  describe("Total Supply", function () {
    it("Should not change total supply on transfers", async function () {
      const { token, owner, addr1, initialSupply } = await loadFixture(deployTokenFixture);
      
      await token.transfer(addr1.address, ethers.parseEther("100"));
      
      expect(await token.totalSupply()).to.equal(initialSupply);
    });

    it("Should maintain total supply across multiple transfers", async function () {
      const { token, owner, addr1, addr2, initialSupply } = await loadFixture(deployTokenFixture);
      
      await token.transfer(addr1.address, ethers.parseEther("100"));
      await token.connect(addr1).transfer(addr2.address, ethers.parseEther("50"));
      await token.transfer(addr2.address, ethers.parseEther("200"));
      
      expect(await token.totalSupply()).to.equal(initialSupply);
    });
  });

  describe("Receive Function", function () {
    it("Should accept ETH transfers", async function () {
      const { token, addr1 } = await loadFixture(deployTokenFixture);
      
      const sendAmount = ethers.parseEther("1");
      
      await expect(
        addr1.sendTransaction({
          to: await token.getAddress(),
          value: sendAmount
        })
      ).to.not.be.reverted;
      
      expect(await ethers.provider.getBalance(await token.getAddress()))
        .to.equal(sendAmount);
    });
  });
});
