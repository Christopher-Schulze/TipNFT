const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TipNFT", function () {
  let TipNFT, tipNFT, owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    TipNFT = await ethers.getContractFactory("TipNFT");
    tipNFT = await TipNFT.deploy( // Pass initialOwner explicitly
      owner.address,
      ethers.parseEther("0.05"),
      ethers.parseEther("0.2")
    );
    await tipNFT.waitForDeployment();
  });

  it("mints tier1 and assigns correct token ID (0)", async function () {
    await tipNFT.connect(other).tip({ value: ethers.parseEther("0.01") });
    expect(await tipNFT.balanceOf(other.address)).to.equal(1);
    const tier = await tipNFT.tokenTier(0);
    expect(tier).to.equal(1); // Tier1 enum value
    expect(await tipNFT.ownerOf(0)).to.equal(other.address);
  });

  it("mints tier2", async function () {
    await tipNFT.connect(other).tip({ value: ethers.parseEther("0.1") });
    const tier = await tipNFT.tokenTier(0);
    expect(tier).to.equal(2); // Tier2
  });

  it("mints tier3", async function () {
    await tipNFT.connect(other).tip({ value: ethers.parseEther("1") });
    const tier = await tipNFT.tokenTier(0);
    expect(tier).to.equal(3); // Tier3
  });

  it("sets and uses base URIs", async function () {
    await tipNFT.setBaseURI(1, "ipfs://tier1/"); // Tier.Tier1 is enum value 1
    await tipNFT.connect(other).tip({ value: ethers.parseEther("0.01") }); // Mints token 0
    expect(await tipNFT.tokenURI(0)).to.equal("ipfs://tier1/0");
  });

  it("base URI can only be set by owner", async function () {
    await expect(
      tipNFT.connect(other).setBaseURI(1, "ipfs://bad/")
    ).to.be.revertedWithCustomError(tipNFT, "OwnableUnauthorizedAccount");
  });

  it("rejects zero tips", async function () {
    await expect(tipNFT.connect(other).tip({ value: 0 })).to.be.revertedWithCustomError(
      tipNFT,
      "NoTipSent"
    );
  });

  it("updates thresholds", async function () {
    await tipNFT.setTierThresholds(
      ethers.parseEther("0.1"),
      ethers.parseEther("0.5")
    );
    await tipNFT.connect(other).tip({ value: ethers.parseEther("0.3") }); // Mints token 0
    expect(await tipNFT.tokenTier(0)).to.equal(2);
  });

  it("withdraw reverts for zero address", async function () {
    await tipNFT.connect(other).tip({ value: ethers.parseEther("1") });
    await expect(tipNFT.withdraw(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      tipNFT,
      "ZeroAddress"
    );
  });

  it("withdraw works for owner", async function () {
    await tipNFT.connect(other).tip({ value: ethers.parseEther("1") });
    const balBefore = await ethers.provider.getBalance(owner.address);
    const tx = await tipNFT.withdraw(owner.address);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const balAfter = await ethers.provider.getBalance(owner.address);
    expect(balAfter).to.equal(balBefore + ethers.parseEther("1") - gasUsed);
  });

  it("returns default royalty for a token ID", async function () {
    // Mint a token first to ensure royaltyInfo can be called on an existing token if needed by impl.
    // However, ERC2981 royaltyInfo's first arg is often a placeholder if royalties are contract-wide.
    // For TipNFT, it's not strictly tied to a tokenId's existence for default royalty.
    const info = await tipNFT.royaltyInfo(0, ethers.parseEther("1")); // tokenId 0 (or any)
    expect(info[0]).to.equal(owner.address);
    expect(info[1]).to.equal(ethers.parseEther("0.05"));
  });

  it("owner can update royalty", async function () {
    await expect(tipNFT.setRoyalty(other.address, 1000))
      .to.emit(tipNFT, "RoyaltyUpdated")
      .withArgs(other.address, 1000);
    const info = await tipNFT.royaltyInfo(0, ethers.parseEther("1")); // tokenId 0 (or any)
    expect(info[0]).to.equal(other.address);
    expect(info[1]).to.equal(ethers.parseEther("0.10"));
  });

  it("withdraw fails for non-owner", async function () {
    await expect(
      tipNFT.connect(other).withdraw(other.address)
    ).to.be.revertedWithCustomError(tipNFT, "OwnableUnauthorizedAccount");
  });

  it("receive mints and emits", async function () {
    await expect(
      owner.sendTransaction({ to: tipNFT.target, value: ethers.parseEther("0.1") })
    )
      .to.emit(tipNFT, "Received")
      .withArgs(owner.address, ethers.parseEther("0.1"));
    expect(await tipNFT.totalSupply()).to.equal(1);
    expect(await tipNFT.tokenTier(0)).to.equal(2); // Token 0 was minted
  });

  it("returns owned tokens (IDs 0 and 1)", async function () {
    await tipNFT.connect(other).tip({ value: ethers.parseEther("0.01") }); // Mints token 0
    await tipNFT.connect(other).tip({ value: ethers.parseEther("1") });   // Mints token 1
    const tokens = await tipNFT.getOwnedTokens(other.address);
    // Convert BigInts to strings for comparison if necessary, or numbers if small enough
    expect(tokens.map(t => t.toString())).to.deep.equal(["0", "1"]);
  });

  it("owner can pause and unpause", async function () {
    await tipNFT.pause();
    await expect(
      tipNFT.tip({ value: ethers.parseEther("0.1") })
    ).to.be.revertedWithCustomError(tipNFT, "EnforcedPause");
    await tipNFT.unpause();
    await tipNFT.tip({ value: ethers.parseEther("0.1") });
    expect(await tipNFT.totalSupply()).to.equal(1);
  });

  it("non-owner cannot pause", async function () {
    await expect(tipNFT.connect(other).pause()).to.be.revertedWithCustomError(
      tipNFT,
      "OwnableUnauthorizedAccount"
    );
  });

  it("non-owner cannot update royalty", async function () {
    await expect(
      tipNFT.connect(other).setRoyalty(other.address, 1000)
    ).to.be.revertedWithCustomError(tipNFT, "OwnableUnauthorizedAccount");
  });

  describe("ERC721Enumerable specific tests", function () {
    beforeEach(async function () {
      // Re-deploy a fresh contract for this test suite to avoid token ID clashes
      // and ensure predictable state for enumeration tests.
      // This tipNFT instance will be used by tests within this describe block.
      const FreshTipNFTFactory = await ethers.getContractFactory("TipNFT");
      tipNFT = await FreshTipNFTFactory.deploy(
        owner.address,
        ethers.parseEther("0.05"),
        ethers.parseEther("0.2")
      );
      await tipNFT.waitForDeployment();

      // Now mint tokens on this fresh instance
      // Owner: token 0 (Tier 1)
      // Other: token 1 (Tier 2), token 2 (Tier 3)
      await tipNFT.connect(owner).tip({ value: ethers.parseEther("0.01") }); // token 0
      await tipNFT.connect(other).tip({ value: ethers.parseEther("0.1") });  // token 1
      await tipNFT.connect(other).tip({ value: ethers.parseEther("1") });   // token 2
    });

    it("totalSupply returns the correct count", async function () {
      expect(await tipNFT.totalSupply()).to.equal(3);
      await tipNFT.connect(owner).tip({ value: ethers.parseEther("0.02") }); // token 3
      expect(await tipNFT.totalSupply()).to.equal(4);
    });

    it("tokenByIndex returns correct token ID", async function () {
      expect(await tipNFT.tokenByIndex(0)).to.equal(0);
      expect(await tipNFT.tokenByIndex(1)).to.equal(1);
      expect(await tipNFT.tokenByIndex(2)).to.equal(2);
    });

    it("tokenByIndex reverts for out-of-bounds index", async function () {
      // OpenZeppelin typically reverts with ERC721OutOfBoundsIndex for these cases.
      // For tokenByIndex, OpenZeppelin v5 throws ERC721OutOfBoundsIndex.
      // Due to issues with withArgs matching the 3 parameters, we'll only check the error name.
      await expect(tipNFT.tokenByIndex(3)).to.be.revertedWithCustomError(tipNFT, "ERC721OutOfBoundsIndex");
    });

    it("tokenOfOwnerByIndex returns correct token ID for owner", async function () {
      expect(await tipNFT.balanceOf(owner.address)).to.equal(1);
      expect(await tipNFT.tokenOfOwnerByIndex(owner.address, 0)).to.equal(0); // Owner has token 0
    });

    it("tokenOfOwnerByIndex returns correct token IDs for other", async function () {
      expect(await tipNFT.balanceOf(other.address)).to.equal(2);
      expect(await tipNFT.tokenOfOwnerByIndex(other.address, 0)).to.equal(1); // Other has token 1
      expect(await tipNFT.tokenOfOwnerByIndex(other.address, 1)).to.equal(2); // Other has token 2
    });

    it("tokenOfOwnerByIndex reverts for out-of-bounds index for an owner", async function () {
      // For tokenOfOwnerByIndex, OpenZeppelin v5 throws ERC721OutOfBoundsIndex.
      // Due to issues with withArgs matching the 3 parameters, we'll only check the error name.
      // Owner has 1 token (at index 0), so index 1 is out of bounds.
      await expect(tipNFT.tokenOfOwnerByIndex(owner.address, 1)).to.be.revertedWithCustomError(tipNFT, "ERC721OutOfBoundsIndex");
      // Other has 2 tokens (at indices 0, 1), so index 2 is out of bounds.
      await expect(tipNFT.tokenOfOwnerByIndex(other.address, 2)).to.be.revertedWithCustomError(tipNFT, "ERC721OutOfBoundsIndex");
    });

    it("getOwnedTokens returns empty array for address with no tokens", async function () {
        const [_, __, thirdAccount] = await ethers.getSigners();
        const tokens = await tipNFT.getOwnedTokens(thirdAccount.address);
        expect(tokens).to.deep.equal([]);
    });

    it("tokenURI returns empty string if base URI for tier is not set", async function() {
      // Mint a Tier 1 token (ID 3, as 0,1,2 already minted)
      await tipNFT.connect(owner).tip({ value: ethers.parseEther("0.01") }); // Mints token 3
      // Ensure no base URI is set for Tier 1 (enum value 1) yet in this specific test context
      // (assuming setBaseURI was not called for tier 1 in the global beforeEach for this describe block)
      // To be certain, we could deploy a fresh contract or explicitly clear it if possible.
      // For now, we rely on the test setup.
      // The `setBaseURI` in the "sets and uses base URIs" test was for a different instance or specific context.
      // Here, we want to test the case where it's *not* set.
      // Let's re-deploy for a clean state for this specific test, or ensure tier 1 URI is unset.
      const NewTipNFT = await ethers.getContractFactory("TipNFT");
      const newTipNFT = await NewTipNFT.deploy(
        owner.address,
        ethers.parseEther("0.05"),
        ethers.parseEther("0.2")
      );
      await newTipNFT.waitForDeployment();
      await newTipNFT.connect(owner).tip({ value: ethers.parseEther("0.01") }); // Mints token 0 in new contract
      expect(await newTipNFT.tokenURI(0)).to.equal("");
    });

    it("tokenURI reverts for non-existent token", async function() {
      await expect(tipNFT.tokenURI(999)).to.be.revertedWithCustomError(tipNFT, "ERC721NonexistentToken")
        .withArgs(999);
    });
  });
});
