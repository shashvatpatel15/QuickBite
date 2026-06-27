from payments.models.invoice import Invoice
from payments.services.generate_invoice import (generate_invoice)


def create_invoice(order):

    snapshot = {
        "customer": order.customer.email,
        "restaurant": order.restaurant.name,
        "subtotal": str(order.subtotal),
        "tax": str(order.tax),
        "delivery_fee": str(order.delivery_fee),
        "total": str(order.total_amount),
        "items": [
            {
                "name": item.item_name,
                "price": str(item.price),
                "quantity": item.quantity,
                "total_price": str(item.total_price)
            }
            for item in order.items.all()
        ]
    }

    invoice = Invoice.objects.create(
        order=order,
        invoice_number=f"INV-{order.id}",
        invoice_snapshot=snapshot
    )

    generate_invoice(invoice)

    return invoice