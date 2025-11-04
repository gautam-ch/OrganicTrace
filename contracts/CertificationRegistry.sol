// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * CertificationRegistry.sol
 * 
 * Verifies organic certifications for farmers.
 * Only approved certifiers can grant certifications to farmers.
 * Anyone can verify if a farmer is certified.
 */

contract CertificationRegistry {
  // Admin address that can add/remove certifiers
  address public admin;

  // Mapping of certifier addresses to their status (true = approved)
  mapping(address => bool) public certifiers;

  // Mapping of farmer addresses to their certification data
  mapping(address => Certification) public farmers;

  // Certification data structure
  struct Certification {
    bool certified;
    uint256 expiryDate;
    string certificationBody;
    uint256 grantedAt;
  }

  // Events
  event CertifierAdded(address indexed certifier);
  event CertifierRemoved(address indexed certifier);
  event CertificationGranted(address indexed farmer, address indexed certifier, uint256 expiryDate);
  event CertificationRevoked(address indexed farmer);

  // Modifiers
  modifier onlyAdmin() {
    require(msg.sender == admin, "Only admin can call this");
    _;
  }

  modifier onlyCertifier() {
    require(certifiers[msg.sender], "Only approved certifiers can call this");
    _;
  }

  constructor() {
    admin = msg.sender;
  }

  /**
   * Add a new certifier (only admin)
   */
  function addCertifier(address _certifier) public onlyAdmin {
    require(_certifier != address(0), "Invalid address");
    certifiers[_certifier] = true;
    emit CertifierAdded(_certifier);
  }

  /**
   * Remove a certifier (only admin)
   */
  function removeCertifier(address _certifier) public onlyAdmin {
    certifiers[_certifier] = false;
    emit CertifierRemoved(_certifier);
  }

  /**
   * Grant certification to a farmer (only certifier)
   */
  function grantCertification(
    address _farmer,
    uint256 _expiryDate,
    string memory _certificationBody
  ) public onlyCertifier {
    require(_farmer != address(0), "Invalid farmer address");
    require(_expiryDate > block.timestamp, "Expiry date must be in the future");

    farmers[_farmer] = Certification({
      certified: true,
      expiryDate: _expiryDate,
      certificationBody: _certificationBody,
      grantedAt: block.timestamp
    });

    emit CertificationGranted(_farmer, msg.sender, _expiryDate);
  }

  /**
   * Revoke certification from a farmer (only certifier who granted it)
   */
  function revokeCertification(address _farmer) public onlyCertifier {
    require(farmers[_farmer].certified, "Farmer is not certified");
    farmers[_farmer].certified = false;
    emit CertificationRevoked(_farmer);
  }

  /**
   * Verify if a farmer is currently certified
   * Returns true if certified and not expired
   */
  function verify(address _farmer) public view returns (bool) {
    Certification memory cert = farmers[_farmer];
    return cert.certified && cert.expiryDate > block.timestamp;
  }

  /**
   * Get certification details for a farmer
   */
  function getCertification(address _farmer)
    public
    view
    returns (bool certified, uint256 expiryDate, string memory certificationBody, uint256 grantedAt)
  {
    Certification memory cert = farmers[_farmer];
    return (cert.certified, cert.expiryDate, cert.certificationBody, cert.grantedAt);
  }
}
