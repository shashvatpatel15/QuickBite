from rest_framework import generics
from masters.models.category import Category
from masters.serializers.category import CategorySerializer
from rest_framework.permissions import AllowAny

class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True).order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
