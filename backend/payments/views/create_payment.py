from decimal import Decimal
from django.db import transaction

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from users.permissions import IsCustomer
from cart.models.cart import Cart
from payments.models.payment import Payment
from payments.serializers.create_payment import (CreatePaymentSerializer)
from django.conf import settings
from payments.services.razorpay_client import client


class CreatePaymentView(APIView):

    permission_classes = [
        IsAuthenticated,
        IsCustomer
    ]

    @transaction.atomic
    def post(self, request):

        serializer = CreatePaymentSerializer(
            data=request.data,
            context={"request": request}
        )

        serializer.is_valid(
            raise_exception=True
        )

        address = serializer.validated_data["address"]

        notes = serializer.validated_data.get(
            "notes",
            ""
        )

        cart = Cart.objects.prefetch_related(
            "items__menu",
            "items__menu__restaurant"
        ).get(
            customer=request.user
        )

        cart_items = cart.items.all()

        if not cart_items.exists():
            return Response(
                {
                    "detail": "Cart is empty."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        restaurant = cart_items.first().menu.restaurant

        subtotal = sum(
            item.menu.price * item.quantity
            for item in cart_items
        )

        tax = subtotal * Decimal("0.05")

        delivery_fee = Decimal("40")

        total_amount = (
            subtotal +
            tax +
            delivery_fee
        )

        checkout_snapshot = {
            "items": [
                {
                    "menu_id": item.menu.id,
                    "name": item.menu.name,
                    "price": str(item.menu.price),
                    "quantity": item.quantity
                }
                for item in cart_items
            ]
        }

        try:
            razorpay_order = client.order.create(
                {
                    "amount": int(
                        total_amount * 100
                    ),
                    "currency": "INR",
                    "payment_capture": 1
                }
            )
            razorpay_order_id = razorpay_order["id"]
        except Exception as e:
            if settings.RAZORPAY_KEY_ID.startswith("rzp_test_dummy") or "Authentication failed" in str(e):
                import uuid
                razorpay_order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
            else:
                raise e

        payment = Payment.objects.create(
            user=request.user,
            restaurant=restaurant,
            amount=total_amount,
            subtotal=subtotal,
            tax=tax,
            delivery_fee=delivery_fee,
            address_id=address.id,
            notes=notes,
            checkout_snapshot=checkout_snapshot,
            razorpay_order_id=razorpay_order_id
        )

        return Response(
            {
                "payment_id": payment.id,
                "key": settings.RAZORPAY_KEY_ID,
                "razorpay_order_id": payment.razorpay_order_id,
                "amount": int(
                    total_amount * 100
                ),
                "currency": "INR"
            },
            status=status.HTTP_201_CREATED
        )