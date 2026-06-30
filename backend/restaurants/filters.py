import django_filters
from restaurants.models.restaurant import Restaurant


class RestaurantFilter(django_filters.FilterSet):
    city = django_filters.CharFilter(
        field_name="city",
        lookup_expr="iexact",
    )

    is_open = django_filters.BooleanFilter()

    class Meta:
        model = Restaurant
        fields = [
            "city",
            "is_open",
        ]



