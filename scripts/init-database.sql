-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('FARMER', 'PROCESSOR', 'CONSUMER')),
  full_name VARCHAR(255),
  organization VARCHAR(255),
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create certifications table
CREATE TABLE IF NOT EXISTS certifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  certification_body VARCHAR(255) NOT NULL,
  certification_number VARCHAR(255) UNIQUE,
  expiry_date DATE NOT NULL,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table (tracks blockchain product metadata)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  blockchain_product_id INTEGER NOT NULL UNIQUE,
  farmer_wallet VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  batch_number VARCHAR(255),
  qr_code_hash VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create product movements table (cache of blockchain events)
CREATE TABLE IF NOT EXISTS product_movements (
  id SERIAL PRIMARY KEY,
  blockchain_product_id INTEGER NOT NULL,
  from_address VARCHAR(255),
  to_address VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  details TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blockchain_product_id) REFERENCES products(blockchain_product_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_certifications_user ON certifications(user_id);
CREATE INDEX idx_products_blockchain_id ON products(blockchain_product_id);
CREATE INDEX idx_products_farmer ON products(farmer_wallet);
CREATE INDEX idx_movements_product ON product_movements(blockchain_product_id);
CREATE INDEX idx_movements_to_address ON product_movements(to_address);
