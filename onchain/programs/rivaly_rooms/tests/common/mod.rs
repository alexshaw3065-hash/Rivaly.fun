//! Test harness: a LiteSVM chain with the program loaded the way devnet has
//! it (upgradeable, with an upgrade authority), USDC, and helpers that build
//! each instruction exactly as the app will.
#![allow(dead_code)]

use anchor_lang::prelude::{Clock, Pubkey};
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::solana_program::program_pack::Pack;
use anchor_lang::{AccountDeserialize, InstructionData, ToAccountMetas};
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::spl_token;
use litesvm::LiteSVM;
use rivaly_rooms::{Position, Room, StakeArgs};
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;

pub const UNITS: u64 = 10_000; // per cent
pub const T0: i64 = 1_800_000_000; // "now" at the start of every test
pub const LOCK: i64 = T0 + 3_600; // stakes close (kick-off) an hour later
pub const EXPIRY: i64 = T0 + 14 * 86_400;
pub const YES: u8 = 1;
pub const NO: u8 = 2;

pub struct Env {
    pub svm: LiteSVM,
    pub program: Pubkey,
    pub admin: Keypair,
    pub operator: Keypair,
    pub treasury: Pubkey,
    pub mint: Pubkey,
}

fn loader_v3() -> Pubkey {
    anchor_lang::solana_program::bpf_loader_upgradeable::ID
}

pub fn config_pda(program: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"config"], program).0
}
pub fn room_pda(program: &Pubkey, room_id: &[u8; 16]) -> Pubkey {
    Pubkey::find_program_address(&[b"room", room_id], program).0
}
pub fn vault_pda(program: &Pubkey, room: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"vault", room.as_ref()], program).0
}
pub fn position_pda(program: &Pubkey, room: &Pubkey, owner: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"position", room.as_ref(), owner.as_ref()], program).0
}

impl Env {
    /// A fresh chain: program deployed with `admin` as upgrade authority,
    /// a 6-decimal USDC mint, and the config initialised.
    pub fn new() -> Self {
        Self::new_with(true)
    }

    pub fn new_uninitialised() -> Self {
        Self::new_with(false)
    }

    fn new_with(initialise: bool) -> Self {
        let program = rivaly_rooms::id();
        let mut svm = LiteSVM::new();
        let bytes = include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/rivaly_rooms.so"));
        svm.add_program(program, bytes).unwrap();

        let admin = Keypair::new();
        let operator = Keypair::new();
        svm.airdrop(&admin.pubkey(), 10_000_000_000).unwrap();
        svm.airdrop(&operator.pubkey(), 100_000_000_000).unwrap();

        // LiteSVM loads the program with no upgrade authority; give it one.
        let programdata = Pubkey::find_program_address(&[program.as_ref()], &loader_v3()).0;
        let mut acct = svm.get_account(&programdata).unwrap();
        acct.data[0..4].copy_from_slice(&3u32.to_le_bytes()); // ProgramData
        acct.data[12] = 1; // Some(
        acct.data[13..45].copy_from_slice(admin.pubkey().as_ref()); // upgrade authority)
        svm.set_account(programdata, acct).unwrap();

        let mint = Pubkey::new_unique();
        let mut env = Env { svm, program, admin, operator, treasury: Pubkey::default(), mint };
        env.put_mint(&mint, 6);
        env.treasury = env.operator.pubkey();
        env.set_time(T0);
        if initialise {
            let treasury = env.treasury;
            let operator = env.operator.pubkey();
            let admin = env.admin.insecure_clone();
            env.send(&[env.ix_initialize(&admin.pubkey(), operator, treasury, mint)], &admin, &[&admin]).unwrap();
            // The treasury's USDC account, so fees have somewhere to land.
            let t = env.treasury;
            env.put_token_account(&t, 0);
        }
        env
    }

