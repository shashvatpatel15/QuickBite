import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

def notify_restaurant_new_order(order):
    channel_layer = get_channel_layer()
    if channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(
                f"restaurant_orders_{order.restaurant_id}",
                {
                    "type": "new_order",
                    "data": {
                        "type": "new_order",
                        "order_id": order.id,
                        "status": order.status,
                        "total": float(order.total_amount),
                    }
                }
            )
        except Exception as e:
            logger.error(f"WebSocket notification failed in notify_restaurant_new_order: {e}", exc_info=True)
    
def notify_customer_order_status(order):
    channel_layer = get_channel_layer()
    if channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(
                f"customer_order_{order.id}",
                {
                    "type": "order_status_changed",
                    "data": {
                        "order_id": order.id,
                        "status": order.status,
                        "rider_accepted": order.rider_accepted,
                    }
                }
            )
        except Exception as e:
            logger.error(f"WebSocket notification failed in notify_customer_order_status: {e}", exc_info=True)

def notify_restaurant_order_status(order):
    channel_layer = get_channel_layer()
    if channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(
                f"restaurant_orders_{order.restaurant_id}",
                {
                    "type": "new_order",
                    "data": {
                        "type": "order_update",
                        "order_id": order.id,
                        "status": order.status,
                        "rider_accepted": order.rider_accepted,
                    }
                }
            )
        except Exception as e:
            logger.error(f"WebSocket notification failed in notify_restaurant_order_status: {e}", exc_info=True)