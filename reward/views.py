import re

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from learning.models import AnswerAttempt, Experience, Journey, UserProgress

from .models import RewardVoucher
from .serializers import RewardVoucherSerializer
from .services import (
    REWARD_TYPE_MINT_ACHIEVEMENT_NFT,
    REWARD_TYPE_MINT_LEARN_TOKEN,
    ZERO_ADDRESS,
    RewardSigningError,
    sign_voucher,
)

WALLET_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")
LEARN_TOKEN_DECIMALS = 18


class BindWalletView(APIView):
    def post(self, request):
        session_key = request.data.get("session_key")
        wallet_address = request.data.get("wallet_address")

        if not session_key or not wallet_address:
            return Response(
                {"detail": "session_key and wallet_address are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not WALLET_ADDRESS_RE.match(wallet_address):
            return Response(
                {"detail": "wallet_address is not a valid EVM address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        progress, _ = UserProgress.objects.get_or_create(session_key=session_key)
        progress.wallet_address = wallet_address
        progress.save(update_fields=["wallet_address", "updated_at"])

        return Response({"wallet_address": progress.wallet_address})


class ExperienceVoucherView(APIView):
    def post(self, request, experience_id):
        session_key = request.data.get("session_key")
        if not session_key:
            return Response(
                {"detail": "session_key is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        experience = Experience.objects.filter(
            id=experience_id,
            is_published=True,
        ).first()
        if not experience:
            return Response({"detail": "Experience not found."}, status=status.HTTP_404_NOT_FOUND)

        progress = UserProgress.objects.filter(session_key=session_key).first()
        if not progress or not progress.wallet_address:
            return Response(
                {"detail": "Bind a wallet address to this session before claiming a reward."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        completed = AnswerAttempt.objects.filter(
            progress=progress,
            experience=experience,
            is_correct=True,
        ).exists()
        if not completed:
            return Response(
                {"detail": "This experience has not been completed correctly yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = RewardVoucher.objects.filter(progress=progress, experience=experience).first()
        if existing:
            return Response(RewardVoucherSerializer(existing).data)

        try:
            signed = sign_voucher(
                wallet_address=progress.wallet_address,
                reward_type=REWARD_TYPE_MINT_LEARN_TOKEN,
                token_address=ZERO_ADDRESS,
                amount=experience.xp_reward * (10**LEARN_TOKEN_DECIMALS),
                uri="",
            )
        except RewardSigningError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        voucher = RewardVoucher.objects.create(
            progress=progress,
            experience=experience,
            reward_type=RewardVoucher.RewardType.MINT_LEARN_TOKEN,
            wallet_address=signed["user"],
            token_address=signed["token"],
            amount=signed["amount"],
            uri=signed["uri"],
            nonce=signed["nonce"],
            expiry=signed["expiry"],
            signature=signed["signature"],
        )

        return Response(RewardVoucherSerializer(voucher).data, status=status.HTTP_201_CREATED)


class JourneyVoucherView(APIView):
    def post(self, request, slug):
        session_key = request.data.get("session_key")
        if not session_key:
            return Response(
                {"detail": "session_key is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        journey = Journey.objects.filter(slug=slug, is_published=True).first()
        if not journey:
            return Response({"detail": "Journey not found."}, status=status.HTTP_404_NOT_FOUND)

        progress = UserProgress.objects.filter(session_key=session_key).first()
        if not progress or not progress.wallet_address:
            return Response(
                {"detail": "Bind a wallet address to this session before claiming a reward."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        published_experience_ids = set(
            journey.experiences.filter(is_published=True).values_list("id", flat=True)
        )
        if not published_experience_ids:
            return Response({"detail": "Journey has no published experiences."}, status=status.HTTP_400_BAD_REQUEST)

        completed_ids = set(
            AnswerAttempt.objects.filter(
                progress=progress,
                experience_id__in=published_experience_ids,
                is_correct=True,
            ).values_list("experience_id", flat=True)
        )
        if completed_ids != published_experience_ids:
            return Response(
                {"detail": "Complete every experience in this journey before claiming its badge."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = RewardVoucher.objects.filter(progress=progress, journey=journey).first()
        if existing:
            return Response(RewardVoucherSerializer(existing).data)

        try:
            signed = sign_voucher(
                wallet_address=progress.wallet_address,
                reward_type=REWARD_TYPE_MINT_ACHIEVEMENT_NFT,
                token_address=ZERO_ADDRESS,
                amount=0,
                uri=f"greencard://journey/{journey.slug}",
            )
        except RewardSigningError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        voucher = RewardVoucher.objects.create(
            progress=progress,
            journey=journey,
            reward_type=RewardVoucher.RewardType.MINT_ACHIEVEMENT_NFT,
            wallet_address=signed["user"],
            token_address=signed["token"],
            amount=signed["amount"],
            uri=signed["uri"],
            nonce=signed["nonce"],
            expiry=signed["expiry"],
            signature=signed["signature"],
        )

        return Response(RewardVoucherSerializer(voucher).data, status=status.HTTP_201_CREATED)


class ProgressVouchersView(APIView):
    def get(self, request, session_key):
        progress = UserProgress.objects.filter(session_key=session_key).first()
        if not progress:
            return Response({"vouchers": []})

        vouchers = RewardVoucher.objects.filter(progress=progress)
        return Response({"vouchers": RewardVoucherSerializer(vouchers, many=True).data})
