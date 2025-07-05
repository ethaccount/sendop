#!/bin/bash

# Contract address to check
CONTRACT_ADDRESS="0xcD1c62f36A99f306948dB76c35Bbc1A639f92ce8"

check_contract() {
    local chain_name="$1"
    local rpc_url="$2"

    echo "Checking $chain_name..."

    # Get the contract code using cast
    local code=$(cast code $CONTRACT_ADDRESS --rpc-url $rpc_url 2>/dev/null)

    # Check if the code is empty (0x) or contains bytecode
    if [ "$code" = "0x" ] || [ -z "$code" ]; then
        echo "❌ $chain_name: Contract not deployed"
        return 1
    else
        echo "✅ $chain_name: Contract deployed"
        return 0
    fi
}

echo "Checking contract deployment for: $CONTRACT_ADDRESS"
echo "=================================================="

# Check deployment status on all chains
check_contract "Sepolia" "$sepolia"
check_contract "Arbitrum Sepolia" "$arbitrumSepolia"
check_contract "Optimism Sepolia" "$optimismSepolia"
check_contract "Base Sepolia" "$baseSepolia"
check_contract "Polygon Amoy" "$polygonAmoy"

echo "=================================================="
echo "Deployment check complete"
