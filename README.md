# QuickBite

A full-stack food ordering and delivery web application with three user roles — Customer, Restaurant Owner, and Delivery Partner. Supports real-time order tracking, online payments, and live rider location updates.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo & Test Credentials](#live-demo--test-credentials)
- [Features](#features)
  - [Customer](#customer)
  - [Restaurant Dashboard](#restaurant-dashboard)
  - [Delivery Partner](#delivery-partner)
- [Tech Stack](#tech-stack)
  - [Frontend](#frontend)
  - [Backend](#backend)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [API Endpoints Overview](#api-endpoints-overview)

---

## Overview

QuickBite is a full-stack food delivery platform where customers can browse restaurants, add items to cart, place orders with online payment, and track their delivery in real-time on a map. Restaurant owners manage their menu, handle incoming orders, and assign delivery riders. Delivery partners go online, share their GPS location, and complete deliveries.

The app uses **React** on the frontend and **Django REST Framework** on the backend, with **WebSockets** (Django Channels) for real-time communication between all three user roles.

---

## Live Demo & Test Credentials

To test the live application without going through the registration and email OTP verification flow, you can log in using the following verified test accounts:

| Role | Email Address | Password | Details |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@quickbite.com` | `QuickBite123!` | Browse restaurants, add items to cart, place orders, and track delivery |
| **Restaurant Owner** | `owner@quickbite.com` | `QuickBite123!` | Manages "The Farsan Factory" (accept orders, assign riders, edit menu) |
| **Delivery Partner (Rider)** | `rider@quickbite.com` | `QuickBite123!` | Go online, accept/decline orders, and simulate delivery maps |

---

## Features

### Customer

- **Browse Restaurants:** View all restaurants with filters for cuisine, rating, cost, veg-only, and offers.
- **Location-Based Filtering:** Auto-detect GPS location or enter manually to see restaurants delivering nearby.
- **Menu & Cart:** View restaurant menus, add items to a persistent cart, and adjust quantities.
- **Online Payment:** Secure checkout using Razorpay payment gateway with signature verification.
- **Order Tracking:** Real-time order status updates (Pending → Confirmed → Preparing → Ready → Out for Delivery → Delivered).
- **Live Map Tracking:** Track rider's live GPS location on an interactive Leaflet map during delivery.
- **Order History:** View all past orders with details and downloadable PDF invoices.
- **OTP Verification:** Email-based OTP verification during registration.

### Restaurant Dashboard

- **Restaurant Management:** Register restaurants with name, address, city, and image.
- **Menu Management:** Full CRUD for menu items — add, edit, delete dishes with images and pricing.
- **Order Queue:** Real-time incoming order notifications via WebSocket with sound alerts.
- **Order Status Control:** Update order status step-by-step (Confirm → Prepare → Ready).
- **Assign Delivery Partner:** View nearby online riders sorted by distance, assign manually or auto-assign the nearest rider.
- **Rider Tracking:** See rider's accept/reject status in real-time.

### Delivery Partner

- **Go Online/Offline Toggle:** Toggle availability status with GPS location permission.
- **Live Location Sharing:** Continuous GPS location sent to server via WebSocket while online.
- **Order Notifications:** Auto-polling for new assigned delivery tasks.
- **Accept/Reject Orders:** Accept or decline delivery assignments.
- **Delivery Simulation:** Simulate the delivery journey with live map updates sent to the customer.
- **Order History:** View completed and cancelled deliveries.

---

## Tech Stack

### Frontend

- **React:** JavaScript library for building user interfaces.
- **React Router:** For client-side routing and navigation.
- **Tailwind CSS:** Utility-first CSS framework for styling.
- **React Context API:** For global state management (Authentication, Cart).
- **Leaflet.js:** For interactive maps and live rider tracking.
- **Axios:** For making HTTP requests to the backend API.
- **Razorpay Checkout SDK:** For handling online payments on the client side.
- **(Build Tool):** Vite.

### Backend

- **Python / Django:** Web framework for the backend.
- **Django REST Framework:** For building RESTful APIs.
- **Django Channels:** For WebSocket support and real-time communication.
- **Daphne:** ASGI server that handles both HTTP and WebSocket connections.
- **PostgreSQL (Neon):** Relational database for storing all application data.
- **Simple JWT:** For generating and validating JWT authentication tokens.
- **Razorpay Python SDK:** For creating payment orders and verifying signatures.
- **ReportLab:** For generating PDF invoices.
- **Cloudinary:** CDN for storing restaurant and menu item images.
- **Brevo API:** For sending OTP verification emails.

---

## Project Structure

```
/QuickBite
├── backend/
│   ├── config/             # Django project settings, URL config, ASGI setup
│   ├── users/              # Custom User model, authentication, OTP, permissions
│   ├── customer/           # Customer profile and address management
│   ├── restaurants/        # Restaurant CRUD and owner management
│   ├── menu/               # Menu items CRUD with image uploads
│   ├── cart/               # Persistent shopping cart
│   ├── orders/             # Order creation, status updates, restaurant order views
│   ├── payments/           # Razorpay integration, invoice generation
│   ├── delivery/           # Delivery partner model, rider assignment, WebSocket consumer
│   ├── masters/            # Cuisine categories and master data
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components (Navbar, RestaurantCard, etc.)
│   │   ├── context/        # React Context providers (AuthContext, CartContext)
│   │   ├── pages/          # Page components (Dashboard, OrderQueue, RiderDashboard, etc.)
│   │   ├── api.js          # Axios instance with JWT interceptor
│   │   ├── App.jsx         # Main app with routing
│   │   └── main.jsx        # Entry point
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL database (or a Neon serverless account)
- Razorpay account (test keys work fine)
- Cloudinary account (for image uploads)

### Installation

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
```

**Frontend:**
```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env` file inside `backend/` with the following:

```env
# Database (Neon PostgreSQL)
DB_NAME=quickbite
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=your_neon_host.neon.tech
DB_PORT=5432

# Razorpay Payment Gateway
# Use 'rzp_test_dummy' prefix for local mock mode (no real payments)
RAZORPAY_KEY_ID=rzp_test_dummy_yourkeyid
RAZORPAY_KEY_SECRET=yourkeysecret
RAZORPAY_WEBHOOK_SECRET=yourwebhooksecret

# Cloudinary (Image Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email OTP (Brevo)
# Leave empty to print OTPs to the server terminal instead
BREVO_API_KEY=your_brevo_api_key
DEFAULT_FROM_EMAIL=your_email@domain.com
```

Create a `.env` file inside `frontend/` with:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### Running Locally

**Start Backend (runs both HTTP API and WebSockets on port 8000):**
```bash
cd backend
daphne -p 8000 config.asgi:application
```

**Start Frontend:**
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## API Endpoints Reference

All API requests expect `Content-Type: application/json` headers. Authenticated endpoints require a JWT Bearer token: `Authorization: Bearer <access_token>`.

### HTTP APIs

| Module | Endpoint | Method | Auth | Description |
| :--- | :--- | :---: | :--- | :--- |
| **Auth** | `/api/auth/register/` | POST | Public | Register a new user profile (Customer, Owner, Rider) |
| | `/api/auth/verify-otp/` | POST | Public | Verify email OTP and return JWT tokens |
| | `/api/auth/login/` | POST | Public | Login with email/password and return JWT tokens |
| **Customer** | `/api/customer/profile/` | GET / PUT | Customer | View/Update customer profile & saved addresses |
| | `/api/categories/` | GET | Public | List master cuisine categories |
| **Restaurant** | `/api/restaurants/` | GET | Public | List/Filter all restaurants |
| | `/api/restaurants/<id>/menu/` | GET | Public | Retrieve the menu of a specific restaurant |
| | `/api/menu/owner/restaurants/<id>/` | POST | Owner | Add a new menu item to a restaurant |
| **Cart** | `/api/cart/items/` | GET / POST | Customer | Retrieve items or add/modify item in cart |
| | `/api/cart/items/<id>/` | PATCH / DELETE | Customer | Update quantity or remove item from cart |
| **Orders** | `/api/orders/` | GET / POST | Customer | View order history or place a new order |
| | `/api/payments/verify/` | POST | Customer | Verify Razorpay signature and confirm order |
| | `/api/payments/invoices/<id>/download/` | GET | Customer/Owner | Download order invoice PDF |
| **Delivery** | `/api/orders/restaurants/<rest_id>/<order_id>/nearby-riders/` | GET | Owner | List nearby active riders sorted by distance |
| | `/api/orders/restaurants/<rest_id>/<order_id>/assign-rider/` | POST | Owner | Assign a rider to an order (manual or auto-assign) |
| | `/api/delivery/orders/<order_id>/accept/` | POST | Rider | Accept an assigned delivery task |
| | `/api/delivery/orders/<order_id>/reject/` | POST | Rider | Reject/Decline an assigned delivery task |

### WebSockets (Django Channels)

Authorized using the `?token=<jwt_token>` query parameter.

| Channel / Group | URL | Protocol | Role | Description |
| :--- | :--- | :---: | :--- | :--- |
| **Customer tracking** | `/ws/orders/<order_id>/` | ws / wss | Customer | Receives live rider location and order status updates |
| **Restaurant queue** | `/ws/restaurants/<restaurant_id>/` | ws / wss | Owner | Receives real-time incoming order notifications |
| **Rider telemetry** | `/ws/delivery-tracking/` | ws / wss | Rider | Receives location/telemetry data from online riders |
