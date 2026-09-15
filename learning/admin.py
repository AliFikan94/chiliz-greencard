from django.contrib import admin
from .models import (
    Journey,
    Experience,
    Choice,
    UserProgress,
    JourneyAttempt,
    AnswerAttempt,
)


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = (
        "session_key",
        "wallet_address",
        "xp",
        "completed_experiences",
        "updated_at",
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(JourneyAttempt)
class JourneyAttemptAdmin(admin.ModelAdmin):
    list_display = (
        "progress",
        "journey",
        "correct_count",
        "total_questions",
        "passed",
        "started_at",
        "finished_at",
    )
    list_filter = ("passed", "journey")


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


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4


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
    inlines = [ChoiceInline]


class ExperienceInline(admin.TabularInline):
    model = Experience
    extra = 0
    fields = ("order", "title", "slug", "xp_reward", "is_published")
    prepopulated_fields = {"slug": ("title",)}
    show_change_link = True


@admin.register(Journey)
class JourneyAdmin(admin.ModelAdmin):
    list_display = ("order", "title", "is_published")
    ordering = ("order", "id")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [ExperienceInline]


@admin.register(Choice)
class ChoiceAdmin(admin.ModelAdmin):
    list_display = ("text", "experience", "is_correct", "order")
    list_filter = ("is_correct",)
    ordering = ("experience", "order")
