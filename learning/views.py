from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Journey,
    Experience,
    Choice,
    UserProgress,
    JourneyAttempt,
    AnswerAttempt,
)

from .serializers import ExperienceSerializer


def _passed_journey_ids(progress):
    if not progress:
        return set()
    return set(
        JourneyAttempt.objects.filter(progress=progress, passed=True)
        .values_list("journey_id", flat=True)
        .distinct()
    )


def _locked_journey_ids(passed_ids):
    """A course is locked the moment an earlier (lower-order) course hasn't
    been passed yet - exactly one course is ever open at a time, so the
    curriculum can't be skipped ahead.
    """
    locked = set()
    blocked = False
    for journey_id in (
        Journey.objects.filter(is_published=True)
        .order_by("order", "id")
        .values_list("id", flat=True)
    ):
        if blocked:
            locked.add(journey_id)
        if journey_id not in passed_ids:
            blocked = True
    return locked


class JourneyListView(APIView):
    def get(self, request):
        session_key = request.query_params.get("session_key")
        progress = (
            UserProgress.objects.filter(session_key=session_key).first()
            if session_key
            else None
        )
        passed_ids = _passed_journey_ids(progress)
        locked_ids = _locked_journey_ids(passed_ids)

        journeys = Journey.objects.filter(is_published=True).prefetch_related(
            "experiences"
        )

        data = [
            {
                "id": journey.id,
                "title": journey.title,
                "slug": journey.slug,
                "description": journey.description,
                "cover_image": journey.cover_image,
                "order": journey.order,
                "question_count": sum(
                    1 for e in journey.experiences.all() if e.is_published
                ),
                "passed": journey.id in passed_ids,
                "locked": journey.id in locked_ids,
            }
            for journey in journeys
        ]

        return Response(data)


class StartJourneyView(APIView):
    @transaction.atomic
    def post(self, request, slug):
        journey = Journey.objects.filter(slug=slug, is_published=True).first()
        if not journey:
            return Response(
                {"detail": "Journey not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        session_key = request.data.get("session_key")
        if not session_key:
            return Response(
                {"detail": "session_key is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        progress, _ = UserProgress.objects.get_or_create(session_key=session_key)

        passed_ids = _passed_journey_ids(progress)
        if journey.id in _locked_journey_ids(passed_ids):
            return Response(
                {"detail": "Complete the previous course first."},
                status=status.HTTP_403_FORBIDDEN,
            )

        published_experiences = list(
            journey.experiences.filter(is_published=True).order_by("order")
        )

        attempt = (
            JourneyAttempt.objects.filter(
                progress=progress,
                journey=journey,
                finished_at__isnull=True,
            )
            .order_by("-started_at")
            .first()
        )

        if not attempt:
            attempt = JourneyAttempt.objects.create(
                progress=progress,
                journey=journey,
                total_questions=len(published_experiences),
            )

        answered_ids = set(attempt.answers.values_list("experience_id", flat=True))
        next_experience = next(
            (e for e in published_experiences if e.id not in answered_ids), None
        )

        return Response(
            {
                "question_index": len(answered_ids) + (1 if next_experience else 0),
                "total_questions": attempt.total_questions,
                "run_complete": next_experience is None,
                "next_experience": (
                    ExperienceSerializer(next_experience).data
                    if next_experience
                    else None
                ),
            }
        )


class SubmitAnswerView(APIView):
    @transaction.atomic
    def post(self, request, experience_id):
        experience = Experience.objects.filter(
            id=experience_id,
            is_published=True,
        ).select_related("journey").first()

        if not experience:
            return Response(
                {"detail": "Experience not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        choice_id = request.data.get("choice_id")
        session_key = request.data.get("session_key")

        if not choice_id or not session_key:
            return Response(
                {"detail": "choice_id and session_key are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        choice = Choice.objects.filter(
            id=choice_id,
            experience=experience,
        ).first()

        if not choice:
            return Response(
                {"detail": "Invalid choice."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        progress = UserProgress.objects.filter(session_key=session_key).first()
        if not progress:
            return Response(
                {"detail": "Unknown session. Start the course first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attempt = (
            JourneyAttempt.objects.filter(
                progress=progress,
                journey=experience.journey,
                finished_at__isnull=True,
            )
            .order_by("-started_at")
            .first()
        )

        if not attempt:
            return Response(
                {"detail": "Start the course before answering."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if attempt.answers.filter(experience=experience).exists():
            return Response(
                {"detail": "This question was already answered in the current run."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_correct = choice.is_correct
        already_completed_before = AnswerAttempt.objects.filter(
            progress=progress,
            experience=experience,
            is_correct=True,
        ).exists()

        xp_awarded = 0
        if is_correct and not already_completed_before:
            xp_awarded = experience.xp_reward
            progress.xp += xp_awarded
            progress.completed_experiences += 1
            progress.save(update_fields=["xp", "completed_experiences", "updated_at"])

        AnswerAttempt.objects.create(
            progress=progress,
            journey_attempt=attempt,
            experience=experience,
            choice=choice,
            is_correct=is_correct,
            xp_awarded=xp_awarded,
        )

        if not is_correct:
            attempt.finished_at = timezone.now()
            attempt.passed = False
            attempt.save(update_fields=["finished_at", "passed"])

            return Response(
                {
                    "correct": False,
                    "reveal": experience.reveal,
                    "xp_awarded": 0,
                    "total_xp": progress.xp,
                    "run_failed": True,
                    "run_complete": True,
                    "run_passed": False,
                    "score_percent": attempt.score_percent,
                    "question_index": attempt.correct_count + 1,
                    "total_questions": attempt.total_questions,
                    "next_experience": None,
                }
            )

        attempt.correct_count += 1

        published_experiences = list(
            experience.journey.experiences.filter(is_published=True).order_by("order")
        )
        answered_ids = set(attempt.answers.values_list("experience_id", flat=True))
        next_experience = next(
            (e for e in published_experiences if e.id not in answered_ids), None
        )

        run_complete = next_experience is None
        if run_complete:
            attempt.passed = True
            attempt.finished_at = timezone.now()
            attempt.save(update_fields=["correct_count", "passed", "finished_at"])
        else:
            attempt.save(update_fields=["correct_count"])

        return Response(
            {
                "correct": True,
                "reveal": experience.reveal,
                "xp_awarded": xp_awarded,
                "total_xp": progress.xp,
                "run_failed": False,
                "run_complete": run_complete,
                "run_passed": attempt.passed if run_complete else None,
                "score_percent": attempt.score_percent,
                "question_index": len(answered_ids),
                "total_questions": attempt.total_questions,
                "next_experience": (
                    ExperienceSerializer(next_experience).data
                    if next_experience
                    else None
                ),
            }
        )
