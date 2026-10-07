//! Rivaly rooms: each room's stakes held by this program, not by a wallet.
//! Plan, guarantees and limits: docs/plans/onchain-escrow.md.
//!
//! - A room's USDC sits in a vault only this program can move.
//! - Money leaves a vault only to the people who staked in that room
//!   (winnings or refunds) and, once everyone is paid, the room's fees to
//!   Rivaly's treasury.
//! - The split is computed here with planSettlement's arithmetic
//!   (src/lib/settlement/payouts.ts): winners share the pool pro rata minus
//!   the room's fees, which are a cut of the winners' profit only.
//! - Unresolved past its expiry, anyone can void a room: full refunds.
//! - Rivaly's operator key still says who won (yes / no / void).
//!
//! Amounts are whole cents (1 cent = 10_000 USDC base units), as the app
//! stores them, so on-chain and off-chain splits agree to the cent.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, TransferChecked};

declare_id!("FwPoC3NgmMVwoHk7QUGGotmx7dbsSNF5E6N7enxx7kLF");

pub const UNITS_PER_CENT: u64 = 10_000;
pub const USDC_DECIMALS: u8 = 6;
pub const MIN_STAKE_CENTS: u64 = 100;
pub const MAX_STAKE_CENTS: u64 = 100_000_000; // $1m: a sanity cap, not a product limit
pub const MAX_FEE_BPS: u16 = 2_500;

pub const OUTCOME_OPEN: u8 = 0;
pub const OUTCOME_YES: u8 = 1;
pub const OUTCOME_NO: u8 = 2;
pub const OUTCOME_VOID: u8 = 3;

pub const SIDE_YES: u8 = 1;
pub const SIDE_NO: u8 = 2;

#[program]
pub mod rivaly_rooms {
    use super::*;

