from eth_account import Account
from eth_account.messages import encode_typed_data
from rest_framework.test import APITestCase
from django.test import override_settings

from learning.models import Choice, Experience, Journey

from .models import RewardVoucher
from .services import _EIP712_TYPES

SIGNER_ACCOUNT = Account.create()
DISTRIBUTOR_ADDRESS = Account.create().address
WALLET_ADDRESS = Account.create().address


def _recover_signer(voucher_data):
    typed_data = {
        "types": _EIP712_TYPES,
        "domain": {
            "name": "GreencardRewardDistributor",
            "version": "1",
            "chainId": 88882,
            "verifyingContract": DISTRIBUTOR_ADDRESS,
        },
        "primaryType": "RewardVoucher",
        "message": {
            "user": voucher_data["wallet_address"],
            "rewardType": voucher_data["reward_type"],
            "token": voucher_data["token_address"],
            "amount": int(voucher_data["amount"]),
            "uri": voucher_data["uri"],
            "nonce": int(voucher_data["nonce"]),
            "expiry": voucher_data["expiry"],
        },
    }
    signable = encode_typed_data(full_message=typed_data)
    return Account.recover_message(signable, signature=voucher_data["signature"])


@override_settings(
    REWARD_SIGNER_PRIVATE_KEY=SIGNER_ACCOUNT.key.hex(),
    REWARD_DISTRIBUTOR_ADDRESS=DISTRIBUTOR_ADDRESS,
    CHILIZ_CHAIN_ID=88882,
)
class RewardVoucherFlowTests(APITestCase):
    def setUp(self):
        self.journey = Journey.objects.create(
            title="Crypto Basics", slug="crypto-basics", order=1, is_published=True
        )
        self.exp1 = Experience.objects.create(
            journey=self.journey,
            title="What is a wallet?",
            slug="what-is-a-wallet",
            order=1,
            hook="h",
            story="s",
            question="q",
            reveal="r",
            xp_reward=10,
            is_published=True,
        )
        self.exp2 = Experience.objects.create(
            journey=self.journey,
            title="What is gas?",
            slug="what-is-gas",
            order=2,
            hook="h",
            story="s",
            question="q",
            reveal="r",
            xp_reward=15,
            is_published=True,
        )
        self.correct1 = Choice.objects.create(experience=self.exp1, text="Correct", order=0, is_correct=True)
        self.correct2 = Choice.objects.create(experience=self.exp2, text="Correct", order=0, is_correct=True)
        self.session_key = "session-abc"

    def _bind_wallet(self):
        response = self.client.post(
            "/api/reward/wallet/",
            {"session_key": self.session_key, "wallet_address": WALLET_ADDRESS},
        )
        self.assertEqual(response.status_code, 200)

    def _start(self):
        return self.client.post(
            f"/api/learning/{self.journey.slug}/start/", {"session_key": self.session_key}
        )

    def _complete(self, experience, choice):
        response = self.client.post(
            f"/api/learning/experience/{experience.id}/answer/",
            {"choice_id": choice.id, "session_key": self.session_key},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["correct"])

    def _pass_course(self):
        self._start()
        self._complete(self.exp1, self.correct1)
        self._complete(self.exp2, self.correct2)

    def test_requires_wallet_before_voucher(self):
        self._start()
        self._complete(self.exp1, self.correct1)
        response = self.client.post(
            f"/api/reward/experience/{self.exp1.id}/voucher/",
            {"session_key": self.session_key},
        )
        self.assertEqual(response.status_code, 400)

    def test_requires_completion_before_voucher(self):
        self._bind_wallet()
        response = self.client.post(
            f"/api/reward/experience/{self.exp1.id}/voucher/",
            {"session_key": self.session_key},
        )
        self.assertEqual(response.status_code, 400)

    def test_issues_valid_learn_token_voucher(self):
        self._bind_wallet()
        self._start()
        self._complete(self.exp1, self.correct1)

        response = self.client.post(
            f"/api/reward/experience/{self.exp1.id}/voucher/",
            {"session_key": self.session_key},
        )
        self.assertEqual(response.status_code, 201)
        data = response.data

        self.assertEqual(data["reward_type"], 0)
        self.assertEqual(int(data["amount"]), 10 * 10**18)
        self.assertEqual(data["contractAddress"], DISTRIBUTOR_ADDRESS)
        self.assertEqual(data["chainId"], 88882)

        recovered = _recover_signer(data)
        self.assertEqual(recovered.lower(), SIGNER_ACCOUNT.address.lower())

    def test_voucher_is_idempotent_per_experience(self):
        self._bind_wallet()
        self._start()
        self._complete(self.exp1, self.correct1)

        first = self.client.post(
            f"/api/reward/experience/{self.exp1.id}/voucher/",
            {"session_key": self.session_key},
        )
        second = self.client.post(
            f"/api/reward/experience/{self.exp1.id}/voucher/",
            {"session_key": self.session_key},
        )
        self.assertEqual(first.data["nonce"], second.data["nonce"])
        self.assertEqual(RewardVoucher.objects.count(), 1)

    def test_greencard_requires_every_course_passed(self):
        self._bind_wallet()

        status_before = self.client.get(f"/api/reward/greencard/status/{self.session_key}/")
        self.assertEqual(status_before.data, {
            "xp": 0,
            "wallet_address": WALLET_ADDRESS,
            "courses_passed": 0,
            "total_courses": 1,
            "eligible": False,
            "voucher": None,
        })

        response = self.client.post("/api/reward/greencard/voucher/", {"session_key": self.session_key})
        self.assertEqual(response.status_code, 400)

        self._pass_course()

        status_after = self.client.get(f"/api/reward/greencard/status/{self.session_key}/")
        self.assertEqual(status_after.data["courses_passed"], 1)
        self.assertTrue(status_after.data["eligible"])

        response = self.client.post("/api/reward/greencard/voucher/", {"session_key": self.session_key})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["reward_type"], 1)
        self.assertEqual(response.data["uri"], "chiliz-greencard")

        recovered = _recover_signer(response.data)
        self.assertEqual(recovered.lower(), SIGNER_ACCOUNT.address.lower())

    def test_greencard_voucher_is_idempotent(self):
        self._bind_wallet()
        self._pass_course()

        first = self.client.post("/api/reward/greencard/voucher/", {"session_key": self.session_key})
        second = self.client.post("/api/reward/greencard/voucher/", {"session_key": self.session_key})
        self.assertEqual(first.data["nonce"], second.data["nonce"])
        self.assertEqual(RewardVoucher.objects.filter(is_greencard=True).count(), 1)

    def test_progress_vouchers_listing(self):
        self._bind_wallet()
        self._start()
        self._complete(self.exp1, self.correct1)
        self.client.post(
            f"/api/reward/experience/{self.exp1.id}/voucher/",
            {"session_key": self.session_key},
        )

        response = self.client.get(f"/api/reward/progress/{self.session_key}/vouchers/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["vouchers"]), 1)
