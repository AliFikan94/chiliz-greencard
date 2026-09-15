from rest_framework import serializers

from .models import RewardVoucher


class RewardVoucherSerializer(serializers.ModelSerializer):
    contractAddress = serializers.SerializerMethodField()
    chainId = serializers.SerializerMethodField()

    class Meta:
        model = RewardVoucher
        fields = (
            "reward_type",
            "wallet_address",
            "token_address",
            "amount",
            "uri",
            "nonce",
            "expiry",
            "signature",
            "contractAddress",
            "chainId",
        )

    def get_contractAddress(self, obj):
        from django.conf import settings

        return settings.REWARD_DISTRIBUTOR_ADDRESS

    def get_chainId(self, obj):
        from django.conf import settings

        return settings.CHILIZ_CHAIN_ID