    /// One-time setup, only by the program's upgrade authority.
    pub fn initialize(ctx: Context<Initialize>, operator: Pubkey, treasury: Pubkey) -> Result<()> {
        require!(ctx.accounts.mint.decimals == USDC_DECIMALS, RoomError::WrongMint);
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.operator = operator;
        config.treasury = treasury;
        config.mint = ctx.accounts.mint.key();
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Key rotation: a new operator or treasury. Admin only.
    pub fn update_config(ctx: Context<UpdateConfig>, operator: Pubkey, treasury: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.operator = operator;
        config.treasury = treasury;
        Ok(())
    }

    /// A stake: the user's USDC into the room's vault. The operator co-signs
    /// and pays the fees and rent (staking is free for the user); the server
    /// has already checked the room, side and limits. The first stake opens
    /// the room with its frozen rules.
    pub fn stake(ctx: Context<Stake>, args: StakeArgs) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let room_key = ctx.accounts.room.key();
        let room = &mut ctx.accounts.room;

        if room.created_at == 0 {
            require!(args.fee_bps <= MAX_FEE_BPS && args.host_fee_bps <= MAX_FEE_BPS, RoomError::FeeTooHigh);
            require!(now < args.lock_ts && args.lock_ts < args.expiry_ts, RoomError::BadTimes);
            room.room_id = args.room_id;
            room.host = args.host;
            room.fee_bps = args.fee_bps;
            room.host_fee_bps = args.host_fee_bps;
            room.lock_ts = args.lock_ts;
            room.expiry_ts = args.expiry_ts;
            room.rent_payer = ctx.accounts.operator.key();
            room.created_at = now;
            room.bump = ctx.bumps.room;
            room.vault_bump = ctx.bumps.vault;
        }

        require!(room.outcome == OUTCOME_OPEN, RoomError::RoomClosed);
        require!(now < room.lock_ts, RoomError::StakesClosed);
        require!(args.side == SIDE_YES || args.side == SIDE_NO, RoomError::BadSide);
        require!(
            args.amount_cents >= MIN_STAKE_CENTS && args.amount_cents <= MAX_STAKE_CENTS,
            RoomError::BadAmount
        );

        if args.side == SIDE_YES {
            room.yes_cents = room.yes_cents.checked_add(args.amount_cents).ok_or(RoomError::Overflow)?;
        } else {
            room.no_cents = room.no_cents.checked_add(args.amount_cents).ok_or(RoomError::Overflow)?;
        }
        room.positions = room.positions.checked_add(1).ok_or(RoomError::Overflow)?;

        let position = &mut ctx.accounts.position;
        position.room = room_key;
        position.owner = ctx.accounts.user.key();
        position.side = args.side;
        position.amount_cents = args.amount_cents;
        position.rent_payer = ctx.accounts.operator.key();
        position.bump = ctx.bumps.position;

        let units = args.amount_cents.checked_mul(UNITS_PER_CENT).ok_or(RoomError::Overflow)?;
        token::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.user_usdc.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            units,
            USDC_DECIMALS,
        )
    }

    /// The result, from Rivaly's operator: yes, no or void. Freezes the split.
    /// With winners, `dust_position` names the winner who takes the leftover
    /// cent or two of rounding (the largest stake, as planSettlement).
    pub fn resolve(ctx: Context<Resolve>, outcome: u8) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let room_key = ctx.accounts.room.key();
        let room = &mut ctx.accounts.room;
        require!(room.outcome == OUTCOME_OPEN, RoomError::AlreadyResolved);
        require!(now < room.expiry_ts, RoomError::Expired);
        require!(
            outcome == OUTCOME_YES || outcome == OUTCOME_NO || outcome == OUTCOME_VOID,
            RoomError::BadOutcome
        );
        // A result only once stakes are closed; a void any time (a postponed match).
        require!(outcome == OUTCOME_VOID || now >= room.lock_ts, RoomError::TooEarly);

        let dust = ctx.accounts.dust_position.as_ref().map(|p| (p.room, p.side, p.owner));
        freeze_split(room, room_key, outcome, dust)
    }

    /// Past its expiry and still unresolved: anyone can void the room, so
    /// stakes can never be stuck.
    pub fn expire(ctx: Context<Expire>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let room_key = ctx.accounts.room.key();
        let room = &mut ctx.accounts.room;
        require!(room.outcome == OUTCOME_OPEN, RoomError::AlreadyResolved);
        require!(now >= room.expiry_ts, RoomError::NotExpired);
        freeze_split(room, room_key, OUTCOME_VOID, None)
    }

    /// Pays one position after the result: winnings, a refund, or nothing (a
    /// losing side). Anyone can send it; the money can only go to the
    /// position's owner. The position is closed, so it can't be paid twice.
    pub fn payout(ctx: Context<Payout>) -> Result<()> {
        let room = &ctx.accounts.room;
        require!(room.outcome != OUTCOME_OPEN, RoomError::NotResolved);
        let side = ctx.accounts.position.side;
        let owed_cents = owed(room, side, ctx.accounts.position.amount_cents)?;
        let is_winner = !room.refund_all && side_won(room.outcome, side);

        if owed_cents > 0 {
            let units = owed_cents.checked_mul(UNITS_PER_CENT).ok_or(RoomError::Overflow)?;
            let room_id = room.room_id;
            let seeds: &[&[u8]] = &[b"room", room_id.as_ref(), &[room.bump]];
            token::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    TransferChecked {
                        from: ctx.accounts.vault.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                        to: ctx.accounts.owner_usdc.to_account_info(),
                        authority: ctx.accounts.room.to_account_info(),
                    },
                    &[seeds],
                ),
                units,
                USDC_DECIMALS,
            )?;
        }

        let room = &mut ctx.accounts.room;
        room.paid = room.paid.checked_add(1).ok_or(RoomError::Overflow)?;
        if is_winner {
            room.paid_out_cents = room.paid_out_cents.checked_add(owed_cents).ok_or(RoomError::Overflow)?;
        }
        Ok(())
    }

    /// Before a result only: the operator sends one stake straight back to its
    /// owner (the stake landed but the app couldn't record it).
    pub fn refund_position(ctx: Context<RefundPosition>) -> Result<()> {
        let room = &ctx.accounts.room;
        require!(room.outcome == OUTCOME_OPEN, RoomError::AlreadyResolved);
        let cents = ctx.accounts.position.amount_cents;
        let side = ctx.accounts.position.side;

        let units = cents.checked_mul(UNITS_PER_CENT).ok_or(RoomError::Overflow)?;
        let room_id = room.room_id;
        let seeds: &[&[u8]] = &[b"room", room_id.as_ref(), &[room.bump]];
        token::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.vault.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.owner_usdc.to_account_info(),
                    authority: ctx.accounts.room.to_account_info(),
                },
                &[seeds],
            ),
            units,
            USDC_DECIMALS,
        )?;

        let room = &mut ctx.accounts.room;
        if side == SIDE_YES {
            room.yes_cents = room.yes_cents.checked_sub(cents).ok_or(RoomError::Overflow)?;
        } else {
            room.no_cents = room.no_cents.checked_sub(cents).ok_or(RoomError::Overflow)?;
        }
        room.positions = room.positions.checked_sub(1).ok_or(RoomError::Overflow)?;
        Ok(())
    }

    /// After every position is paid: the room's fees to the treasury, the
    /// rounding leftover to the winner named at resolve, then the vault and
    /// the room are closed and their rent returned to whoever paid it.
    pub fn close_room(ctx: Context<CloseRoom>) -> Result<()> {
        let room = &ctx.accounts.room;
        require!(room.outcome != OUTCOME_OPEN, RoomError::NotResolved);
        require!(room.paid == room.positions, RoomError::NotAllPaid);

        let room_id = room.room_id;
        let bump = room.bump;
        let dust_owner = room.dust_owner;
        let seeds: &[&[u8]] = &[b"room", room_id.as_ref(), &[bump]];
        let fees_cents = room.rivaly_fee_cents.checked_add(room.host_fee_cents).ok_or(RoomError::Overflow)?;
        let fee_units = fees_cents.checked_mul(UNITS_PER_CENT).ok_or(RoomError::Overflow)?;
        let held = ctx.accounts.vault.amount;
        require!(held >= fee_units, RoomError::VaultShort);

        if fee_units > 0 {
            token::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    TransferChecked {
                        from: ctx.accounts.vault.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                        to: ctx.accounts.treasury_usdc.to_account_info(),
                        authority: ctx.accounts.room.to_account_info(),
                    },
                    &[seeds],
                ),
                fee_units,
                USDC_DECIMALS,
            )?;
        }

        // What's left is the rounding leftover (plus anything sent to the
        // vault by mistake): to the named winner; with no winners (a refunded
        // room), to the treasury so the vault can close.
        let rest = held - fee_units;
        if rest > 0 {
            let to = if dust_owner != Pubkey::default() {
                ctx.accounts
                    .dust_owner_usdc
                    .as_ref()
                    .ok_or(RoomError::DustAccountRequired)?
                    .to_account_info()
            } else {
                ctx.accounts.treasury_usdc.to_account_info()
            };
            token::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.key(),
                    TransferChecked {
                        from: ctx.accounts.vault.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                        to,
                        authority: ctx.accounts.room.to_account_info(),
                    },
                    &[seeds],
                ),
                rest,
                USDC_DECIMALS,
            )?;
        }

        token::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            CloseAccount {
                account: ctx.accounts.vault.to_account_info(),
                destination: ctx.accounts.rent_payer.to_account_info(),
                authority: ctx.accounts.room.to_account_info(),
            },
            &[seeds],
        ))
    }
}

