import { expect } from "chai"
import { ethers } from "hardhat"
import type { ProductTracker, CertificationRegistry } from "../typechain-types"

describe("ProductTracker", () => {
  let productTracker: ProductTracker
  let certRegistry: CertificationRegistry
  let admin: any, certifier: any, farmer1: any, farmer2: any, processor: any

  beforeEach(async () => {
    // Deploy CertificationRegistry
    const CertificationRegistry = await ethers.getContractFactory("CertificationRegistry")
    certRegistry = await CertificationRegistry.deploy()

    // Deploy ProductTracker
    const ProductTracker = await ethers.getContractFactory("ProductTracker")
    productTracker = await ProductTracker.deploy(await certRegistry.getAddress())
    ;[admin, certifier, farmer1, farmer2, processor] = await ethers.getSigners()

    // Setup: Add certifier and grant certification to farmer1
    await certRegistry.addCertifier(certifier.address)
    const oneYearFromNow = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
    await certRegistry.connect(certifier).grantCertification(farmer1.address, oneYearFromNow, "USDA Organic")
  })

  describe("Deployment", () => {
    it("Should set correct certification registry", async () => {
      expect(await productTracker.certificationRegistry()).to.equal(await certRegistry.getAddress())
    })

    it("Should initialize product counter to 1", async () => {
      expect(await productTracker.productCounter()).to.equal(1)
    })
  })

  describe("Product Creation", () => {
    it("Should allow certified farmer to create product", async () => {
      const tx = await productTracker.connect(farmer1).createProduct("Organic Tomatoes", 0, "Harvested fresh from farm")

      await expect(tx).to.emit(productTracker, "ProductCreated").withArgs(1, farmer1.address, "Organic Tomatoes")
    })

    it("Should reject uncertified farmer creating product", async () => {
      await expect(
        productTracker.connect(farmer2).createProduct("Organic Carrots", 0, "Farm harvested"),
      ).to.be.revertedWith("Only certified farmers can create products")
    })

    it("Should track product correctly", async () => {
      await productTracker.connect(farmer1).createProduct("Organic Tomatoes", 0, "Harvested fresh from farm")

      const product = await productTracker.getProduct(1)
      expect(product.farmer).to.equal(farmer1.address)
      expect(product.currentOwner).to.equal(farmer1.address)
      expect(product.productName).to.equal("Organic Tomatoes")
      expect(product.productId).to.equal(1)
    })

    it("Should increment product counter", async () => {
      await productTracker.connect(farmer1).createProduct("Organic Tomatoes", 0, "Harvested fresh from farm")

      expect(await productTracker.productCounter()).to.equal(2)

      await productTracker.connect(farmer1).createProduct("Organic Lettuce", 0, "Harvested fresh from farm")

      expect(await productTracker.productCounter()).to.equal(3)
    })

    it("Should not log history automatically", async () => {
      await productTracker.connect(farmer1).createProduct("Organic Tomatoes", 0, "Harvested fresh from farm")

      const historyLength = await productTracker.getHistoryLength(1)
      expect(historyLength).to.equal(0)
    })
  })

  describe("History Events", () => {
    beforeEach(async () => {
      await productTracker.connect(farmer1).createProduct("Organic Tomatoes", 0, "Harvested fresh from farm")
    })

    it("Should allow current owner to add custom events", async () => {
      const tx = await productTracker
        .connect(farmer1)
        .addHistoryEvent(1, "Seeding", "Added seeds to soil", "QmSeedHash")

      await expect(tx)
        .to.emit(productTracker, "HistoryEventAdded")
        .withArgs(1, farmer1.address, "Seeding", "Added seeds to soil", "QmSeedHash")

      const entry = await productTracker.getHistoryEntry(1, 0)
      expect(entry.actor).to.equal(farmer1.address)
      expect(entry.action).to.equal("Seeding")
      expect(entry.details).to.equal("Added seeds to soil")
      expect(entry.ipfsImageHash).to.equal("QmSeedHash")
    })

    it("Should reject non-owners from adding events", async () => {
      await expect(
        productTracker.connect(farmer2).addHistoryEvent(1, "Watering", "Irrigation", "QmWaterHash"),
      ).to.be.revertedWith("Only current owner can add history")
    })
  })

  describe("Product Transfer", () => {
    beforeEach(async () => {
      await productTracker.connect(farmer1).createProduct("Organic Tomatoes", 0, "Harvested fresh from farm")
    })

    it("Should allow owner to transfer product", async () => {
      const tx = await productTracker
        .connect(farmer1)
        .transferProduct(1, processor.address, "Transferred to processor", "Processing")

      await expect(tx)
        .to.emit(productTracker, "ProductTransferred")
        .withArgs(1, farmer1.address, processor.address, "Transferred to processor")
    })

    it("Should not allow non-owner to transfer product", async () => {
      await expect(
        productTracker.connect(farmer2).transferProduct(1, processor.address, "Transferred", "Processing"),
      ).to.be.revertedWith("Only current owner can transfer this product")
    })

    it("Should update current owner after transfer", async () => {
      await productTracker
        .connect(farmer1)
        .transferProduct(1, processor.address, "Transferred to processor", "Processing")

      const product = await productTracker.getProduct(1)
      expect(product.currentOwner).to.equal(processor.address)
    })

    it("Should log transfer in history", async () => {
      await productTracker
        .connect(farmer1)
        .transferProduct(1, processor.address, "Transferred to processor", "Processing")

      const historyLength = await productTracker.getHistoryLength(1)
      expect(historyLength).to.equal(1)

      const historyEntry = await productTracker.getHistoryEntry(1, 0)
      expect(historyEntry.actor).to.equal(farmer1.address)
      expect(historyEntry.action).to.equal("Transferred to processor")
      expect(historyEntry.details).to.equal("Processing")
      expect(historyEntry.ipfsImageHash).to.equal("")
    })

    it("Should not allow transfer to zero address", async () => {
      await expect(
        productTracker.connect(farmer1).transferProduct(1, ethers.ZeroAddress, "Transferred", "Processing"),
      ).to.be.revertedWith("Invalid recipient address")
    })
  })

  describe("Product Retrieval", () => {
    beforeEach(async () => {
      await productTracker.connect(farmer1).createProduct("Organic Tomatoes", 0, "Harvested fresh from farm")
      await productTracker
        .connect(farmer1)
        .addHistoryEvent(1, "Harvested", "Harvested fresh from farm", "QmHarvestHash")

      await productTracker.connect(farmer1).transferProduct(1, processor.address, "Transferred", "Processing")
    })

    it("Should retrieve full product history", async () => {
      const product = await productTracker.getProduct(1)
      expect(product.history.length).to.equal(2)
      expect(product.history[0].action).to.equal("Harvested")
      expect(product.history[1].action).to.equal("Transferred")
      expect(product.history[0].ipfsImageHash).to.equal("QmHarvestHash")
    })

    it("Should retrieve farmer products", async () => {
      const products = await productTracker.getFarmerProducts(farmer1.address)
      expect(products.length).to.equal(1)
      expect(products[0]).to.equal(1)
    })

    it("Should handle history entry retrieval", async () => {
      const entry = await productTracker.getHistoryEntry(1, 0)
      expect(entry.action).to.equal("Harvested")
      expect(entry.actor).to.equal(farmer1.address)
      expect(entry.ipfsImageHash).to.equal("QmHarvestHash")
    })
  })
})
