from orders.models.order import Order
from orders.services.websocket import (
    notify_customer_order_status,
    notify_restaurant_order_status
)

def handle_order_status_change(
    order
):
    notify_customer_order_status(
        order
    )
    notify_restaurant_order_status(
        order
    )


