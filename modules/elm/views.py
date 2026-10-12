from rest_framework import viewsets
from modules.elm.serializers import ApplicationSerializer
from modules.placement.models import Application

class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.all()
    serializer_class = ApplicationSerializer
