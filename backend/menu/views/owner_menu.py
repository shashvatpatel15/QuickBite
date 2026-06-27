from django.shortcuts import get_object_or_404

from rest_framework import viewsets

from menu.models.menu import Menu
from menu.serializers.menu import MenuSerializer
from restaurants.models.restaurant import Restaurant
from users.permissions import IsRestaurantOwner


class OwnerMenuViewSet(viewsets.ModelViewSet):

    serializer_class = MenuSerializer
    permission_classes = [IsRestaurantOwner]

    def get_queryset(self):

        return Menu.objects.filter(
            restaurant_id=self.kwargs["restaurant_id"],
            restaurant__owner=self.request.user
        )

    def perform_create(self, serializer):

        restaurant = get_object_or_404(
            Restaurant,
            id=self.kwargs["restaurant_id"],
            owner=self.request.user
        )

        serializer.save(
            restaurant=restaurant
        )