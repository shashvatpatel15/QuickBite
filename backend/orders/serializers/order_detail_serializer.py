from rest_framework import serializers

from orders.models.order import Order
from orders.models.order_item import OrderItem
from delivery.models.delivery_partner import DeliveryPartner
from customer.models.address import Address
from users.models.user import User

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "item_name",
            "quantity",
            "price",
            "total_price"
        ]

class CustomerDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "email",
            "phone_number"
        ]

class DeliveryPartnerDetailSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source="user.phone_number")

    class Meta:
        model = DeliveryPartner
        fields = [
            "id",
            "name",
            "phone_number",
            "vehicle_number",
            "current_latitude",
            "current_longitude",
            "is_online",
        ]

    def get_name(self, obj):
        return obj.user.email.split("@")[0]

class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(
        many=True,
        read_only=True
    )
    delivery_partner = DeliveryPartnerDetailSerializer(read_only=True)
    customer = CustomerDetailSerializer(read_only=True)
    restaurant_name = serializers.CharField(source="restaurant.name", read_only=True)
    restaurant_latitude = serializers.DecimalField(source="restaurant.latitude", max_digits=9, decimal_places=6, read_only=True)
    restaurant_longitude = serializers.DecimalField(source="restaurant.longitude", max_digits=9, decimal_places=6, read_only=True)
    
    customer_latitude = serializers.SerializerMethodField()
    customer_longitude = serializers.SerializerMethodField()
    invoice_url = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "subtotal",
            "delivery_fee",
            "tax",
            "total_amount",
            "delivery_address",
            "notes",
            "items",
            "customer",
            "delivery_partner",
            "restaurant_name",
            "restaurant_latitude",
            "restaurant_longitude",
            "customer_latitude",
            "customer_longitude",
            "rider_accepted",
            "invoice_url",
            "created_at"
        ]

    def get_invoice_url(self, obj):
        if hasattr(obj, "invoice") and obj.invoice.pdf:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.invoice.pdf.url)
            return obj.invoice.pdf.url
        return None

    def get_customer_latitude(self, obj):
        if obj.payment:
            try:
                address = Address.objects.get(id=obj.payment.address_id)
                if address.latitude is None:
                    city_lower = (obj.restaurant.city or "").lower()
                    address.latitude = 28.6250 if "del" in city_lower else 12.9800
                    address.save(update_fields=["latitude"])
                return address.latitude
            except Address.DoesNotExist:
                pass
        return None

    def get_customer_longitude(self, obj):
        if obj.payment:
            try:
                address = Address.objects.get(id=obj.payment.address_id)
                if address.longitude is None:
                    city_lower = (obj.restaurant.city or "").lower()
                    address.longitude = 77.2200 if "del" in city_lower else 77.6000
                    address.save(update_fields=["longitude"])
                return address.longitude
            except Address.DoesNotExist:
                pass
        return None