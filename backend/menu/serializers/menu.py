from rest_framework import serializers
from masters.serializers.base import CloudinaryModelSerializer
from menu.models.menu import Menu

class MenuSerializer(CloudinaryModelSerializer):
    is_available = serializers.BooleanField(default=True, required=False)

    class Meta:
        model = Menu
        fields = "__all__"
        read_only_fields = ["restaurant"]