/// Fixes the room's result and its split, once.
fn freeze_split(room: &mut Room, room_key: Pubkey, outcome: u8, dust: Option<(Pubkey, u8, Pubkey)>) -> Result<()> {
    let pool = room.yes_cents.checked_add(room.no_cents).ok_or(RoomError::Overflow)?;
    let winning = match outcome {
        OUTCOME_YES => room.yes_cents,
        OUTCOME_NO => room.no_cents,
        _ => 0,
    };
    room.outcome = outcome;

    if winning == 0 {
        // Void, or nobody backed the winning side: every stake goes back, no fee.
        room.refund_all = true;
        room.distributable_cents = pool;
        room.rivaly_fee_cents = 0;
        room.host_fee_cents = 0;
        room.dust_owner = Pubkey::default();
        return Ok(());
    }

    let profit = pool - winning;
    let rivaly = (profit as u128 * room.fee_bps as u128 / 10_000) as u64;
    let host = (profit as u128 * room.host_fee_bps as u128 / 10_000) as u64;
    room.refund_all = false;
    room.rivaly_fee_cents = rivaly;
    room.host_fee_cents = host;
    room.distributable_cents = pool - rivaly - host;

    let (dust_room, dust_side, dust_owner) = dust.ok_or(RoomError::DustPositionRequired)?;
    require_keys_eq!(dust_room, room_key, RoomError::WrongRoom);
    require!(side_won(outcome, dust_side), RoomError::DustNotWinner);
    room.dust_owner = dust_owner;
    Ok(())
}

