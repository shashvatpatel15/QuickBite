from restaurants.models.restaurant import Restaurant
from restaurants.serializers.restaurant import RestaurantSerializer
from users.permissions import(IsRestaurantOwner)
from rest_framework import viewsets
import rest_framework.permissions
from restaurants.filters import RestaurantFilter
from common.pagination import CommonPagination

class RestaurantViewSet(viewsets.ModelViewSet):

    queryset = Restaurant.objects.all()
    serializer_class = RestaurantSerializer
    filterset_class = RestaurantFilter
    pagination_class = CommonPagination

    search_fields = [
        "name",
        "description",
    ]

    ordering_fields = [
        "name",
        "created_at",
        "city",
    ]

    ordering = ["name"]
    
    def get_permissions(self):

        if self.action in ["list", "retrieve"]:
            return [rest_framework.permissions.AllowAny()]

        return [
            rest_framework.permissions.IsAuthenticated(),
            IsRestaurantOwner()
        ]

    def perform_create(self, serializer):

        serializer.save(
            owner=self.request.user
        )

    def get_queryset(self):

        if self.action in [
            "partial_update",
            "update",
            "destroy"
        ]:
            return Restaurant.objects.filter(
                owner=self.request.user
            )

        return Restaurant.objects.all()
