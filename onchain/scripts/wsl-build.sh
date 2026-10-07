#!/usr/bin/env bash
# Build (and optionally test) the program inside WSL. The repo lives on the
# Windows drive, whose path has spaces and is slow for cargo, so the source is
# mirrored into a Linux folder, built there, and the IDL copied back.
#
#   wsl -d Ubuntu -- bash "/mnt/c/Users/User/Desktop/rivaly the first/onchain/scripts/wsl-build.sh" [test]
set -euo pipefail
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"

SRC="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$HOME/work/rivaly-onchain"
KEYS="$HOME/.config/solana/rivaly"
mkdir -p "$WORK" "$KEYS"

rsync -a --delete --exclude target --exclude .anchor "$SRC/" "$WORK/"

# The program's address keypair lives outside the repo; it's only needed to
# deploy the first time (after that, the upgrade authority is what matters).
mkdir -p "$WORK/target/deploy"
[ -f "$KEYS/rivaly_rooms-keypair.json" ] || solana-keygen new --no-bip39-passphrase --silent -o "$KEYS/rivaly_rooms-keypair.json"
cp "$KEYS/rivaly_rooms-keypair.json" "$WORK/target/deploy/rivaly_rooms-keypair.json"
PROGRAM_ID="$(solana-keygen pubkey "$KEYS/rivaly_rooms-keypair.json")"

cd "$WORK"
anchor keys sync > /dev/null
anchor build 2>&1 | grep -vE "^\s*(Compiling|Downloaded|Downloading)" || true
test -f target/deploy/rivaly_rooms.so

mkdir -p "$SRC/idl"
cp target/idl/rivaly_rooms.json "$SRC/idl/rivaly_rooms.json"
# Keep the repo's declared id in step with the keypair.
sed -i "s/declare_id!(\"[^\"]*\")/declare_id!(\"$PROGRAM_ID\")/" "$SRC/programs/rivaly_rooms/src/lib.rs"
sed -i "s/^rivaly_rooms = \"[^\"]*\"/rivaly_rooms = \"$PROGRAM_ID\"/" "$SRC/Anchor.toml"
echo "PROGRAM_ID=$PROGRAM_ID"
ls -la target/deploy/rivaly_rooms.so

if [ "${1:-}" = "test" ]; then
  cargo test 2>&1 | grep -vE "^\s*(Compiling|Downloaded|Downloading)"
fi
