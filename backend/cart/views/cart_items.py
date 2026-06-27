from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError

from users.permissions import IsCustomer

from cart.models.cart import Cart
from cart.models.cart_item import CartItem

from cart.serializers.cart import CartItemSerializer


class CartItemViewSet(viewsets.ModelViewSet):

    serializer_class = CartItemSerializer

    permission_classes = [
        IsAuthenticated,
        IsCustomer,
    ]

    http_method_names = [
        "get",
        "post",
        "patch",
        "delete",
    ]

    def get_queryset(self):
        return (
            CartItem.objects
            .filter(
                cart__customer=self.request.user
            )
            .select_related(
                "cart",
                "menu",
                "menu__restaurant",
            )
        )

    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(
            data=request.data
        )
        serializer.is_valid(
            raise_exception=True
        )

        cart, _ = Cart.objects.get_or_create(
            customer=request.user
        )

        menu = serializer.validated_data["menu"]
        quantity = serializer.validated_data["quantity"]

        existing_item = (
            CartItem.objects
            .filter(cart=cart)
            .select_related(
                "menu__restaurant"
            )
            .first()
        )

        if (
            existing_item
            and existing_item.menu.restaurant_id
            != menu.restaurant_id
        ):
            raise ValidationError(
                "You can only add items from one restaurant at a time."
            )

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            menu=menu,
            defaults={
                "quantity": quantity
            }
        )

        if not created:
            cart_item.quantity += quantity
            cart_item.save(
                update_fields=["quantity"]
            )

        response_serializer = self.get_serializer(
            cart_item
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )

    def perform_update(self, serializer):
        serializer.save()

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        menu_name = instance.menu.name

        self.perform_destroy(instance)

        return Response(
            {
                "message": f"{menu_name} removed from cart."
            },
            status=status.HTTP_200_OK
        )

    @action(
        detail=False,
        methods=["delete"],
        url_path="clear"
    )
    def clear_cart(self, request):

        deleted_count, _ = (
            CartItem.objects
            .filter(
                cart__customer=request.user
            )
            .delete()
        )

        return Response(
            {
                "message": "Cart cleared successfully.",
                "deleted_items": deleted_count
            },
            status=status.HTTP_200_OK
        )