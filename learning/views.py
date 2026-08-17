from django.db import transaction
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Journey,
    Experience,
    Choice,
    UserProgress,
    AnswerAttempt,
)

from .serializers import (
    JourneySerializer,
    ExperienceSerializer,
)


class JourneyListView(generics.ListAPIView):
    serializer_class = JourneySerializer

    def get_queryset(self):
        return Journey.objects.filter(
            is_published=True
        ).prefetch_related(
            "experiences__choices"
        )


class JourneyDetailView(generics.RetrieveAPIView):
    serializer_class = JourneySerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Journey.objects.filter(
            is_published=True
        ).prefetch_related(
            "experiences__choices"
        )


class ExperienceDetailView(generics.RetrieveAPIView):
    serializer_class = ExperienceSerializer
    lookup_field = "id"

    def get_queryset(self):
        return Experience.objects.filter(
            is_published=True
        ).prefetch_related("choices")


class SubmitAnswerView(APIView):
    @transaction.atomic
    def post(self, request, experience_id):
        experience = Experience.objects.filter(
            id=experience_id,
            is_published=True,
        ).first()

        if not experience:
            return Response(
                {"detail": "Experience not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        choice_id = request.data.get("choice_id")
        session_key = request.data.get("session_key")

        if not choice_id or not session_key:
            return Response(
                {
                    "detail": "choice_id and session_key are required."
                },
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

        progress, _ = UserProgress.objects.get_or_create(
            session_key=session_key
        )

        already_completed = AnswerAttempt.objects.filter(
            progress=progress,
            experience=experience,
            is_correct=True,
        ).exists()

        is_correct = choice.is_correct
        xp_awarded = 0

        if is_correct and not already_completed:
            xp_awarded = experience.xp_reward

            progress.xp += xp_awarded
            progress.completed_experiences += 1

            progress.save(
                update_fields=[
                    "xp",
                    "completed_experiences",
                    "updated_at",
                ]
            )

        AnswerAttempt.objects.create(
            progress=progress,
            experience=experience,
            choice=choice,
            is_correct=is_correct,
            xp_awarded=xp_awarded,
        )

        return Response({
            "correct": is_correct,
            "reveal": experience.reveal,
            "xp_awarded": xp_awarded,
            "total_xp": progress.xp,
            "completed_experiences": progress.completed_experiences,
        })


class NextExperienceView(APIView):
    def get(self, request, experience_id):
        current = Experience.objects.filter(
            id=experience_id,
            is_published=True,
        ).first()

        if not current:
            return Response(
                {"detail": "Experience not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        next_experience = (
            Experience.objects
            .filter(
                journey=current.journey,
                is_published=True,
                order__gt=current.order,
            )
            .order_by("order")
            .first()
        )

        if not next_experience:
            return Response(
                {
                    "complete": True,
                    "next": None,
                },
                status=status.HTTP_200_OK,
            )

        serializer = ExperienceSerializer(next_experience)

        return Response(
            {
                "complete": False,
                "next": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class ProgressView(APIView):
    def get(self, request, session_key):
        progress, _ = UserProgress.objects.get_or_create(
            session_key=session_key
        )

        journey = Journey.objects.filter(
            is_published=True
        ).order_by("id").first()

        next_experience = None

        if journey:
            completed_ids = AnswerAttempt.objects.filter(
                progress=progress,
                experience__journey=journey,
                is_correct=True,
            ).values_list("experience_id", flat=True)

            next_experience = (
                Experience.objects
                .filter(
                    journey=journey,
                    is_published=True,
                )
                .exclude(id__in=completed_ids)
                .order_by("order")
                .first()
            )

        if next_experience:
            serializer = ExperienceSerializer(next_experience)
            next_data = serializer.data
        else:
            next_data = None

        return Response({
            "xp": progress.xp,
            "completed_experiences": progress.completed_experiences,
            "journey_complete": next_experience is None,
            "next_experience": next_data,
        })