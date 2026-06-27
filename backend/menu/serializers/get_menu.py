from masters.serializers.base import CloudinaryModelSerializer
from menu.models.menu import Menu
from rest_framework.serializers import SlugRelatedField

class GetMenuSerializer(CloudinaryModelSerializer):
    
    category = SlugRelatedField(
        read_only=True,
        slug_field='name')
    food_type = SlugRelatedField(
        read_only=True,
        slug_field='name'
    )

    class Meta:
        model = Menu
        fields = [
            "id",
            "name",
            "description",
            "is_available",
            "price",
            "image",
            "category",
            "food_type",
        ]
