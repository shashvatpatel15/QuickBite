from rest_framework import generics
from masters.models.food_type import FoodType
from rest_framework.permissions import AllowAny
from masters.serializers.food_type import FoodTypeSerializer

class FoodTypeListView(generics.ListAPIView):
    queryset = FoodType.objects.filter(is_active=True).order_by("name")
    serializer_class = FoodTypeSerializer
    permission_classes = [AllowAny]

