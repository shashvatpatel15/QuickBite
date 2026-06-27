import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.settings")

from django.core.asgi import (
    get_asgi_application
)


django_asgi_app = (
    get_asgi_application()
)

from channels.routing import (ProtocolTypeRouter,URLRouter)
from orders.middleware import JWTAuthMiddleware

from orders.routing import (
    websocket_urlpatterns
    as order_patterns
)

from delivery.routing import (
    websocket_urlpatterns
    as delivery_patterns
)

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,

        "websocket": JWTAuthMiddleware(
            URLRouter(
                order_patterns
                +
                delivery_patterns
            )
        ),
    }
)