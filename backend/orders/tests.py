from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from users.models.user import User
from restaurants.models.restaurant import Restaurant
from orders.models.order import Order
from delivery.models.delivery_partner import DeliveryPartner
from delivery.services.rider import find_nearest_rider

class RestaurantOrdersNearbyRidersTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create restaurant owner
        self.owner = User.objects.create_user(
            email="owner@example.com",
            phone_number="1111111111",
            role=User.Role.RESTAURANT_OWNER,
            password="testpassword"
        )
        self.client.force_authenticate(user=self.owner)
        
        # Create customer
        self.customer = User.objects.create_user(
            email="customer@example.com",
            phone_number="2222222222",
            role=User.Role.CUSTOMER,
            password="testpassword"
        )
        
        # Create restaurant
        self.restaurant = Restaurant.objects.create(
            owner=self.owner,
            name="Test Restaurant",
            email="restaurant@example.com",
            phone_number="3333333333",
            address="123 Street",
            city="Test City",
            latitude=None,
            longitude=None
        )
        
        # Create order
        self.order = Order.objects.create(
            customer=self.customer,
            restaurant=self.restaurant,
            subtotal=100.00,
            total_amount=140.00,
            delivery_address="456 Street"
        )

    def test_nearby_riders_restaurant_no_gps(self):
        # When restaurant coordinates are None, querying nearby riders should self-heal and return 200 OK
        url = f"/api/orders/restaurants/{self.restaurant.id}/{self.order.id}/nearby-riders/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Reload restaurant from DB and verify coordinates are healed
        self.restaurant.refresh_from_db()
        self.assertEqual(float(self.restaurant.latitude), 12.971600)
        self.assertEqual(float(self.restaurant.longitude), 77.594600)

    def test_find_nearest_rider_restaurant_no_gps(self):
        # find_nearest_rider should self-heal coordinates in the database
        rider = find_nearest_rider(self.restaurant)
        self.restaurant.refresh_from_db()
        self.assertEqual(float(self.restaurant.latitude), 12.971600)
        self.assertEqual(float(self.restaurant.longitude), 77.594600)

    def test_nearby_riders_restaurant_with_gps(self):
        # Update restaurant with coordinates
        self.restaurant.latitude = 12.9716
        self.restaurant.longitude = 77.5946
        self.restaurant.save()

        # Create riders
        rider_user = User.objects.create_user(
            email="rider@example.com",
            phone_number="4444444444",
            role=User.Role.DELIVERY_PARTNER,
            password="testpassword"
        )
        rider = rider_user.delivery_profile
        rider.vehicle_number = "KA-01-1234"
        rider.is_online = True
        rider.is_available = True
        rider.current_latitude = 12.9718
        rider.current_longitude = 77.5948
        rider.save()

        url = f"/api/orders/restaurants/{self.restaurant.id}/{self.order.id}/nearby-riders/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], rider.id)

    def test_assign_rider(self):
        # Update restaurant with coordinates
        self.restaurant.latitude = 12.9716
        self.restaurant.longitude = 77.5946
        self.restaurant.save()

        # Update order status to READY
        self.order.status = Order.Status.READY
        self.order.save()

        # Create rider
        rider_user = User.objects.create_user(
            email="rider2@example.com",
            phone_number="4444444445",
            role=User.Role.DELIVERY_PARTNER,
            password="testpassword"
        )
        rider = rider_user.delivery_profile
        rider.vehicle_number = "KA-01-1234"
        rider.is_online = True
        rider.is_available = True
        rider.current_latitude = 12.9718
        rider.current_longitude = 77.5948
        rider.save()

        url = f"/api/orders/restaurants/{self.restaurant.id}/{self.order.id}/assign-rider/"
        response = self.client.post(url, {"rider_id": rider.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["rider"]["id"], rider.id)
