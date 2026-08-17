from django.db import models


class Journey(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    cover_image = models.URLField(blank=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.title


class Experience(models.Model):
    journey = models.ForeignKey(
        Journey,
        on_delete=models.CASCADE,
        related_name="experiences",
    )
    title = models.CharField(max_length=200)
    slug = models.SlugField()
    order = models.PositiveIntegerField(default=0)
    hook = models.TextField()
    story = models.TextField()
    question = models.TextField()
    reveal = models.TextField()
    xp_reward = models.PositiveIntegerField(default=10)
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["journey", "slug"],
                name="unique_experience_per_journey",
            )
        ]

    def __str__(self):
        return self.title


class Choice(models.Model):
    experience = models.ForeignKey(
        Experience,
        on_delete=models.CASCADE,
        related_name="choices",
    )
    text = models.CharField(max_length=300)
    order = models.PositiveIntegerField(default=0)
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.text


class UserProgress(models.Model):
    session_key = models.CharField(max_length=64, unique=True)
    xp = models.PositiveIntegerField(default=0)
    completed_experiences = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.session_key


class AnswerAttempt(models.Model):
    progress = models.ForeignKey(
        UserProgress,
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    experience = models.ForeignKey(
        Experience,
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    choice = models.ForeignKey(
        Choice,
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    is_correct = models.BooleanField()
    xp_awarded = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.progress.session_key} → {self.experience.title}"