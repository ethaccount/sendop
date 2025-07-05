#!/bin/bash

# Schedule the transfer
echo "Scheduling transfer..."
bun run test/scheduled-transfer/schedule.ts -n sepolia

# Read the deployed address from file
DEPLOYED_ADDRESS=$(cat test/scheduled-transfer/deployed-address.txt)
if [ -z "$DEPLOYED_ADDRESS" ]; then
    echo "Error: Could not read deployed address from deployed-address.txt"
    exit 1
fi

# Send ETH to the contract
echo "Sending 0.01 ETH to contract..."
cast send --account dev --rpc-url $sepolia $DEPLOYED_ADDRESS --value 0.01ether

# Execute the transfer
echo "Executing transfer..."
bun run test/scheduled-transfer/scheduling.ts -n sepolia -a $DEPLOYED_ADDRESS

echo "Flow completed successfully!"

echo "Balance of the account:"
echo $DEPLOYED_ADDRESS
cast balance --rpc-url $sepolia $DEPLOYED_ADDRESS