    pub fn put_mint(&mut self, mint: &Pubkey, decimals: u8) {
        let state = spl_token::state::Mint {
            mint_authority: None.into(),
            supply: u64::MAX / 2,
            decimals,
            is_initialized: true,
            freeze_authority: None.into(),
        };
        let mut data = vec![0u8; spl_token::state::Mint::LEN];
        spl_token::state::Mint::pack(state, &mut data).unwrap();
        self.set_raw(mint, data, spl_token::ID);
    }

    /// The owner's USDC account (associated address), holding `cents`.
    pub fn put_token_account(&mut self, owner: &Pubkey, cents: u64) -> Pubkey {
        let mint = self.mint;
        self.put_token_account_of(owner, &mint, cents)
    }

    pub fn put_token_account_of(&mut self, owner: &Pubkey, mint: &Pubkey, cents: u64) -> Pubkey {
        let ata = get_associated_token_address(owner, mint);
        let state = spl_token::state::Account {
            mint: *mint,
            owner: *owner,
            amount: cents * UNITS,
            delegate: None.into(),
            state: spl_token::state::AccountState::Initialized,
            is_native: None.into(),
            delegated_amount: 0,
            close_authority: None.into(),
        };
        let mut data = vec![0u8; spl_token::state::Account::LEN];
        spl_token::state::Account::pack(state, &mut data).unwrap();
        self.set_raw(&ata, data, spl_token::ID);
        ata
    }

    fn set_raw(&mut self, address: &Pubkey, data: Vec<u8>, owner: Pubkey) {
        let lamports = self.svm.minimum_balance_for_rent_exemption(data.len());
        self.svm
            .set_account(
                *address,
                solana_account::Account { lamports, data, owner, executable: false, rent_epoch: 0 },
            )
            .unwrap();
    }

    pub fn set_time(&mut self, unix_timestamp: i64) {
        let mut clock: Clock = self.svm.get_sysvar();
        clock.unix_timestamp = unix_timestamp;
        self.svm.set_sysvar(&clock);
    }

    /// A user with a USDC balance (and no SOL: staking is gasless).
    pub fn user(&mut self, cents: u64) -> Keypair {
        let k = Keypair::new();
        self.put_token_account(&k.pubkey(), cents);
        k
    }

    pub fn usdc_cents(&self, owner: &Pubkey) -> u64 {
        self.units_at(&get_associated_token_address(owner, &self.mint)) / UNITS
    }

    pub fn units_at(&self, token_account: &Pubkey) -> u64 {
        match self.svm.get_account(token_account) {
            Some(a) if a.data.len() == spl_token::state::Account::LEN => {
                spl_token::state::Account::unpack(&a.data).unwrap().amount
            }
            _ => 0,
        }
    }

    pub fn exists(&self, address: &Pubkey) -> bool {
        self.svm.get_account(address).map(|a| a.lamports > 0).unwrap_or(false)
    }

    pub fn room(&self, room_id: &[u8; 16]) -> Room {
        let a = self.svm.get_account(&room_pda(&self.program, room_id)).expect("room exists");
        Room::try_deserialize(&mut a.data.as_slice()).unwrap()
    }

    pub fn position(&self, room_id: &[u8; 16], owner: &Pubkey) -> Option<Position> {
        let room = room_pda(&self.program, room_id);
        let a = self.svm.get_account(&position_pda(&self.program, &room, owner))?;
        if a.lamports == 0 {
            return None;
        }
        Position::try_deserialize(&mut a.data.as_slice()).ok()
    }

    pub fn vault_units(&self, room_id: &[u8; 16]) -> u64 {
        let room = room_pda(&self.program, room_id);
        self.units_at(&vault_pda(&self.program, &room))
    }

