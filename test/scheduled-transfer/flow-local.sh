#!/bin/bash

# Schedule the transfer
echo "Scheduling transfer..."
bun run test/scheduled-transfer/schedule.ts -n local

# Read the deployed address from file
DEPLOYED_ADDRESS=$(cat test/scheduled-transfer/deployed-address.txt)
if [ -z "$DEPLOYED_ADDRESS" ]; then
    echo "Error: Could not read deployed address from deployed-address.txt"
    exit 1
fi

# Send ETH to the contract
echo "Sending 0.001 ETH to contract..."
cast send --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --rpc-url $local $DEPLOYED_ADDRESS --value 0.001ether

# Execute the transfer
echo "Executing transfer..."
bun run test/scheduled-transfer/execute.ts -n local

echo "Flow completed successfully!"
