#!/bin/bash

# Contract addresses
EP7_ADDRESS="$ep7"
EP8_ADDRESS="$ep8"
ACCOUNT_ADDRESS="0xcD1c62f36A99f306948dB76c35Bbc1A639f92ce8"
DEPOSIT_AMOUNT="0.01ether"
MIN_BALANCE="0.01"

# Function to check balance and deposit if needed
deposit_if_needed() {
    local chain_name="$1"
    local rpc_url="$2"
    local contract_address="$3"
    local contract_name="$4"

    echo "Checking $contract_name balance on $chain_name..."

    # Check the current balance
    local balance=$(cast call --rpc-url $rpc_url $contract_address "balanceOf(address)" $ACCOUNT_ADDRESS)
    local readable_balance=$(cast to-unit $balance 18)

    echo "$contract_name balance on $chain_name: $readable_balance ETH"

    # Compare with minimum balance (use bc for floating point comparison)
    if (($(echo "$readable_balance < $MIN_BALANCE" | bc -l))); then
        echo "Balance below minimum. Depositing $DEPOSIT_AMOUNT to $contract_name on $chain_name..."

        # Execute the deposit transaction
        cast send --account dev --rpc-url $rpc_url \
            $contract_address \
            "depositTo(address account)" \
            $ACCOUNT_ADDRESS \
            --value $DEPOSIT_AMOUNT

        echo "Deposit completed for $contract_name on $chain_name"
    else
        echo "Balance sufficient for $contract_name on $chain_name. No deposit needed."
    fi

    echo ""
}

# Process each chain and contract
process_chain() {
    local chain_name="$1"
    local rpc_url="$2"

    echo "==== Processing $chain_name ===="

    # Check if contract is deployed before attempting deposits
    local ep7_code=$(cast code $EP7_ADDRESS --rpc-url $rpc_url 2>/dev/null)
    local ep8_code=$(cast code $EP8_ADDRESS --rpc-url $rpc_url 2>/dev/null)

    if [ "$ep7_code" != "0x" ] && [ -n "$ep7_code" ]; then
        deposit_if_needed "$chain_name" "$rpc_url" "$EP7_ADDRESS" "EP7"
    else
        echo "EP7 contract not deployed on $chain_name. Skipping."
    fi

    if [ "$ep8_code" != "0x" ] && [ -n "$ep8_code" ]; then
        deposit_if_needed "$chain_name" "$rpc_url" "$EP8_ADDRESS" "EP8"
    else
        echo "EP8 contract not deployed on $chain_name. Skipping."
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
    echo "Press any key to continue with deposits..."
    read -n 1
    echo ""
}

echo "Starting deposit process..."
echo "============================"

# Check balances first
check_wallet_balances

# Process all chains
process_chain "Sepolia" "$sepolia"
process_chain "Arbitrum Sepolia" "$arbitrumSepolia"
process_chain "Optimism Sepolia" "$optimismSepolia"
process_chain "Base Sepolia" "$baseSepolia"
process_chain "Polygon Amoy" "$polygonAmoy"

echo "============================"
echo "Deposit process complete"
