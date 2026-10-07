#!/usr/bin/env bash
# Deploy (or upgrade) the program on devnet from WSL. Run wsl-build.sh first.
#   wsl -d Ubuntu -- bash "/mnt/c/Users/User/Desktop/rivaly the first/onchain/scripts/wsl-deploy.sh"
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
WORK="$HOME/work/rivaly-onchain"
KEYS="$HOME/.config/solana/rivaly"
RPC="${RPC:-https://api.devnet.solana.com}"

echo "deployer $(solana address): $(solana balance -u "$RPC")"
solana program deploy -u "$RPC" \
  --program-id "$KEYS/rivaly_rooms-keypair.json" \
  --upgrade-authority "$HOME/.config/solana/id.json" \
  --max-sign-attempts 50 \
  "$WORK/target/deploy/rivaly_rooms.so"
solana program show -u "$RPC" "$(solana-keygen pubkey "$KEYS/rivaly_rooms-keypair.json")"
echo "deployer after: $(solana balance -u "$RPC")"
