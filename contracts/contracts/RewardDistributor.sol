// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {LearnToken} from "./LearnToken.sol";
import {AchievementNFT} from "./AchievementNFT.sol";

/// @title RewardDistributor
/// @notice Single entry point through which Greencard lesson completions turn into
/// onchain rewards on Chiliz Chain. The backend never touches user funds: it only
/// signs an EIP-712 voucher describing a reward the caller is entitled to, and the
/// user submits that voucher themselves to claim it (paying their own gas).
/// @dev Supports four reward shapes today (LEARN token mint, achievement NFT mint,
/// native CHZ payout from a funded treasury, and arbitrary ERC20 payout e.g. a Fan
/// Token) behind one voucher schema, so new reward *assets* can be onboarded by
/// just crediting `token`/`amount`/`uri`, not by touching this contract's logic.
contract RewardDistributor is EIP712, Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum RewardType {
        MintLearnToken,
        MintAchievementNFT,
        PayoutNative,
        PayoutERC20
    }

    struct RewardVoucher {
        address user;
        RewardType rewardType;
        address token; // used only for PayoutERC20
        uint256 amount; // LEARN amount / native amount / ERC20 amount
        string uri; // used only for MintAchievementNFT
        uint256 nonce; // caller-unique per voucher, prevents accidental collisions
        uint256 expiry; // unix timestamp after which the voucher can no longer be claimed
    }

    bytes32 private constant REWARD_VOUCHER_TYPEHASH = keccak256(
        "RewardVoucher(address user,uint8 rewardType,address token,uint256 amount,string uri,uint256 nonce,uint256 expiry)"
    );

    LearnToken public learnToken;
    AchievementNFT public achievementNFT;
    address public signer;

    mapping(bytes32 => bool) public usedVouchers;

    event RewardClaimed(
        address indexed user,
        RewardType indexed rewardType,
        address token,
        uint256 amount,
        uint256 nonce,
        bytes32 voucherHash
    );
    event SignerUpdated(address indexed previousSigner, address indexed newSigner);
    event LearnTokenUpdated(address indexed previousToken, address indexed newToken);
    event AchievementNFTUpdated(address indexed previousNFT, address indexed newNFT);
    event TreasuryFunded(address indexed from, uint256 amount);
    event NativeWithdrawn(address indexed to, uint256 amount);
    event ERC20Withdrawn(address indexed token, address indexed to, uint256 amount);

    error InvalidVoucherOwner();
    error VoucherExpired();
    error VoucherAlreadyUsed();
    error InvalidSignature();
    error NativeTransferFailed();
    error ZeroAddress();

    constructor(
        address admin,
        address signer_,
        address learnToken_,
        address achievementNFT_
    ) EIP712("GreencardRewardDistributor", "1") Ownable(admin) {
        if (signer_ == address(0) || learnToken_ == address(0) || achievementNFT_ == address(0)) {
            revert ZeroAddress();
        }
        signer = signer_;
        learnToken = LearnToken(learnToken_);
        achievementNFT = AchievementNFT(achievementNFT_);
    }

    /// @notice Claims a reward voucher signed by the backend's trusted signer.
    /// @dev Only the voucher's designated `user` may submit it, so a leaked voucher
    /// cannot be front-run or redirected to a different recipient.
    function claim(RewardVoucher calldata voucher, bytes calldata signature) external nonReentrant whenNotPaused {
        if (msg.sender != voucher.user) revert InvalidVoucherOwner();
        if (block.timestamp > voucher.expiry) revert VoucherExpired();

        bytes32 digest = _hashVoucher(voucher);
        if (usedVouchers[digest]) revert VoucherAlreadyUsed();

        address recovered = ECDSA.recover(digest, signature);
        if (recovered != signer) revert InvalidSignature();

        usedVouchers[digest] = true;

        _executeReward(voucher);

        emit RewardClaimed(voucher.user, voucher.rewardType, voucher.token, voucher.amount, voucher.nonce, digest);
    }

    function hashVoucher(RewardVoucher calldata voucher) external view returns (bytes32) {
        return _hashVoucher(voucher);
    }

    function _hashVoucher(RewardVoucher calldata voucher) private view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                REWARD_VOUCHER_TYPEHASH,
                voucher.user,
                uint8(voucher.rewardType),
                voucher.token,
                voucher.amount,
                keccak256(bytes(voucher.uri)),
                voucher.nonce,
                voucher.expiry
            )
        );
        return _hashTypedDataV4(structHash);
    }

    function _executeReward(RewardVoucher calldata voucher) private {
        if (voucher.rewardType == RewardType.MintLearnToken) {
            learnToken.mint(voucher.user, voucher.amount);
        } else if (voucher.rewardType == RewardType.MintAchievementNFT) {
            achievementNFT.mint(voucher.user, voucher.uri);
        } else if (voucher.rewardType == RewardType.PayoutNative) {
            (bool ok, ) = payable(voucher.user).call{value: voucher.amount}("");
            if (!ok) revert NativeTransferFailed();
        } else {
            IERC20(voucher.token).safeTransfer(voucher.user, voucher.amount);
        }
    }

    // --- Admin ---

    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        emit SignerUpdated(signer, newSigner);
        signer = newSigner;
    }

    function setLearnToken(address newToken) external onlyOwner {
        if (newToken == address(0)) revert ZeroAddress();
        emit LearnTokenUpdated(address(learnToken), newToken);
        learnToken = LearnToken(newToken);
    }

    function setAchievementNFT(address newNFT) external onlyOwner {
        if (newNFT == address(0)) revert ZeroAddress();
        emit AchievementNFTUpdated(address(achievementNFT), newNFT);
        achievementNFT = AchievementNFT(newNFT);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Rescues native CHZ sitting in the treasury (e.g. surplus funding).
    function withdrawNative(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
        emit NativeWithdrawn(to, amount);
    }

    /// @notice Rescues ERC20 tokens (e.g. Fan Tokens) sitting in the treasury.
    function withdrawERC20(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
        emit ERC20Withdrawn(token, to, amount);
    }

    /// @notice Accepts CHZ deposits to fund PayoutNative rewards.
    receive() external payable {
        emit TreasuryFunded(msg.sender, msg.value);
    }
}
