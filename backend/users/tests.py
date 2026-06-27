from django.test import TestCase
from users.models.user import User
from delivery.models.delivery_partner import DeliveryPartner
from restaurants.models.restaurant import Restaurant
from rest_framework.test import APIClient
from rest_framework import status

class UserRegistrationGPSTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_customer_registration_no_gps(self):
        response = self.client.post("/api/auth/register/", {
            "email": "customer@example.com",
            "phone_number": "1234567890",
            "role": "customer",
            "password": "securepassword123"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="customer@example.com")
        self.assertEqual(user.role, User.Role.CUSTOMER)
        self.assertTrue(user.is_verified is False)

    def test_delivery_partner_registration_with_gps(self):
        response = self.client.post("/api/auth/register/", {
            "email": "rider@example.com",
            "phone_number": "9876543210",
            "role": "delivery_partner",
            "password": "securepassword123",
            "latitude": 12.9716,
            "longitude": 77.5946
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="rider@example.com")
        partner = DeliveryPartner.objects.get(user=user)
        self.assertEqual(float(partner.current_latitude), 12.971600)
        self.assertEqual(float(partner.current_longitude), 77.594600)

    def test_restaurant_owner_registration_with_gps(self):
        response = self.client.post("/api/auth/register/", {
            "email": "owner@example.com",
            "phone_number": "5555555555",
            "role": "restaurant_owner",
            "password": "securepassword123",
            "latitude": 28.6139,
            "longitude": 77.2090
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="owner@example.com")
        self.assertEqual(user.role, User.Role.RESTAURANT_OWNER)
        self.assertFalse(Restaurant.objects.filter(owner=user).exists())
