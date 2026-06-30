import django_filters
from orders.models.order import Order


class CustomerOrderFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(
        choices=Order.Status.choices
    )

    created_after = django_filters.DateFilter(
        field_name="created_at",
        lookup_expr="date__gte",
    )

    created_before = django_filters.DateFilter(
        field_name="created_at",
        lookup_expr="date__lte",
    )

    class Meta:
        model = Order
        fields = [
            "status",
        ]



class RestaurantOrderFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(
        choices=Order.Status.choices
    )

    rider_accepted = django_filters.BooleanFilter()

    created_after = django_filters.DateFilter(
        field_name="created_at",
        lookup_expr="date__gte",
    )

    created_before = django_filters.DateFilter(
        field_name="created_at",
        lookup_expr="date__lte",
    )

    class Meta:
        model = Order
        fields = [
            "status",
            "rider_accepted",
        ]