fn side_won(outcome: u8, side: u8) -> bool {
    (outcome == OUTCOME_YES && side == SIDE_YES) || (outcome == OUTCOME_NO && side == SIDE_NO)
}

/// What one position is paid, in cents (floored; the leftover goes to the dust winner at close).
fn owed(room: &Room, side: u8, amount_cents: u64) -> Result<u64> {
    if room.refund_all {
        return Ok(amount_cents);
    }
    if !side_won(room.outcome, side) {
        return Ok(0);
    }
    let winning = if room.outcome == OUTCOME_YES { room.yes_cents } else { room.no_cents };
    Ok((amount_cents as u128 * room.distributable_cents as u128 / winning as u128) as u64)
}

// ── State ──────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub operator: Pubkey,
    pub treasury: Pubkey,
    pub mint: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Room {
    pub room_id: [u8; 16],
    pub host: Pubkey,
    pub fee_bps: u16,
    pub host_fee_bps: u16,
    pub lock_ts: i64,
    pub expiry_ts: i64,
    pub created_at: i64,
    pub yes_cents: u64,
    pub no_cents: u64,
    pub positions: u32,
    pub paid: u32,
    pub outcome: u8,
    pub refund_all: bool,
    pub rivaly_fee_cents: u64,
    pub host_fee_cents: u64,
    pub distributable_cents: u64,
    pub paid_out_cents: u64,
    pub dust_owner: Pubkey,
    pub rent_payer: Pubkey,
    pub bump: u8,
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub room: Pubkey,
    pub owner: Pubkey,
    pub side: u8,
    pub amount_cents: u64,
    pub rent_payer: Pubkey,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StakeArgs {
    pub room_id: [u8; 16],
    pub side: u8,
    pub amount_cents: u64,
    pub host: Pubkey,
    pub fee_bps: u16,
    pub host_fee_bps: u16,
    pub lock_ts: i64,
    pub expiry_ts: i64,
}

// ── Accounts ───────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + Config::INIT_SPACE, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    pub mint: Account<'info, Mint>,
    #[account(constraint = program.programdata_address()? == Some(program_data.key()) @ RoomError::Unauthorized)]
    pub program: Program<'info, crate::program::RivalyRooms>,
    #[account(constraint = program_data.upgrade_authority_address == Some(admin.key()) @ RoomError::Unauthorized)]
    pub program_data: Account<'info, ProgramData>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub admin: Signer<'info>,
    #[account(mut, seeds = [b"config"], bump = config.bump, has_one = admin @ RoomError::Unauthorized)]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
#[instruction(args: StakeArgs)]
pub struct Stake<'info> {
    pub user: Signer<'info>,
    #[account(mut, address = config.operator @ RoomError::Unauthorized)]
    pub operator: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(address = config.mint @ RoomError::WrongMint)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(
        init_if_needed,
        payer = operator,
        space = 8 + Room::INIT_SPACE,
        seeds = [b"room", args.room_id.as_ref()],
        bump
    )]
    pub room: Box<Account<'info, Room>>,
    #[account(
        init_if_needed,
        payer = operator,
        seeds = [b"vault", room.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = room
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        init,
        payer = operator,
        space = 8 + Position::INIT_SPACE,
        seeds = [b"position", room.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Box<Account<'info, Position>>,
    #[account(mut, token::mint = mint, token::authority = user)]
    pub user_usdc: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Resolve<'info> {
    #[account(address = config.operator @ RoomError::Unauthorized)]
    pub operator: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"room", room.room_id.as_ref()], bump = room.bump)]
    pub room: Account<'info, Room>,
    /// The winner who takes the rounding leftover; checked in freeze_split.
    pub dust_position: Option<Account<'info, Position>>,
}

#[derive(Accounts)]
pub struct Expire<'info> {
    #[account(mut, seeds = [b"room", room.room_id.as_ref()], bump = room.bump)]
    pub room: Account<'info, Room>,
}

