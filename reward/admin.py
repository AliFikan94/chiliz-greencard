from django.contrib import admin

from .models import RewardVoucher


@admin.register(RewardVoucher)
class RewardVoucherAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "wallet_address",
        "reward_type",
        "amount",
        "created_at",
    )
    list_filter = ("reward_type",)
    search_fields = ("wallet_address", "nonce")
