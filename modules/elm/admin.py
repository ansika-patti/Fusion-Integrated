from django.contrib import admin
from modules.elm.models import ELMModel

class ELMModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')

admin.site.register(ELMModel, ELMModelAdmin)
