from rest_framework import serializers
from cart.models.cart_item import CartItem
from menu.serializers.get_menu import GetMenuSerializer


class CartItemSerializer(serializers.ModelSerializer):
    menu_details = GetMenuSerializer(source="menu", read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "cart", "menu", "quantity", "menu_details"]
        read_only_fields = ["cart"]

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "Quantity must be greater than 0."
            )
        return value