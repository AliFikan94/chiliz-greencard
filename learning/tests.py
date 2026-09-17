from rest_framework.test import APITestCase

from .models import Choice, Experience, Journey, JourneyAttempt, UserProgress


class CoursePrerequisiteTests(APITestCase):
    def setUp(self):
        self.course1 = Journey.objects.create(
            title="Course 1", slug="course-1", order=1, is_published=True
        )
        self.course2 = Journey.objects.create(
            title="Course 2", slug="course-2", order=2, is_published=True
        )

        self.c1_q1 = self._make_experience(self.course1, order=1)
        self.c1_q2 = self._make_experience(self.course1, order=2)
        self.c2_q1 = self._make_experience(self.course2, order=1)

        self.session_key = "session-abc"

    def _make_experience(self, journey, order):
        experience = Experience.objects.create(
            journey=journey,
            title=f"Q{order}",
            slug=f"q{order}-{journey.slug}",
            order=order,
            hook="h",
            story="s",
            question="q",
            reveal="r",
            xp_reward=10,
            is_published=True,
        )
        Choice.objects.create(experience=experience, text="Right", order=0, is_correct=True)
        Choice.objects.create(experience=experience, text="Wrong", order=1, is_correct=False)
        return experience

    def _correct_choice(self, experience):
        return experience.choices.get(is_correct=True)

    def _wrong_choice(self, experience):
        return experience.choices.get(is_correct=False)

    def _start(self, journey):
        return self.client.post(
            f"/api/learning/{journey.slug}/start/", {"session_key": self.session_key}
        )

    def _answer(self, experience, choice):
        return self.client.post(
            f"/api/learning/experience/{experience.id}/answer/",
            {"choice_id": choice.id, "session_key": self.session_key},
        )

    def test_course_list_reports_lock_state(self):
        response = self.client.get("/api/learning/", {"session_key": self.session_key})
        by_slug = {j["slug"]: j for j in response.data}
        self.assertFalse(by_slug["course-1"]["locked"])
        self.assertTrue(by_slug["course-2"]["locked"])

    def test_second_course_is_locked_until_first_is_passed(self):
        response = self._start(self.course2)
        self.assertEqual(response.status_code, 403)

    def test_wrong_answer_fails_the_run_and_does_not_unlock_next_course(self):
        self._start(self.course1)
        response = self._answer(self.c1_q1, self._wrong_choice(self.c1_q1))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["run_failed"])
        self.assertFalse(response.data["run_passed"])

        locked = self.client.get("/api/learning/", {"session_key": self.session_key})
        by_slug = {j["slug"]: j for j in locked.data}
        self.assertFalse(by_slug["course-1"]["passed"])
        self.assertTrue(by_slug["course-2"]["locked"])

    def test_replaying_after_a_failure_can_still_pass_and_unlock_next_course(self):
        self._start(self.course1)
        self._answer(self.c1_q1, self._wrong_choice(self.c1_q1))

        # Restart is just calling start again.
        self._start(self.course1)
        r1 = self._answer(self.c1_q1, self._correct_choice(self.c1_q1))
        self.assertFalse(r1.data["run_complete"])
        r2 = self._answer(self.c1_q2, self._correct_choice(self.c1_q2))
        self.assertTrue(r2.data["run_complete"])
        self.assertTrue(r2.data["run_passed"])
        self.assertEqual(r2.data["score_percent"], 100)

        listing = self.client.get("/api/learning/", {"session_key": self.session_key})
        by_slug = {j["slug"]: j for j in listing.data}
        self.assertTrue(by_slug["course-1"]["passed"])
        self.assertFalse(by_slug["course-2"]["locked"])

        # Course 2 is now reachable.
        response = self._start(self.course2)
        self.assertEqual(response.status_code, 200)

    def test_answering_without_starting_is_rejected(self):
        response = self._answer(self.c1_q1, self._correct_choice(self.c1_q1))
        self.assertEqual(response.status_code, 400)


class LeaderboardTests(APITestCase):
    def setUp(self):
        self.journey = Journey.objects.create(
            title="Course 1", slug="course-1", order=1, is_published=True
        )

        self.walletless = UserProgress.objects.create(session_key="no-wallet", xp=999)

        self.low = UserProgress.objects.create(
            session_key="low", wallet_address="0x1111111111111111111111111111111111111111", xp=10
        )
        self.high = UserProgress.objects.create(
            session_key="high", wallet_address="0x2222222222222222222222222222222222222222", xp=50
        )
        JourneyAttempt.objects.create(
            progress=self.high,
            journey=self.journey,
            total_questions=2,
            correct_count=2,
            passed=True,
        )

    def test_only_wallet_holders_are_ranked_highest_xp_first(self):
        response = self.client.get("/api/learning/leaderboard/")
        self.assertEqual(response.status_code, 200)
        wallets = [entry["wallet_address"] for entry in response.data["entries"]]
        self.assertEqual(wallets, [self.high.wallet_address, self.low.wallet_address])
        self.assertEqual(response.data["entries"][0]["rank"], 1)
        self.assertEqual(response.data["entries"][0]["courses_passed"], 1)
        self.assertEqual(response.data["entries"][1]["courses_passed"], 0)

    def test_me_reflects_requesting_sessions_rank(self):
        response = self.client.get(
            "/api/learning/leaderboard/", {"session_key": "low"}
        )
        self.assertEqual(response.data["me"]["rank"], 2)
        self.assertEqual(response.data["me"]["xp"], 10)

    def test_me_is_none_without_a_wallet(self):
        response = self.client.get(
            "/api/learning/leaderboard/", {"session_key": "no-wallet"}
        )
        self.assertIsNone(response.data["me"])
