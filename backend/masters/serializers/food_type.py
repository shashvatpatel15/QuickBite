from rest_framework import serializers
from masters.models.food_type import FoodType


class FoodTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodType
        fields = ["id", "name", "is_active"]

