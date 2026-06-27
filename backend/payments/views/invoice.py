from django.http import FileResponse

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import (
    IsAuthenticated
)
from rest_framework.response import Response

from users.models.user import User

from payments.models.invoice import Invoice
from payments.serializers.invoice import (
    InvoiceSerializer
)


class InvoiceViewSet(
    viewsets.ReadOnlyModelViewSet
):

    serializer_class = InvoiceSerializer

    permission_classes = [
        IsAuthenticated
    ]

    def get_queryset(self):

        user = self.request.user

        if user.role == User.Role.CUSTOMER:

            return Invoice.objects.filter(
                order__customer=user
            )

        if user.role == User.Role.RESTAURANT_OWNER:

            return Invoice.objects.filter(
                order__restaurant__owner=user
            )

        return Invoice.objects.none()

    @action(
        detail=True,
        methods=["get"]
    )
    def download(
        self,
        request,
        pk=None
    ):

        invoice = self.get_object()

        return FileResponse(
            invoice.pdf.open("rb"),
            as_attachment=True,
            filename=invoice.pdf.name.split("/")[-1]
        )