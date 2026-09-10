from rest_framework.test import APITestCase

from .models import Choice, Experience, Journey


class JourneyProgressTests(APITestCase):
    def setUp(self):
        self.journey_a = Journey.objects.create(title="Journey A", slug="journey-a", is_published=True)
        self.journey_b = Journey.objects.create(title="Journey B", slug="journey-b", is_published=True)

        self.a1 = Experience.objects.create(
            journey=self.journey_a,
            title="A1",
            slug="a1",
            order=1,
            hook="h",
            story="s",
            question="q",
            reveal="r",
            xp_reward=10,
            is_published=True,
        )
        self.a_choice = Choice.objects.create(experience=self.a1, text="Right", order=0, is_correct=True)

        self.b1 = Experience.objects.create(
            journey=self.journey_b,
            title="B1",
            slug="b1",
            order=1,
            hook="h",
            story="s",
            question="q",
            reveal="r",
            xp_reward=20,
            is_published=True,
        )
        self.b_choice = Choice.objects.create(experience=self.b1, text="Right", order=0, is_correct=True)

        self.session_key = "session-xyz"

    def test_progress_is_scoped_per_journey(self):
        # Complete journey A only.
        self.client.post(
            f"/api/learning/experience/{self.a1.id}/answer/",
            {"choice_id": self.a_choice.id, "session_key": self.session_key},
        )

        progress_a = self.client.get(f"/api/learning/{self.journey_a.slug}/progress/{self.session_key}/")
        self.assertEqual(progress_a.status_code, 200)
        self.assertTrue(progress_a.data["journey_complete"])
        self.assertEqual(progress_a.data["xp"], 10)

        # Journey B is untouched, so it should report its own next experience,
        # not spill over from journey A.
        progress_b = self.client.get(f"/api/learning/{self.journey_b.slug}/progress/{self.session_key}/")
        self.assertEqual(progress_b.status_code, 200)
        self.assertFalse(progress_b.data["journey_complete"])
        self.assertEqual(progress_b.data["next_experience"]["id"], self.b1.id)
        # xp is a running total across journeys, shared by the session.
        self.assertEqual(progress_b.data["xp"], 10)

    def test_unknown_journey_slug_returns_404(self):
        response = self.client.get(f"/api/learning/does-not-exist/progress/{self.session_key}/")
        self.assertEqual(response.status_code, 404)
