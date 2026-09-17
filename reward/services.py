import secrets
import time

from django.conf import settings
from eth_account import Account
from eth_account.messages import encode_typed_data

REWARD_TYPE_MINT_LEARN_TOKEN = 0
REWARD_TYPE_MINT_ACHIEVEMENT_NFT = 1

ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

# Mirrors the RewardVoucher struct + EIP712 domain in
# contracts/contracts/RewardDistributor.sol. Field names, types and order
# must stay byte-for-byte identical on both sides, or signatures produced
# here will be rejected by the contract.
_EIP712_TYPES = {
    "EIP712Domain": [
        {"name": "name", "type": "string"},
        {"name": "version", "type": "string"},
        {"name": "chainId", "type": "uint256"},
        {"name": "verifyingContract", "type": "address"},
    ],
    "RewardVoucher": [
        {"name": "user", "type": "address"},
        {"name": "rewardType", "type": "uint8"},
        {"name": "token", "type": "address"},
        {"name": "amount", "type": "uint256"},
        {"name": "uri", "type": "string"},
        {"name": "nonce", "type": "uint256"},
        {"name": "expiry", "type": "uint256"},
    ],
}


class RewardSigningError(Exception):
    pass


def _domain():
    return {
        "name": "GreencardRewardDistributor",
        "version": "1",
        "chainId": settings.CHILIZ_CHAIN_ID,
        "verifyingContract": settings.REWARD_DISTRIBUTOR_ADDRESS,
    }


def sign_voucher(*, wallet_address, reward_type, token_address=ZERO_ADDRESS, amount=0, uri=""):
    """Signs an EIP-712 RewardVoucher the given wallet can submit to
    RewardDistributor.claim(). Returns the voucher fields (JSON-safe) plus
    the signature.
    """
    if not settings.REWARD_SIGNER_PRIVATE_KEY or not settings.REWARD_DISTRIBUTOR_ADDRESS:
        raise RewardSigningError(
            "REWARD_SIGNER_PRIVATE_KEY / REWARD_DISTRIBUTOR_ADDRESS are not configured."
        )

    nonce = int.from_bytes(secrets.token_bytes(32), "big")
    expiry = int(time.time()) + settings.REWARD_VOUCHER_TTL_SECONDS

    message = {
        "user": wallet_address,
        "rewardType": reward_type,
        "token": token_address,
        "amount": amount,
        "uri": uri,
        "nonce": nonce,
        "expiry": expiry,
    }

    typed_data = {
        "types": _EIP712_TYPES,
        "domain": _domain(),
        "primaryType": "RewardVoucher",
        "message": message,
    }

    signable = encode_typed_data(full_message=typed_data)
    signed = Account.sign_message(signable, private_key=settings.REWARD_SIGNER_PRIVATE_KEY)

    return {
        "user": wallet_address,
        "rewardType": reward_type,
        "token": token_address,
        "amount": str(amount),
        "uri": uri,
        "nonce": str(nonce),
        "expiry": expiry,
        "signature": "0x" + signed.signature.hex(),
    }
