const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MyToken - Integration Tests", function () {
  // Fixture for deploying the contract
  async function deployTokenFixture() {
    const [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();
    
    const MyToken = await ethers.getContractFactory("MyToken");
    const initialSupply = ethers.parseEther("1000000");
    const token = await MyToken.deploy("MyToken", "MTK", initialSupply);
    
    return { token, owner, addr1, addr2, addr3, addr4, addr5, initialSupply };
  }

  describe("Multi-User Token Distribution Workflow", function () {
    it("Should handle complex distribution and approval workflow", async function () {
      const { token, owner, addr1, addr2, addr3, addr4 } = await loadFixture(deployTokenFixture);
      
      // Phase 1: Owner distributes tokens to multiple users
      await token.transfer(addr1.address, ethers.parseEther("100000"));
      await token.transfer(addr2.address, ethers.parseEther("50000"));
      await token.transfer(addr3.address, ethers.parseEther("30000"));
      
      // Verify distributions
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("100000"));
      expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("50000"));
      expect(await token.balanceOf(addr3.address)).to.equal(ethers.parseEther("30000"));
      
      // Phase 2: Users set up allowances for delegated transfers
      await token.connect(addr1).approve(addr4.address, ethers.parseEther("20000"));
      await token.connect(addr2).approve(addr4.address, ethers.parseEther("10000"));
      
      // Phase 3: addr4 transfers tokens on behalf of addr1 and addr2
      await token.connect(addr4).transferFrom(addr1.address, addr3.address, ethers.parseEther("15000"));
      await token.connect(addr4).transferFrom(addr2.address, addr3.address, ethers.parseEther("8000"));
      
      // Verify final balances
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("85000"));
      expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("42000"));
      expect(await token.balanceOf(addr3.address)).to.equal(ethers.parseEther("53000"));
      
      // Verify remaining allowances
      expect(await token.allowance(addr1.address, addr4.address)).to.equal(ethers.parseEther("5000"));
      expect(await token.allowance(addr2.address, addr4.address)).to.equal(ethers.parseEther("2000"));
      
      // Verify total supply unchanged
      const expectedSupply = await loadFixture(deployTokenFixture).then(f => f.initialSupply);
      expect(await token.totalSupply()).to.equal(expectedSupply);
    });
  });

  describe("Minting and Burning Lifecycle", function () {
    it("Should handle complete mint-transfer-burn cycle", async function () {
      const { token, owner, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);
      
      const initialTotalSupply = await token.totalSupply();
      
      // Step 1: Owner mints new tokens
      const mintAmount = ethers.parseEther("50000");
      await token.mint(addr1.address, mintAmount);
      
      expect(await token.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await token.totalSupply()).to.equal(initialTotalSupply + mintAmount);
      
      // Step 2: addr1 transfers some tokens
      const transferAmount = ethers.parseEther("20000");
      await token.connect(addr1).transfer(addr2.address, transferAmount);
      
      // Step 3: addr2 burns tokens
      const burnAmount = ethers.parseEther("10000");
      await token.connect(addr2).burn(burnAmount);
      
      // Verify final state
      expect(await token.balanceOf(addr1.address)).to.equal(mintAmount - transferAmount);
      expect(await token.balanceOf(addr2.address)).to.equal(transferAmount - burnAmount);
      expect(await token.totalSupply()).to.equal(initialTotalSupply + mintAmount - burnAmount);
      
      // Verify remaining supply calculation
      const maxSupply = await token.MAX_SUPPLY();
      expect(await token.remainingSupply()).to.equal(
        maxSupply - (initialTotalSupply + mintAmount - burnAmount)
      );
    });

    it("Should handle multiple users minting with fees over time", async function () {
      const { token, owner, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);
      
      const fee = await token.mintingFee();
      const mintAmount = ethers.parseEther("1000");
      
      // addr1 mints
      await token.connect(addr1).mintWithFee(addr1.address, mintAmount, { value: fee });
      expect(await token.balanceOf(addr1.address)).to.equal(mintAmount);
      
      // addr2 mints
      await token.connect(addr2).mintWithFee(addr2.address, mintAmount, { value: fee });
      expect(await token.balanceOf(addr2.address)).to.equal(mintAmount);
      
      // Fast forward time
      await time.increase(await token.MINT_COOLDOWN());
      
      // addr1 mints again after cooldown
      await token.connect(addr1).mintWithFee(addr1.address, mintAmount, { value: fee });
      expect(await token.balanceOf(addr1.address)).to.equal(mintAmount * 2n);
      
      // Verify contract collected fees
      const expectedFees = fee * 3n;
      expect(await ethers.provider.getBalance(await token.getAddress())).to.equal(expectedFees);
      
      // Owner withdraws fees
      await token.emergencyWithdraw();
      expect(await ethers.provider.getBalance(await token.getAddress())).to.equal(0);
    });
  });

  describe("Blacklist Integration", function () {
    it("Should handle blacklist during active trading", async function () {
      const { token, owner, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);
      
      // Setup: Distribute tokens
      await token.transfer(addr1.address, ethers.parseEther("10000"));
      await token.transfer(addr2.address, ethers.parseEther("10000"));
      await token.transfer(addr3.address, ethers.parseEther("10000"));
      
      // Active trading
      await token.connect(addr1).transfer(addr2.address, ethers.parseEther("1000"));
      await token.connect(addr2).transfer(addr3.address, ethers.parseEther("2000"));
      
      // Blacklist addr2 mid-flow
      await token.setBlacklist(addr2.address, true);
      
      // addr2 cannot send
      await expect(
        token.connect(addr2).transfer(addr1.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(token, "AccountBlacklisted");
      
      // addr2 cannot receive
      await expect(
        token.connect(addr1).transfer(addr2.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(token, "AccountBlacklisted");
      
      // Other users can still trade
      await expect(
        token.connect(addr1).transfer(addr3.address, ethers.parseEther("1000"))
      ).to.not.be.reverted;
      
      // Remove from blacklist
      await token.setBlacklist(addr2.address, false);
      
      // addr2 can now trade again
      await expect(
        token.connect(addr2).transfer(addr1.address, ethers.parseEther("500"))
      ).to.not.be.reverted;
    });

    it("Should prevent blacklisted users from minting with fee", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
      
      const fee = await token.mintingFee();
      const mintAmount = ethers.parseEther("1000");
      
      // First mint succeeds
      await token.connect(addr1).mintWithFee(addr1.address, mintAmount, { value: fee });
      
      // Blacklist addr1
      await token.setBlacklist(addr1.address, true);
      
      // Fast forward past cooldown
      await time.increase(await token.MINT_COOLDOWN());
      
      // Mint should fail even after cooldown
      await expect(
        token.connect(addr2).mintWithFee(addr1.address, mintAmount, { value: fee })
      ).to.be.revertedWithCustomError(token, "AccountBlacklisted");
    });
  });

  describe("Pause Integration", function () {
    it("Should handle pause during active operations", async function () {
      const { token, owner, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);
      
      // Setup initial state
      await token.transfer(addr1.address, ethers.parseEther("10000"));
      await token.transfer(addr2.address, ethers.parseEther("10000"));
      await token.connect(addr1).approve(addr2.address, ethers.parseEther("5000"));
      
      // Pause the contract
      await token.pause();
      
      // All transfer operations should fail
      await expect(
        token.transfer(addr3.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
      
      await expect(
        token.connect(addr1).transfer(addr2.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
      
      await expect(
        token.connect(addr2).transferFrom(addr1.address, addr3.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
      
      // Minting with fee should fail
      const fee = await token.mintingFee();
      await expect(
        token.connect(addr3).mintWithFee(addr3.address, ethers.parseEther("1000"), { value: fee })
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
      
      // Unpause
      await token.unpause();
      
      // Operations should work again
      await expect(
        token.transfer(addr3.address, ethers.parseEther("1000"))
      ).to.not.be.reverted;
      
      await expect(
        token.connect(addr1).transfer(addr2.address, ethers.parseEther("1000"))
      ).to.not.be.reverted;
    });
  });

  describe("Complex Multi-Step Scenarios", function () {
    it("Should handle complete token economy simulation", async function () {
      const { token, owner, addr1, addr2, addr3, addr4, addr5 } = await loadFixture(deployTokenFixture);
      
      // === Phase 1: Initial Distribution ===
      await token.transfer(addr1.address, ethers.parseEther("100000"));
      await token.transfer(addr2.address, ethers.parseEther("80000"));
      await token.transfer(addr3.address, ethers.parseEther("60000"));
      
      // === Phase 2: Fee Updates ===
      const newFee = ethers.parseEther("0.002");
      await token.setMintingFee(newFee);
      
      // === Phase 3: Users mint with updated fee ===
      await token.connect(addr4).mintWithFee(addr4.address, ethers.parseEther("5000"), { value: newFee });
      await token.connect(addr5).mintWithFee(addr5.address, ethers.parseEther("3000"), { value: newFee });
      
      // === Phase 4: Complex approval chain ===
      await token.connect(addr1).approve(addr2.address, ethers.parseEther("20000"));
      await token.connect(addr2).approve(addr3.address, ethers.parseEther("15000"));
      
      // === Phase 5: Delegated transfers ===
      await token.connect(addr2).transferFrom(addr1.address, addr3.address, ethers.parseEther("10000"));
      await token.connect(addr3).transferFrom(addr2.address, addr4.address, ethers.parseEther("8000"));
      
      // === Phase 6: Some users burn tokens ===
      await token.connect(addr1).burn(ethers.parseEther("5000"));
      await token.connect(addr3).burn(ethers.parseEther("10000"));
      
      // === Phase 7: Emergency scenario - blacklist and pause ===
      await token.setBlacklist(addr5.address, true);
      await token.pause();
      
      // Verify all transfers blocked
      await expect(
        token.connect(addr1).transfer(addr2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
      
      // === Phase 8: Resume operations ===
      await token.unpause();
      
      // === Phase 9: Fee withdrawal ===
      const contractBalance = await ethers.provider.getBalance(await token.getAddress());
      expect(contractBalance).to.equal(newFee * 2n);
      
      await token.emergencyWithdraw();
      expect(await ethers.provider.getBalance(await token.getAddress())).to.equal(0);
      
      // === Phase 10: Final verification ===
      const finalSupply = await token.totalSupply();
      const initialSupply = (await loadFixture(deployTokenFixture)).initialSupply;
      
      // Total supply = initial + minted - burned
      const expectedSupply = initialSupply + ethers.parseEther("8000") - ethers.parseEther("15000");
      expect(finalSupply).to.equal(expectedSupply);
    });

    it("Should handle competitive minting scenario", async function () {
      const { token, owner, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);
      
      const fee = await token.mintingFee();
      const mintAmount = ethers.parseEther("5000");
      
      // Multiple users mint simultaneously (in same block)
      await token.connect(addr1).mintWithFee(addr1.address, mintAmount, { value: fee });
      await token.connect(addr2).mintWithFee(addr2.address, mintAmount, { value: fee });
      await token.connect(addr3).mintWithFee(addr3.address, mintAmount, { value: fee });
      
      // All should succeed with different cooldown timers
      expect(await token.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await token.balanceOf(addr2.address)).to.equal(mintAmount);
      expect(await token.balanceOf(addr3.address)).to.equal(mintAmount);
      
      // All should be on cooldown
      expect(await token.canMint(addr1.address)).to.equal(false);
      expect(await token.canMint(addr2.address)).to.equal(false);
      expect(await token.canMint(addr3.address)).to.equal(false);
      
      // Fast forward
      await time.increase(await token.MINT_COOLDOWN());
      
      // All should be able to mint again
      expect(await token.canMint(addr1.address)).to.equal(true);
      expect(await token.canMint(addr2.address)).to.equal(true);
      expect(await token.canMint(addr3.address)).to.equal(true);
    });

    it("Should handle max supply edge case with multiple minters", async function () {
      const [owner, addr1, addr2, addr3] = await ethers.getSigners();
      
      // Deploy with supply near max
      const MyToken = await ethers.getContractFactory("MyToken");
      const maxSupply = ethers.parseEther("1000000000");
      const nearMaxSupply = maxSupply - ethers.parseEther("10000");
      const token = await MyToken.deploy("MyToken", "MTK", nearMaxSupply);
      
      const remaining = await token.remainingSupply();
      expect(remaining).to.equal(ethers.parseEther("10000"));
      
      // Multiple users try to mint the remaining supply
      const fee = await token.mintingFee();
      
      // First user mints most of it
      await token.connect(addr1).mintWithFee(addr1.address, ethers.parseEther("7000"), { value: fee });
      
      // Second user mints some
      await token.connect(addr2).mintWithFee(addr2.address, ethers.parseEther("2000"), { value: fee });
      
      // Third user tries to mint too much
      await expect(
        token.connect(addr3).mintWithFee(addr3.address, ethers.parseEther("2000"), { value: fee })
      ).to.be.revertedWithCustomError(token, "MaxSupplyExceeded");
      
      // But can mint the remaining amount
      await token.connect(addr3).mintWithFee(addr3.address, ethers.parseEther("1000"), { value: fee });
      
      // Now at max supply
      expect(await token.remainingSupply()).to.equal(0);
      expect(await token.totalSupply()).to.equal(maxSupply);
      
      // No more minting possible
      await time.increase(await token.MINT_COOLDOWN());
      await expect(
        token.connect(addr1).mintWithFee(addr1.address, ethers.parseEther("1"), { value: fee })
      ).to.be.revertedWithCustomError(token, "MaxSupplyExceeded");
    });
  });

  describe("Gas Optimization Scenarios", function () {
    it("Should measure gas for common operations", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);
      
      // Measure transfer gas
      const transferTx = await token.transfer(addr1.address, ethers.parseEther("1000"));
      const transferReceipt = await transferTx.wait();
      console.log(`Transfer gas used: ${transferReceipt.gasUsed}`);
      
      // Measure approval gas
      const approveTx = await token.approve(addr2.address, ethers.parseEther("5000"));
      const approveReceipt = await approveTx.wait();
      console.log(`Approve gas used: ${approveReceipt.gasUsed}`);
      
      // Measure transferFrom gas
      const transferFromTx = await token.connect(addr2).transferFrom(
        owner.address,
        addr1.address,
        ethers.parseEther("1000")
      );
      const transferFromReceipt = await transferFromTx.wait();
      console.log(`TransferFrom gas used: ${transferFromReceipt.gasUsed}`);
      
      // Measure mint gas
      const mintTx = await token.mint(addr1.address, ethers.parseEther("1000"));
      const mintReceipt = await mintTx.wait();
      console.log(`Mint gas used: ${mintReceipt.gasUsed}`);
      
      // Measure burn gas
      const burnTx = await token.connect(addr1).burn(ethers.parseEther("500"));
      const burnReceipt = await burnTx.wait();
      console.log(`Burn gas used: ${burnReceipt.gasUsed}`);
    });
  });

  describe("Stress Testing", function () {
    it("Should handle many sequential operations", async function () {
      const { token, owner, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);
      
      // Transfer in a loop
      for (let i = 0; i < 10; i++) {
        await token.transfer(addr1.address, ethers.parseEther("1000"));
      }
      
      expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("10000"));
      
      // Multiple approvals
      for (let i = 0; i < 5; i++) {
        await token.connect(addr1).approve(addr2.address, ethers.parseEther(String((i + 1) * 1000)));
      }
      
      expect(await token.allowance(addr1.address, addr2.address))
        .to.equal(ethers.parseEther("5000"));
    });

    it("Should handle token circulation among many users", async function () {
      const { token, owner, addr1, addr2, addr3, addr4, addr5 } = await loadFixture(deployTokenFixture);
      
      const addresses = [addr1, addr2, addr3, addr4, addr5];
      const amount = ethers.parseEther("10000");
      
      // Distribute to all
      for (const addr of addresses) {
        await token.transfer(addr.address, amount);
      }
      
      // Create circular transfers
      for (let i = 0; i < addresses.length; i++) {
        const from = addresses[i];
        const to = addresses[(i + 1) % addresses.length];
        await token.connect(from).transfer(to.address, ethers.parseEther("1000"));
      }
      
      // Verify total supply unchanged
      const initialSupply = (await loadFixture(deployTokenFixture)).initialSupply;
      expect(await token.totalSupply()).to.equal(initialSupply);
    });
  });
});
