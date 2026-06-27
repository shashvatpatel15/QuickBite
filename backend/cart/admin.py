from django.contrib import admin
from cart.models.cart import Cart
from cart.models.cart_item import CartItem

admin.site.register([Cart,CartItem])
