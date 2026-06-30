from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from menu.models.menu import Menu
from menu.serializers.get_menu import GetMenuSerializer
from menu.filters import MenuFilter
from common.pagination import CommonPagination

class CustomerMenuViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = GetMenuSerializer
    permission_classes = [AllowAny]

    pagination_class = CommonPagination
    filterset_class = MenuFilter

    search_fields = [
        "name",
        "description",
    ]

    ordering_fields = [
        "price",
        "name",
        "created_at",
    ]

    ordering = ["name"]

    def get_queryset(self):

        return Menu.objects.filter(
            restaurant_id=self.kwargs["restaurant_id"],
            is_available=True
        )