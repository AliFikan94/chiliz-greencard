from django.urls import path

from .views import (
    JourneyListView,
    JourneyDetailView,
    ExperienceDetailView,
    SubmitAnswerView,
    NextExperienceView,
    JourneyProgressView,
)

urlpatterns = [
    path(
        "",
        JourneyListView.as_view(),
        name="journey-list",
    ),

    path(
        "<slug:slug>/",
        JourneyDetailView.as_view(),
        name="journey-detail",
    ),

    path(
        "experience/<int:id>/",
        ExperienceDetailView.as_view(),
        name="experience-detail",
    ),

    path(
        "experience/<int:experience_id>/answer/",
        SubmitAnswerView.as_view(),
        name="submit-answer",
    ),

    path(
        "experience/<int:experience_id>/next/",
        NextExperienceView.as_view(),
        name="next-experience",
    ),

    path(
        "<slug:slug>/progress/<str:session_key>/",
        JourneyProgressView.as_view(),
        name="journey-progress",
    ),
]