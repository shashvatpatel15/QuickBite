from django.db import transaction
from rest_framework import status
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsCustomer
from decimal import Decimal

from orders.models.order import Order
from orders.models.order_item import OrderItem
from cart.models.cart_item import CartItem

from orders.serializers.order_serializer import (
    OrderSerializer
)
from orders.serializers.order_detail_serializer import (
    OrderDetailSerializer
)


class CustomerOrderViewSet(viewsets.ModelViewSet):

    permission_classes = [
        IsAuthenticated,
        IsCustomer
    ]

    http_method_names = [
        "get",
        "patch"
    ]

    def get_queryset(self):
        return (
            Order.objects
            .filter(customer=self.request.user)
            .select_related("restaurant")
            .prefetch_related("items")
        )

    def get_serializer_class(self):
        if self.action in ["create" , "list"]:
            return OrderSerializer
        return OrderDetailSerializer

    def partial_update(
        self,
        request,
        *args,
        **kwargs
    ):

        order = self.get_object()

        if order.status != Order.Status.PENDING:
            raise ValidationError(
                "Only pending orders can be cancelled."
            )

        if request.data.get("status") != Order.Status.CANCELLED:
            raise ValidationError(
                f"Status must be '{Order.Status.CANCELLED}'."
            )

        order.status = Order.Status.CANCELLED

        order.save(
            update_fields=["status"]
        )

        return Response(
            OrderDetailSerializer(
                order,
                context={"request": request}
            ).data
        )