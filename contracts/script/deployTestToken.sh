#!/bin/bash

# TestToken contract address
TESTTOKEN_ADDRESS="0xef26611a6f2cb9f2f6234F4635d98a7094c801Ce"

# Function to deploy TestToken on a specific chain
deploy_on_chain() {
    local chain_name="$1"
    local rpc_url="$2"

    echo "==== Processing TestToken on $chain_name ===="

    # Check if contract is already deployed
    local contract_code=$(cast code $TESTTOKEN_ADDRESS --rpc-url $rpc_url 2>/dev/null)

    if [ "$contract_code" != "0x" ] && [ -n "$contract_code" ]; then
        echo "TestToken already deployed on $chain_name at $TESTTOKEN_ADDRESS. Skipping deployment."
    else
        echo "TestToken not found on $chain_name. Deploying..."

        # Execute the deployment
        forge script script/deployTestToken.s.sol \
            --rpc-url $rpc_url \
            --broadcast \
            --verify

        if [ $? -eq 0 ]; then
            echo "✅ TestToken deployment completed on $chain_name"
        else
            echo "❌ TestToken deployment failed on $chain_name"
        fi
    fi

    echo "==== Completed $chain_name ===="
    echo ""
}

# Check wallet balance on each chain
check_wallet_balances() {
    echo "Checking wallet balances..."
    echo "============================"

    echo "Sepolia balance: $(cast to-unit $(cast balance $dev --rpc-url $sepolia) 18) ETH"
    echo "Arbitrum Sepolia balance: $(cast to-unit $(cast balance $dev --rpc-url $arbitrumSepolia) 18) ETH"
    echo "Optimism Sepolia balance: $(cast to-unit $(cast balance $dev --rpc-url $optimismSepolia) 18) ETH"
    echo "Base Sepolia balance: $(cast to-unit $(cast balance $dev --rpc-url $baseSepolia) 18) ETH"
    echo "Polygon Amoy balance: $(cast to-unit $(cast balance $dev --rpc-url $polygonAmoy) 18) POL"

    echo "============================"
    echo "Press any key to continue with deployments..."
    read -n 1
    echo ""
}

echo "Starting TestToken deployment process..."
echo "========================================"

# Check balances first
check_wallet_balances

# Deploy on all chains
deploy_on_chain "Sepolia" "$sepolia"
deploy_on_chain "Arbitrum Sepolia" "$arbitrumSepolia"
deploy_on_chain "Optimism Sepolia" "$optimismSepolia"
deploy_on_chain "Base Sepolia" "$baseSepolia"
deploy_on_chain "Polygon Amoy" "$polygonAmoy"

echo "========================================"
echo "TestToken deployment process complete"
