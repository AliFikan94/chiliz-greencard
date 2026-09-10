from django.db import models

from learning.models import Experience, Journey, UserProgress


class RewardVoucher(models.Model):
    class RewardType(models.IntegerChoices):
        MINT_LEARN_TOKEN = 0, "Mint LEARN token"
        MINT_ACHIEVEMENT_NFT = 1, "Mint achievement NFT"

    progress = models.ForeignKey(
        UserProgress,
        on_delete=models.CASCADE,
        related_name="reward_vouchers",
    )
    experience = models.ForeignKey(
        Experience,
        on_delete=models.CASCADE,
        related_name="reward_vouchers",
        null=True,
        blank=True,
    )
    journey = models.ForeignKey(
        Journey,
        on_delete=models.CASCADE,
        related_name="reward_vouchers",
        null=True,
        blank=True,
    )

    reward_type = models.PositiveSmallIntegerField(choices=RewardType.choices)
    wallet_address = models.CharField(max_length=42)
    token_address = models.CharField(max_length=42)
    amount = models.CharField(max_length=78, default="0")
    uri = models.CharField(max_length=300, blank=True)
    nonce = models.CharField(max_length=66, unique=True)
    expiry = models.PositiveBigIntegerField()
    signature = models.CharField(max_length=132)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["progress", "experience"],
                condition=models.Q(experience__isnull=False),
                name="unique_voucher_per_progress_experience",
            ),
            models.UniqueConstraint(
                fields=["progress", "journey"],
                condition=models.Q(journey__isnull=False),
                name="unique_voucher_per_progress_journey",
            ),
        ]

    def __str__(self):
        return f"{self.get_reward_type_display()} -> {self.wallet_address}"
