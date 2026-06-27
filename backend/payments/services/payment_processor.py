from django.db import transaction
from customer.models.address import Address
from cart.models.cart import Cart

from orders.models.order import Order
from orders.models.order_item import OrderItem

from payments.services.create_invoice import (
    create_invoice
)

from payments.services.send_invoice import (
    send_invoice_email
)

from orders.services.websocket import (
    notify_restaurant_new_order
)

@transaction.atomic
def process_successful_payment(payment):

    if hasattr(payment, "order"):
        return payment.order

    address = Address.objects.get(
        id=payment.address_id
    )

    delivery_address = f"""
{address.house_no}
{address.building_name}
{address.address_line_1}
{address.address_line_2}
{address.city}
{address.state}
{address.pincode}
""".strip()

    order = Order.objects.create(
        payment=payment,
        customer=payment.user,
        restaurant=payment.restaurant,
        subtotal=payment.subtotal,
        tax=payment.tax,
        delivery_fee=payment.delivery_fee,
        total_amount=payment.amount,
        delivery_address=delivery_address,
        notes=payment.notes
    )

    cart = Cart.objects.prefetch_related(
        "items__menu"
    ).get(
        customer=payment.user
    )

    order_items = []

    for item in cart.items.all():

        order_items.append(
            OrderItem(
                order=order,
                menu=item.menu,
                item_name=item.menu.name,
                price=item.menu.price,
                quantity=item.quantity,
                total_price=item.menu.price * item.quantity
            )
        )

    OrderItem.objects.bulk_create(
        order_items
    )

    cart.items.all().delete()
 
    notify_restaurant_new_order(order)

    invoice = create_invoice(order)

    send_invoice_email(
        payment.user,
        invoice
    )

    return order