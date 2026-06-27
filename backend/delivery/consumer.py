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
        if hasattr(self, "delivery_partner"):
            await self.set_online_status(False)

    @database_sync_to_async
    def set_online_status(self, is_online):
        self.delivery_partner.is_online = is_online
        self.delivery_partner.save(
            update_fields=["is_online"]
        )

    async def receive(self,text_data):

        data = json.loads(
            text_data
        )

        latitude = data.get(
            "latitude"
        )

        longitude = data.get(
            "longitude"
        )

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
    
