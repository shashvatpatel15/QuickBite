import json
from channels.generic.websocket import (AsyncWebsocketConsumer)
from channels.db import (database_sync_to_async)
from restaurants.models.restaurant import (Restaurant)


class RestaurantOrderConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.restaurant_id = int(
            self.scope["url_route"]
            ["kwargs"]["restaurant_id"]
        )

        user = self.scope.get(
            "user"
        )

        if user is None or user.is_anonymous:
            await self.close(code=4001)
            return

        is_owner = (
            await self.check_owner(
                user.id
            )
        )

        if not is_owner:
            await self.close(code=4001)
            return

        self.group_name = (
            f"restaurant_orders_"
            f"{self.restaurant_id}"
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

    async def new_order(self,event):
        await self.send(
            text_data=json.dumps(
                event["data"]
            )
        )

    @database_sync_to_async
    def check_owner(self,user_id):

        return (
            Restaurant.objects
            .filter(
                id=self.restaurant_id,
                owner_id=user_id
            )
            .exists()
        )