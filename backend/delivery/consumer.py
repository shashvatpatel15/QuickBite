import json
from channels.generic.websocket import (AsyncWebsocketConsumer)
from channels.db import (database_sync_to_async)
from delivery.models.delivery_partner import (DeliveryPartner)
from orders.models.order import Order

class DeliveryTrackingConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope.get("user")
        if not user or user.is_anonymous or user.role != "delivery_partner":
            await self.close(code=4001)
            return

        self.delivery_partner = await self.get_partner(user.id)
        if not self.delivery_partner:
            await self.close(code=4001)
            return

        await self.set_online_status(True)
        await self.accept()

    async def disconnect(self, close_code):
        # Properly clean up when WebSocket closes to avoid Daphne forced kill
        # Only set offline if rider doesn't have an active delivery
        # (assignment lifecycle manages is_online during deliveries)
        if hasattr(self, "delivery_partner") and self.delivery_partner:
            try:
                await self.set_offline_if_no_active_delivery()
            except Exception:
                pass

    @database_sync_to_async
    def set_offline_if_no_active_delivery(self):
        """Only mark rider offline if they have no active delivery.
        If they're on a delivery, the assignment/completion lifecycle manages is_online."""
        try:
            partner = DeliveryPartner.objects.get(id=self.delivery_partner.id)
            has_active = Order.objects.filter(
                delivery_partner=partner,
                status__in=[
                    Order.Status.ASSIGNED,
                    Order.Status.OUT_FOR_DELIVERY,
                ]
            ).exists()
            if not has_active:
                partner.is_online = False
                partner.save(update_fields=["is_online"])
        except DeliveryPartner.DoesNotExist:
            pass

    @database_sync_to_async
    def set_online_status(self, is_online):
        # Re-fetch from DB to avoid stale state
        try:
            partner = DeliveryPartner.objects.get(id=self.delivery_partner.id)
            partner.is_online = is_online
            partner.save(update_fields=["is_online"])
        except DeliveryPartner.DoesNotExist:
            pass

    async def receive(self,text_data):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        latitude = data.get("latitude")
        longitude = data.get("longitude")

        if latitude is None or longitude is None:
            return

        await self.update_location(
            latitude,
            longitude
        )

        await self.broadcast_location(
            latitude,
            longitude
        )


    async def broadcast_location(self,latitude,longitude):

        order = (
            await self.get_active_order()
        )

        if not order:
            return

        await self.channel_layer.group_send(
            f"customer_order_{order.id}",
            {
                "type":
                "location_update",

                "data": {

                    "event":
                    "LOCATION_UPDATE",

                    "latitude":
                    latitude,

                    "longitude":
                    longitude
                }
            }
        )

    @database_sync_to_async
    def get_partner(self,user_id):
        return (
            DeliveryPartner.objects
            .filter(
                user_id=user_id
            )
            .first()
        )
    

    @database_sync_to_async
    def update_location(self,latitude,longitude):
        try:
            self.delivery_partner.current_latitude = round(float(latitude), 6)
        except (ValueError, TypeError, KeyError):
            self.delivery_partner.current_latitude = latitude

        try:
            self.delivery_partner.current_longitude = round(float(longitude), 6)
        except (ValueError, TypeError, KeyError):
            self.delivery_partner.current_longitude = longitude

        self.delivery_partner.save(
            update_fields=[
                "current_latitude",
                "current_longitude"
            ]
        )


    @database_sync_to_async
    def get_active_order(self):

        return (
            Order.objects
            .filter(
                delivery_partner=
                self.delivery_partner,

                status=
                Order.Status.OUT_FOR_DELIVERY
            )
            .first()
        )

