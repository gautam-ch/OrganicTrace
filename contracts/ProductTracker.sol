// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./CertificationRegistry.sol";

/**
 * ProductTracker.sol
 * 
 * Creates a digital passport for each product batch.
 * Tracks the entire lifecycle from farm to consumer.
 * Only certified farmers can create products.
 */

contract ProductTracker {
  // Reference to the certification registry
  CertificationRegistry public certificationRegistry;

  // Counter for unique product IDs
  uint256 public productCounter;

  // Mapping of product ID to product data
  mapping(uint256 => Product) public products;

  // Mapping of farmer to their product IDs
  mapping(address => uint256[]) public farmerProducts;

  // Product data structure
  struct Product {
    uint256 productId;
    address farmer;
    address currentOwner;
    string productName;
    uint256 parentProductId; // For processed goods
    HistoryEntry[] historyLog;
    uint256 createdAt;
  }

  // History entry for tracking movements
  struct HistoryEntry {
    address actor;
    string action;
    uint256 timestamp;
    string details;
  }

  // Events
  event ProductCreated(
    uint256 indexed productId,
    address indexed farmer,
    string productName
  );
  event ProductTransferred(
    uint256 indexed productId,
    address indexed from,
    address indexed to,
    string action
  );

  // Modifiers
  modifier onlyCertified() {
    require(
      certificationRegistry.verify(msg.sender),
      "Only certified farmers can create products"
    );
    _;
  }

  modifier onlyCurrentOwner(uint256 _productId) {
    require(
      products[_productId].currentOwner == msg.sender,
      "Only current owner can transfer this product"
    );
    _;
  }

  constructor(address _certificationRegistry) {
    certificationRegistry = CertificationRegistry(_certificationRegistry);
    productCounter = 1;
  }

  /**
   * Create a new product (only certified farmers)
   */
  function createProduct(
    string memory _productName,
    uint256 _parentProductId,
    string memory _details
  ) public onlyCertified returns (uint256) {
    uint256 productId = productCounter++;

    Product storage product = products[productId];
    product.productId = productId;
    product.farmer = msg.sender;
    product.currentOwner = msg.sender;
    product.productName = _productName;
    product.parentProductId = _parentProductId;
    product.createdAt = block.timestamp;

    // Log the creation event
    product.historyLog.push(
      HistoryEntry({
        actor: msg.sender,
        action: "Harvested",
        timestamp: block.timestamp,
        details: _details
      })
    );

    farmerProducts[msg.sender].push(productId);

    emit ProductCreated(productId, msg.sender, _productName);
    return productId;
  }

  /**
   * Transfer product ownership
   */
  function transferProduct(
    uint256 _productId,
    address _newOwner,
    string memory _action,
    string memory _details
  ) public onlyCurrentOwner(_productId) {
    require(_newOwner != address(0), "Invalid recipient address");

    Product storage product = products[_productId];
    address previousOwner = product.currentOwner;
    product.currentOwner = _newOwner;

    // Log the transfer
    product.historyLog.push(
      HistoryEntry({
        actor: msg.sender,
        action: _action,
        timestamp: block.timestamp,
        details: _details
      })
    );

    emit ProductTransferred(_productId, previousOwner, _newOwner, _action);
  }

  /**
   * Get product details and full history
   */
  function getProduct(uint256 _productId)
    public
    view
    returns (
      uint256 productId,
      address farmer,
      address currentOwner,
      string memory productName,
      uint256 createdAt,
      HistoryEntry[] memory history
    )
  {
    Product storage product = products[_productId];
    return (
      product.productId,
      product.farmer,
      product.currentOwner,
      product.productName,
      product.createdAt,
      product.historyLog
    );
  }

  /**
   * Get product history length
   */
  function getHistoryLength(uint256 _productId) public view returns (uint256) {
    return products[_productId].historyLog.length;
  }

  /**
   * Get a single history entry
   */
  function getHistoryEntry(uint256 _productId, uint256 _index)
    public
    view
    returns (address actor, string memory action, uint256 timestamp, string memory details)
  {
    HistoryEntry storage entry = products[_productId].historyLog[_index];
    return (entry.actor, entry.action, entry.timestamp, entry.details);
  }

  /**
   * Get all products for a farmer
   */
  function getFarmerProducts(address _farmer)
    public
    view
    returns (uint256[] memory)
  {
    return farmerProducts[_farmer];
  }
}
