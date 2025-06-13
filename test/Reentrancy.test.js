const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reentrancy", function () {
  let TipNFT, tipNFT, Reenter, reenter, owner, attacker;

  beforeEach(async function () {
    [owner, attacker] = await ethers.getSigners();
    TipNFT = await ethers.getContractFactory("TipNFT");
    tipNFT = await TipNFT.deploy( // Pass initialOwner explicitly
      owner.address,
      ethers.parseEther("0.05"),
      ethers.parseEther("0.2")
    );
    await tipNFT.waitForDeployment();

    Reenter = await ethers.getContractFactory("Reenter");
    reenter = await Reenter.connect(attacker).deploy(tipNFT.target, {
      value: ethers.parseEther("0.002"),
    });
    await reenter.waitForDeployment();
  });

  it("prevents reentrancy when tipping", async function () {
    await expect(
      reenter.connect(attacker).attack({ value: ethers.parseEther("0.005") })
    ).to.be.revertedWithCustomError(tipNFT, "ReentrancyGuardReentrantCall");
  });
});
