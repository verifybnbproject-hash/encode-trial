-- Create table for asset verification records
CREATE TABLE IF NOT EXISTS asset_verifications (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'pending',
    fee_amount DECIMAL(18, 8) NOT NULL,
    token_contract VARCHAR(42) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    UNIQUE(wallet_address, asset_type)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wallet_address ON asset_verifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transaction_hash ON asset_verifications(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_verification_status ON asset_verifications(verification_status);
