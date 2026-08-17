from rest_framework import serializers
from .models import Journey, Experience, Choice


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ("id", "text", "order")


class ExperienceSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Experience
        fields = (
            "id",
            "title",
            "slug",
            "order",
            "hook",
            "story",
            "question",
            "reveal",
            "xp_reward",
            "choices",
        )


class JourneySerializer(serializers.ModelSerializer):
    experiences = ExperienceSerializer(many=True, read_only=True)

    class Meta:
        model = Journey
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "cover_image",
            "experiences",
        )