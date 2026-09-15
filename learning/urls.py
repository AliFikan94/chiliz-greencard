from django.urls import path

from .views import (
    JourneyListView,
    StartJourneyView,
    SubmitAnswerView,
)

urlpatterns = [
    path(
        "",
        JourneyListView.as_view(),
        name="journey-list",
    ),

    path(
        "<slug:slug>/start/",
        StartJourneyView.as_view(),
        name="journey-start",
    ),

    path(
        "experience/<int:experience_id>/answer/",
        SubmitAnswerView.as_view(),
        name="submit-answer",
    ),
]
