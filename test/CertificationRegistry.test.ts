import { expect } from "chai"
import { ethers } from "hardhat"
import type { CertificationRegistry } from "../typechain-types"

describe("CertificationRegistry", () => {
  let certRegistry: CertificationRegistry
  let admin: any, certifier1: any, certifier2: any, farmer1: any, farmer2: any

  beforeEach(async () => {
    const CertificationRegistry = await ethers.getContractFactory("CertificationRegistry")
    certRegistry = await CertificationRegistry.deploy()
    ;[admin, certifier1, certifier2, farmer1, farmer2] = await ethers.getSigners()
  })

  describe("Deployment", () => {
    it("Should set the correct admin", async () => {
      expect(await certRegistry.admin()).to.equal(admin.address)
    })
  })

  describe("Certifier Management", () => {
    it("Should allow admin to add certifier", async () => {
      await certRegistry.addCertifier(certifier1.address)
      expect(await certRegistry.certifiers(certifier1.address)).to.be.true
    })

    it("Should emit CertifierAdded event", async () => {
      await expect(certRegistry.addCertifier(certifier1.address))
        .to.emit(certRegistry, "CertifierAdded")
        .withArgs(certifier1.address)
    })

    it("Should not allow non-admin to add certifier", async () => {
      await expect(certRegistry.connect(certifier1).addCertifier(farmer1.address)).to.be.revertedWith(
        "Only admin can call this",
      )
    })

    it("Should allow admin to remove certifier", async () => {
      await certRegistry.addCertifier(certifier1.address)
      await certRegistry.removeCertifier(certifier1.address)
      expect(await certRegistry.certifiers(certifier1.address)).to.be.false
    })

    it("Should reject invalid addresses", async () => {
      await expect(certRegistry.addCertifier(ethers.ZeroAddress)).to.be.revertedWith("Invalid address")
    })
  })

  describe("Certification Granting", () => {
    beforeEach(async () => {
      await certRegistry.addCertifier(certifier1.address)
    })

    it("Should allow certifier to grant certification", async () => {
      const oneYearFromNow = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60

      await certRegistry.connect(certifier1).grantCertification(farmer1.address, oneYearFromNow, "USDA Organic")

      const cert = await certRegistry.getCertification(farmer1.address)
      expect(cert.certified).to.be.true
      expect(cert.certificationBody).to.equal("USDA Organic")
    })

    it("Should emit CertificationGranted event", async () => {
      const oneYearFromNow = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60

      await expect(certRegistry.connect(certifier1).grantCertification(farmer1.address, oneYearFromNow, "USDA Organic"))
        .to.emit(certRegistry, "CertificationGranted")
        .withArgs(farmer1.address, certifier1.address, oneYearFromNow)
    })

    it("Should reject expired certification dates", async () => {
      const pastDate = Math.floor(Date.now() / 1000) - 1000

      await expect(
        certRegistry.connect(certifier1).grantCertification(farmer1.address, pastDate, "USDA Organic"),
      ).to.be.revertedWith("Expiry date must be in the future")
    })

    it("Should not allow non-certifier to grant certification", async () => {
      const oneYearFromNow = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60

      await expect(
        certRegistry.connect(farmer1).grantCertification(farmer2.address, oneYearFromNow, "USDA Organic"),
      ).to.be.revertedWith("Only approved certifiers can call this")
    })
  })

  describe("Certification Verification", () => {
    beforeEach(async () => {
      await certRegistry.addCertifier(certifier1.address)
    })

    it("Should verify certified farmer", async () => {
      const oneYearFromNow = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60

      await certRegistry.connect(certifier1).grantCertification(farmer1.address, oneYearFromNow, "USDA Organic")

      expect(await certRegistry.verify(farmer1.address)).to.be.true
    })

    it("Should return false for uncertified farmer", async () => {
      expect(await certRegistry.verify(farmer1.address)).to.be.false
    })

    it("Should return false for expired certification", async () => {
      // Use current block timestamp to avoid clock skew
      const latestBlock = await ethers.provider.getBlock("latest")
      const nowTs = (latestBlock && (latestBlock as any).timestamp) || Math.floor(Date.now() / 1000)
      const expiresSoon = nowTs + 10 // 10 seconds from the latest block

      await certRegistry
        .connect(certifier1)
        .grantCertification(farmer1.address, expiresSoon, "USDA Organic")

      // Fast-forward time by 12 seconds and mine a new block
      await ethers.provider.send("evm_increaseTime", [12])
      await ethers.provider.send("evm_mine", [])

      expect(await certRegistry.verify(farmer1.address)).to.be.false
    })
  })

  describe("Certification Revocation", () => {
    beforeEach(async () => {
      await certRegistry.addCertifier(certifier1.address)
      const oneYearFromNow = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60
      await certRegistry.connect(certifier1).grantCertification(farmer1.address, oneYearFromNow, "USDA Organic")
    })

    it("Should allow certifier to revoke certification", async () => {
      await certRegistry.connect(certifier1).revokeCertification(farmer1.address)
      expect(await certRegistry.verify(farmer1.address)).to.be.false
    })

    it("Should emit CertificationRevoked event", async () => {
      await expect(certRegistry.connect(certifier1).revokeCertification(farmer1.address))
        .to.emit(certRegistry, "CertificationRevoked")
        .withArgs(farmer1.address)
    })

    it("Should not revoke already revoked certification", async () => {
      await certRegistry.connect(certifier1).revokeCertification(farmer1.address)

      await expect(certRegistry.connect(certifier1).revokeCertification(farmer1.address)).to.be.revertedWith(
        "Farmer is not certified",
      )
    })
  })
})