#[derive(Accounts)]
pub struct Payout<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(address = config.mint @ RoomError::WrongMint)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds = [b"room", room.room_id.as_ref()], bump = room.bump)]
    pub room: Box<Account<'info, Room>>,
    #[account(mut, seeds = [b"vault", room.key().as_ref()], bump = room.vault_bump)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [b"position", room.key().as_ref(), owner.key().as_ref()],
        bump = position.bump,
        has_one = room @ RoomError::WrongRoom,
        has_one = owner @ RoomError::WrongOwner,
        has_one = rent_payer @ RoomError::WrongRentPayer,
        close = rent_payer
    )]
    pub position: Box<Account<'info, Position>>,
    /// CHECK: only receives; must be the position's owner (has_one above).
    pub owner: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = owner
    )]
    pub owner_usdc: Box<Account<'info, TokenAccount>>,
    /// CHECK: receives the position's rent back; must match (has_one above).
    #[account(mut)]
    pub rent_payer: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundPosition<'info> {
    #[account(mut, address = config.operator @ RoomError::Unauthorized)]
    pub operator: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(address = config.mint @ RoomError::WrongMint)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds = [b"room", room.room_id.as_ref()], bump = room.bump)]
    pub room: Box<Account<'info, Room>>,
    #[account(mut, seeds = [b"vault", room.key().as_ref()], bump = room.vault_bump)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [b"position", room.key().as_ref(), owner.key().as_ref()],
        bump = position.bump,
        has_one = room @ RoomError::WrongRoom,
        has_one = owner @ RoomError::WrongOwner,
        has_one = rent_payer @ RoomError::WrongRentPayer,
        close = rent_payer
    )]
    pub position: Box<Account<'info, Position>>,
    /// CHECK: only receives; must be the position's owner (has_one above).
    pub owner: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = operator,
        associated_token::mint = mint,
        associated_token::authority = owner
    )]
    pub owner_usdc: Box<Account<'info, TokenAccount>>,
    /// CHECK: receives the position's rent back; must match (has_one above).
    #[account(mut)]
    pub rent_payer: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseRoom<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
    #[account(address = config.mint @ RoomError::WrongMint)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        seeds = [b"room", room.room_id.as_ref()],
        bump = room.bump,
        has_one = rent_payer @ RoomError::WrongRentPayer,
        close = rent_payer
    )]
    pub room: Box<Account<'info, Room>>,
    #[account(mut, seeds = [b"vault", room.key().as_ref()], bump = room.vault_bump)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = config.treasury)]
    pub treasury_usdc: Box<Account<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = room.dust_owner)]
    pub dust_owner_usdc: Option<Box<Account<'info, TokenAccount>>>,
    /// CHECK: receives the room's and vault's rent back; must match (has_one above).
    #[account(mut)]
    pub rent_payer: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum RoomError {
    #[msg("Not allowed")]
    Unauthorized,
    #[msg("Wrong token")]
    WrongMint,
    #[msg("Fee too high")]
    FeeTooHigh,
    #[msg("Stakes must close in the future and before the room expires")]
    BadTimes,
    #[msg("This room is closed")]
    RoomClosed,
    #[msg("Stakes are closed")]
    StakesClosed,
    #[msg("Pick yes or no")]
    BadSide,
    #[msg("Stake out of range")]
    BadAmount,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Already resolved")]
    AlreadyResolved,
    #[msg("Not resolved yet")]
    NotResolved,
    #[msg("Past the room's expiry")]
    Expired,
    #[msg("Not past the room's expiry")]
    NotExpired,
    #[msg("Outcome must be yes, no or void")]
    BadOutcome,
    #[msg("Stakes are still open")]
    TooEarly,
    #[msg("Name the winner who takes the rounding leftover")]
    DustPositionRequired,
    #[msg("That position isn't on the winning side")]
    DustNotWinner,
    #[msg("Pass the leftover winner's USDC account")]
    DustAccountRequired,
    #[msg("Position belongs to another room")]
    WrongRoom,
    #[msg("Wrong owner")]
    WrongOwner,
    #[msg("Wrong rent payer")]
    WrongRentPayer,
    #[msg("Every position must be paid first")]
    NotAllPaid,
    #[msg("The vault holds less than the fees")]
    VaultShort,
}
