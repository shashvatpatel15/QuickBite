from io import BytesIO
from django.core.files.base import ContentFile
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import (
    getSampleStyleSheet,
    ParagraphStyle
)
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable
)

PRIMARY = colors.HexColor("#FC8019")
LIGHT = colors.HexColor("#F5F5F5")


def generate_invoice(invoice):

    order = invoice.order

    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        alignment=TA_CENTER,
        textColor=colors.white
    )

    elements = []

    # HEADER

    header = Table(
        [[
            Paragraph(
                """
                <b>QuickBite Orders</b><br/>
                GSTIN: XXXXXXXX<br/>
                Ahmedabad, Gujarat
                """,
                title_style
            )
        ]],
        colWidths=[520]
    )


    header.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PRIMARY),
        ("BOX", (0, 0), (-1, -1), 1, PRIMARY),
        ("TOPPADDING", (0, 0), (-1, -1), 15),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 15),
    ]))

    elements.append(header)
    elements.append(Spacer(1, 20))

    # TITLE

    elements.append(
        Paragraph(
            "<b>INVOICE</b>",
            styles["Title"]
        )
    )

    elements.append(Spacer(1, 15))

    invoice_info = Table([
        ["Invoice No", invoice.invoice_number],
        ["Order ID", str(order.id)],
        ["Date", invoice.generated_at.strftime("%d %b %Y")]
    ])

    invoice_info.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
    ]))

    elements.append(invoice_info)

    elements.append(Spacer(1, 20))
    elements.append(HRFlowable())

    # CUSTOMER

    elements.append(Spacer(1, 15))

    elements.append(
        Paragraph(
            "<b>CUSTOMER DETAILS</b>",
            styles["Heading3"]
        )
    )

    customer_table = Table([
        [
            "Name",
            order.customer.get_full_name()
            or order.customer.email
        ],
        [
            "Email",
            order.customer.email
        ],
        [
            "Phone",
            order.customer.phone_number
        ],
        [
            "Address",
            order.delivery_address
        ]
    ], colWidths=[100, 400])

    customer_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
    ]))

    elements.append(customer_table)

    elements.append(Spacer(1, 20))
    elements.append(HRFlowable())

    # ITEMS

    elements.append(Spacer(1, 15))

    elements.append(
        Paragraph(
            "<b>ITEMS</b>",
            styles["Heading3"]
        )
    )

    item_data = [
        ["Item", "Qty", "Price", "Amount"]
    ]

    for item in order.items.all():

        item_data.append([
            item.item_name,
            str(item.quantity),
            f"Rs.{item.price}",
            f"Rs.{item.total_price}"
        ])

    items_table = Table(
        item_data,
        colWidths=[250, 60, 90, 100]
    )

    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
    ]))

    elements.append(items_table)

    elements.append(Spacer(1, 20))

    # SUMMARY

    summary = Table([
        ["Subtotal", f"Rs.{order.subtotal}"],
        ["GST (5%)", f"Rs.{order.tax}"],
        ["Delivery Fee", f"Rs.{order.delivery_fee}"],
        ["TOTAL", f"Rs.{order.total_amount}"],
    ], colWidths=[350, 150])

    summary.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), PRIMARY),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
    ]))

    elements.append(summary)

    elements.append(Spacer(1, 20))
    elements.append(HRFlowable())

    # PAYMENT

    payment = order.payment

    payment_table = Table([
        ["Payment Method", "Razorpay"],
        [
            "Payment ID",
            payment.razorpay_payment_id or "-"
        ],
        [
            "Order Status",
            order.status
        ]
    ], colWidths=[150, 350])

    payment_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
    ]))

    elements.append(payment_table)

    elements.append(Spacer(1, 30))

    # FOOTER

    footer = Paragraph(
        """
        <para align="center">
        <b>Thank You For Ordering ❤️</b><br/>
        support@quickbite.com
        </para>
        """,
        styles["Normal"]
    )

    elements.append(footer)

    doc.build(elements)

    import cloudinary.uploader

    pdf = buffer.getvalue()

    upload_result = cloudinary.uploader.upload(
        pdf,
        resource_type="raw",
        public_id=f"invoices/{invoice.invoice_number}"
    )

    invoice.pdf = upload_result.get("public_id")
    invoice.save()

    buffer.close()

    return invoice