import re

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from learning.models import AnswerAttempt, Experience, Journey, UserProgress
from learning.views import _passed_journey_ids

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


class GreencardStatusView(APIView):
    def get(self, request, session_key):
        progress = UserProgress.objects.filter(session_key=session_key).first()

        core_journeys = list(Journey.objects.filter(is_published=True).order_by("order", "id"))
        passed_ids = _passed_journey_ids(progress)
        passed_count = sum(1 for j in core_journeys if j.id in passed_ids)

        existing_voucher = None
        if progress:
            existing_voucher = RewardVoucher.objects.filter(
                progress=progress, is_greencard=True
            ).first()

        return Response(
            {
                "courses_passed": passed_count,
                "total_courses": len(core_journeys),
                "eligible": len(core_journeys) > 0 and passed_count == len(core_journeys),
                "voucher": RewardVoucherSerializer(existing_voucher).data if existing_voucher else None,
            }
        )


class GreencardVoucherView(APIView):
    def post(self, request):
        session_key = request.data.get("session_key")
        if not session_key:
            return Response(
                {"detail": "session_key is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        progress = UserProgress.objects.filter(session_key=session_key).first()
        if not progress or not progress.wallet_address:
            return Response(
                {"detail": "Bind a wallet address to this session before claiming a reward."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        core_journeys = list(Journey.objects.filter(is_published=True))
        if not core_journeys:
            return Response({"detail": "No courses published yet."}, status=status.HTTP_400_BAD_REQUEST)

        passed_ids = _passed_journey_ids(progress)
        if not all(j.id in passed_ids for j in core_journeys):
            return Response(
                {"detail": "Pass every course with a 100% score before claiming the Greencard."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = RewardVoucher.objects.filter(progress=progress, is_greencard=True).first()
        if existing:
            return Response(RewardVoucherSerializer(existing).data)

        try:
            signed = sign_voucher(
                wallet_address=progress.wallet_address,
                reward_type=REWARD_TYPE_MINT_ACHIEVEMENT_NFT,
                token_address=ZERO_ADDRESS,
                amount=0,
                uri="chiliz-greencard",
            )
        except RewardSigningError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        voucher = RewardVoucher.objects.create(
            progress=progress,
            is_greencard=True,
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
