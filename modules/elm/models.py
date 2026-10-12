from django.db import models

class ELMModel(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()

    class Meta:
        abstract = True
