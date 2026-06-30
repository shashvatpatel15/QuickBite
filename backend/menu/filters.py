import django_filters
from menu.models.menu import Menu


class MenuFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter()
    food_type = django_filters.NumberFilter()

    min_price = django_filters.NumberFilter(
        field_name="price",
        lookup_expr="gte",
    )

    max_price = django_filters.NumberFilter(
        field_name="price",
        lookup_expr="lte",
    )

    class Meta:
        model = Menu
        fields = [
            "category",
            "food_type",
        ]