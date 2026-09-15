from rest_framework import serializers
from .models import Experience, Choice


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ("id", "text", "order")


class ExperienceSerializer(serializers.ModelSerializer):
    """Used to preview the *next* question. Deliberately excludes `reveal`
    (the answer explanation), which is only ever sent back in the response
    to actually answering that question - never ahead of time.
    """

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
            "xp_reward",
            "choices",
        )
