from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from menu.models.menu import Menu
from menu.serializers.get_menu import GetMenuSerializer


class CustomerMenuViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = GetMenuSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):

        return Menu.objects.filter(
            restaurant_id=self.kwargs["restaurant_id"],
            is_available=True
        )