    /// Sends one transaction; Err carries the logs, for asserting on the error name.
    pub fn send(&mut self, ixs: &[Instruction], payer: &Keypair, signers: &[&Keypair]) -> Result<(), String> {
        self.svm.expire_blockhash();
        let blockhash = self.svm.latest_blockhash();
        let msg = Message::new_with_blockhash(ixs, Some(&payer.pubkey()), &blockhash);
        let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), signers).map_err(|e| e.to_string())?;
        self.svm.send_transaction(tx).map(|_| ()).map_err(|e| format!("{:?}\n{}", e.err, e.meta.logs.join("\n")))
    }

    // ── Instruction builders ──────────────────────────────────────────

    pub fn ix_initialize(&self, admin: &Pubkey, operator: Pubkey, treasury: Pubkey, mint: Pubkey) -> Instruction {
        let programdata = Pubkey::find_program_address(&[self.program.as_ref()], &loader_v3()).0;
        Instruction::new_with_bytes(
            self.program,
            &rivaly_rooms::instruction::Initialize { operator, treasury }.data(),
            rivaly_rooms::accounts::Initialize {
                admin: *admin,
                config: config_pda(&self.program),
                mint,
                program: self.program,
                program_data: programdata,
                system_program: anchor_lang::system_program::ID,
            }
            .to_account_metas(None),
        )
    }

    pub fn ix_update_config(&self, admin: &Pubkey, operator: Pubkey, treasury: Pubkey) -> Instruction {
        Instruction::new_with_bytes(
            self.program,
            &rivaly_rooms::instruction::UpdateConfig { operator, treasury }.data(),
            rivaly_rooms::accounts::UpdateConfig { admin: *admin, config: config_pda(&self.program) }.to_account_metas(None),
        )
    }

    pub fn stake_args(&self, room_id: [u8; 16], side: u8, amount_cents: u64) -> StakeArgs {
        StakeArgs {
            room_id,
            side,
            amount_cents,
            host: Pubkey::new_from_array([7; 32]),
            fee_bps: 300,
            host_fee_bps: 200,
            lock_ts: LOCK,
            expiry_ts: EXPIRY,
        }
    }

    pub fn ix_stake(&self, user: &Pubkey, operator: &Pubkey, args: StakeArgs) -> Instruction {
        let room = room_pda(&self.program, &args.room_id);
        self.ix_stake_with(user, operator, args, get_associated_token_address(user, &self.mint), room)
    }

    pub fn ix_stake_with(&self, user: &Pubkey, operator: &Pubkey, args: StakeArgs, user_usdc: Pubkey, room: Pubkey) -> Instruction {
        Instruction::new_with_bytes(
            self.program,
            &rivaly_rooms::instruction::Stake { args }.data(),
            rivaly_rooms::accounts::Stake {
                user: *user,
                operator: *operator,
                config: config_pda(&self.program),
                mint: self.mint,
                room,
                vault: vault_pda(&self.program, &room),
                position: position_pda(&self.program, &room, user),
                user_usdc,
                token_program: spl_token::ID,
                system_program: anchor_lang::system_program::ID,
            }
            .to_account_metas(None),
        )
    }

    /// Stakes with the default rules; panics on failure.
    pub fn stake(&mut self, room_id: [u8; 16], user: &Keypair, side: u8, cents: u64) {
        let ix = self.ix_stake(&user.pubkey(), &self.operator.pubkey(), self.stake_args(room_id, side, cents));
        let op = self.operator.insecure_clone();
        self.send(&[ix], &op, &[&op, user]).unwrap();
    }

    pub fn ix_resolve(&self, room_id: &[u8; 16], operator: &Pubkey, outcome: u8, dust_owner: Option<&Pubkey>) -> Instruction {
        let room = room_pda(&self.program, room_id);
        Instruction::new_with_bytes(
            self.program,
            &rivaly_rooms::instruction::Resolve { outcome }.data(),
            rivaly_rooms::accounts::Resolve {
                operator: *operator,
                config: config_pda(&self.program),
                room,
                dust_position: dust_owner.map(|o| position_pda(&self.program, &room, o)),
            }
            .to_account_metas(None),
        )
    }

    pub fn resolve(&mut self, room_id: &[u8; 16], outcome: u8, dust_owner: Option<&Pubkey>) -> Result<(), String> {
        let op = self.operator.insecure_clone();
        let ix = self.ix_resolve(room_id, &op.pubkey(), outcome, dust_owner);
        self.send(&[ix], &op, &[&op])
    }

    pub fn ix_expire(&self, room_id: &[u8; 16]) -> Instruction {
        Instruction::new_with_bytes(
            self.program,
            &rivaly_rooms::instruction::Expire {}.data(),
            rivaly_rooms::accounts::Expire { room: room_pda(&self.program, room_id) }.to_account_metas(None),
        )
    }

    pub fn ix_payout(&self, room_id: &[u8; 16], payer: &Pubkey, owner: &Pubkey) -> Instruction {
        let room = room_pda(&self.program, room_id);
        Instruction::new_with_bytes(
            self.program,
            &rivaly_rooms::instruction::Payout {}.data(),
            rivaly_rooms::accounts::Payout {
                payer: *payer,
                config: config_pda(&self.program),
                mint: self.mint,
                room,
                vault: vault_pda(&self.program, &room),
                position: position_pda(&self.program, &room, owner),
                owner: *owner,
                owner_usdc: get_associated_token_address(owner, &self.mint),
                rent_payer: self.operator.pubkey(),
                token_program: spl_token::ID,
                associated_token_program: anchor_spl::associated_token::ID,
                system_program: anchor_lang::system_program::ID,
            }
            .to_account_metas(None),
        )
    }

    pub fn payout(&mut self, room_id: &[u8; 16], owner: &Pubkey) -> Result<(), String> {
        let op = self.operator.insecure_clone();
        let ix = self.ix_payout(room_id, &op.pubkey(), owner);
        self.send(&[ix], &op, &[&op])
    }

    pub fn ix_refund_position(&self, room_id: &[u8; 16], operator: &Pubkey, owner: &Pubkey) -> Instruction {
        let room = room_pda(&self.program, room_id);
        Instruction::new_with_bytes(
            self.program,
            &rivaly_rooms::instruction::RefundPosition {}.data(),
            rivaly_rooms::accounts::RefundPosition {
                operator: *operator,
                config: config_pda(&self.program),
                mint: self.mint,
                room,
                vault: vault_pda(&self.program, &room),
                position: position_pda(&self.program, &room, owner),
                owner: *owner,
                owner_usdc: get_associated_token_address(owner, &self.mint),
                rent_payer: self.operator.pubkey(),
                token_program: spl_token::ID,
                associated_token_program: anchor_spl::associated_token::ID,
                system_program: anchor_lang::system_program::ID,
            }
            .to_account_metas(None),
        )
    }

    pub fn ix_close_room(&self, room_id: &[u8; 16], dust_owner: Option<&Pubkey>) -> Instruction {
        let room = room_pda(&self.program, room_id);
        Instruction::new_with_bytes(
            self.program,
            &rivaly_rooms::instruction::CloseRoom {}.data(),
            rivaly_rooms::accounts::CloseRoom {
                config: config_pda(&self.program),
                mint: self.mint,
                room,
                vault: vault_pda(&self.program, &room),
                treasury_usdc: get_associated_token_address(&self.treasury, &self.mint),
                dust_owner_usdc: dust_owner.map(|o| get_associated_token_address(o, &self.mint)),
                rent_payer: self.operator.pubkey(),
                token_program: spl_token::ID,
            }
            .to_account_metas(None),
        )
    }

    pub fn close_room(&mut self, room_id: &[u8; 16], dust_owner: Option<&Pubkey>) -> Result<(), String> {
        let op = self.operator.insecure_clone();
        let ix = self.ix_close_room(room_id, dust_owner);
        self.send(&[ix], &op, &[&op])
    }
}

pub fn room_id(n: u8) -> [u8; 16] {
    let mut id = [0u8; 16];
    id[0] = 0xAB;
    id[15] = n;
    id
}
