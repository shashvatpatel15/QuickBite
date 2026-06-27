from masters.serializers.base import CloudinaryModelSerializer
from masters.models.category import Category


class CategorySerializer(CloudinaryModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"