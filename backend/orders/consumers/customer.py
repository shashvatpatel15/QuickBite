import json
from channels.generic.websocket import AsyncWebsocketConsumer
from orders.models.order import Order
from channels.db import database_sync_to_async

class CustomerOrderConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.order_id = int(
            self.scope["url_route"]
            ["kwargs"]["order_id"]
        )

        user = self.scope.get(
            "user"
        )

        if not user or user.is_anonymous:
            await self.close(code=4001)
            return

        is_customer = await self.check_order_owner(
            user.id
        )

        if not is_customer:
            await self.close(code=4001)
            return

        self.group_name = (
            f"customer_order_"
            f"{self.order_id}"
        )

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()


    async def disconnect(self,close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive(self,text_data):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        if data.get("type") == "ping":
            await self.send(
                text_data=json.dumps(
                    {"type": "pong"}
                )
            )

    async def order_status_changed(self,event):
        await self.send(
            text_data=json.dumps(
                event["data"]
            )
        )

    
    async def location_update(self,event):
        await self.send(
            text_data=json.dumps(
                event["data"]
            )
        )

    @database_sync_to_async
    def check_order_owner(self,user_id):
        return Order.objects.filter(
            id=self.order_id,
            customer_id=user_id
        ).exists()
    
