from users.permissions import IsRestaurantOwner
from restaurants.serializers.restaurant import RestaurantSerializer
from restaurants.models.restaurant import Restaurant
from rest_framework.generics import ListAPIView

class MyRestaurantsAPIView(ListAPIView):
    serializer_class = RestaurantSerializer
    permission_classes = [IsRestaurantOwner]

    def get_queryset(self):
        return Restaurant.objects.filter(
            owner=self.request.user
        )