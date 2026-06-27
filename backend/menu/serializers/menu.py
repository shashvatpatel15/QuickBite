from masters.serializers.base import CloudinaryModelSerializer
from menu.models.menu import Menu

class MenuSerializer(CloudinaryModelSerializer):
    class Meta:
        model = Menu
        fields = "__all__"
        read_only_fields = ["restaurant"]
