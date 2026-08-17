from django.contrib import admin
from .models import (
    Journey,
    Experience,
    Choice,
    UserProgress,
    AnswerAttempt,
)



@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = (
        "session_key",
        "xp",
        "completed_experiences",
        "updated_at",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(AnswerAttempt)
class AnswerAttemptAdmin(admin.ModelAdmin):
    list_display = (
        "progress",
        "experience",
        "choice",
        "is_correct",
        "xp_awarded",
        "created_at",
    )
    list_filter = ("is_correct",)
    readonly_fields = ("created_at",)


@admin.register(Journey)
class JourneyAdmin(admin.ModelAdmin):
    list_display = ("title", "is_published")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(Experience)
class ExperienceAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "journey",
        "order",
        "xp_reward",
        "is_published",
    )
    list_filter = ("journey", "is_published")
    prepopulated_fields = {"slug": ("title",)}
    ordering = ("journey", "order")


@admin.register(Choice)
class ChoiceAdmin(admin.ModelAdmin):
    list_display = ("text", "experience", "is_correct", "order")
    list_filter = ("is_correct",)
    ordering = ("experience", "order")