import logging
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from orders.models.order import Order

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Order)
def order_saved_handler(sender, instance, created, **kwargs):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    def send_notification():
        if created:
            # Send new order notification to restaurant owner group
            try:
                async_to_sync(channel_layer.group_send)(
                    f"restaurant_orders_{instance.restaurant_id}",
                    {
                        "type": "new_order",
                        "data": {
                            "type": "new_order",
                            "order_id": instance.id,
                            "status": instance.status,
                            "total": float(instance.total_amount),
                        }
                    }
                )
            except Exception as e:
                logger.error(f"WebSocket notification failed in order_saved_handler (created): {e}", exc_info=True)
        else:
            # Send status update to customer tracking group
            try:
                async_to_sync(channel_layer.group_send)(
                    f"customer_order_{instance.id}",
                    {
                        "type": "order_status_changed",
                        "data": {
                            "order_id": instance.id,
                            "status": instance.status,
                        }
                    }
                )
            except Exception as e:
                logger.error(f"WebSocket notification failed in order_saved_handler (update): {e}", exc_info=True)

    transaction.on_commit(send_notification)
