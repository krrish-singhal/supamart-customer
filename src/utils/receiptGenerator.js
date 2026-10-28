import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';

export async function generateAndDownloadReceipt(order, customBizConfig = null) {
  if (!order) {
    Toast.show({ type: 'error', text1: 'Order details missing' });
    return;
  }

  try {
    Toast.show({ type: 'info', text1: 'Generating receipt PDF...', visibilityTime: 2000 });

    const orderNo = order.orderNo || order.id || 'N/A';
    const dateStr = order.createdAt
      ? new Date(order.createdAt).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : new Date().toLocaleDateString('en-IN');

    const address = order.addressSnapshot || order.address || {};
    const addressLine = [
      address.houseNo,
      address.street,
      address.landmark,
      address.city,
      address.pincode,
    ]
      .filter(Boolean)
      .join(', ') || 'Customer Delivery Address';

    const items = order.items || [];
    const subtotal = Number(order.subtotal || order.itemsTotal || 0).toFixed(2);
    const deliveryCharge = Number(order.deliveryCharge || order.deliveryFee || 0).toFixed(2);
    const handlingCharge = Number(order.handlingCharge || order.handlingFee || 0).toFixed(2);
    const discount = Number(order.discount || 0).toFixed(2);
    const total = Number(order.total || order.totalAmount || 0).toFixed(2);
    const paymentMethod = (order.paymentMethod || 'Online').replace(/_/g, ' ');
    const paymentStatus = order.paymentStatus || 'COMPLETED';

    const itemsHtml = items
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 8px; font-size: 13px; color: #1e293b;">${idx + 1}</td>
          <td style="padding: 10px 8px; font-size: 13px; color: #0f172a; font-weight: 600;">
            ${it.name || 'Product'}<br/>
            <span style="font-size: 11px; color: #64748b; font-weight: normal;">${it.variantLabel || it.unit || ''}</span>
          </td>
          <td style="padding: 10px 8px; font-size: 13px; text-align: center; color: #334155;">${it.qty || 1}</td>
          <td style="padding: 10px 8px; font-size: 13px; text-align: right; color: #334155;">₹${Number(it.price || 0).toFixed(2)}</td>
          <td style="padding: 10px 8px; font-size: 13px; text-align: right; color: #0f172a; font-weight: 700;">₹${(Number(it.price || 0) * Number(it.qty || 1)).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - Order #${orderNo}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 36px;
            color: #0f172a;
            background-color: #ffffff;
            font-size: 13px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #047857;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .store-name {
            font-size: 24px;
            font-weight: 800;
            color: #047857;
            margin: 0 0 4px 0;
            letter-spacing: -0.5px;
          }
          .store-tag {
            font-size: 11px;
            color: #64748b;
            margin: 0 0 8px 0;
          }
          .store-contact {
            font-size: 11px;
            color: #475569;
            line-height: 1.5;
          }
          .invoice-meta {
            text-align: right;
          }
          .invoice-title {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 6px 0;
          }
          .meta-pill {
            display: inline-block;
            background: #ecfdf5;
            color: #047857;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .meta-text {
            font-size: 12px;
            color: #64748b;
            margin: 2px 0;
          }
          .info-grid {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .info-col {
            width: 48%;
          }
          .info-label {
            font-size: 10px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin-bottom: 4px;
          }
          .info-val {
            font-size: 13px;
            color: #1e293b;
            font-weight: 600;
            line-height: 1.4;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background: #f1f5f9;
            color: #475569;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            padding: 10px 8px;
            text-align: left;
          }
          .totals-table {
            width: 320px;
            margin-left: auto;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .totals-table td {
            padding: 6px 8px;
            font-size: 13px;
          }
          .grand-total {
            border-top: 2px solid #047857;
            padding-top: 8px !important;
            font-size: 16px !important;
            font-weight: 800 !important;
            color: #047857 !important;
          }
          .footer {
            border-top: 1px dashed #cbd5e1;
            padding-top: 18px;
            text-align: center;
            color: #64748b;
            font-size: 11px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="store-name">MS Traders</h1>
            <div class="store-tag">Your Trusted Neighborhood Supermarket</div>
            <div class="store-contact">
              HV76+F39, Menamkulam, Thiruvananthapuram, Kerala 695582<br/>
              Phone: +91 90376 55180 | Email: hassanramla31@gmail.com
            </div>
          </div>
          <div class="invoice-meta">
            <div class="invoice-title">Tax Invoice / Receipt</div>
            <div class="meta-pill">${paymentStatus}</div>
            <div class="meta-text"><strong>Order:</strong> #${orderNo}</div>
            <div class="meta-text"><strong>Date:</strong> ${dateStr}</div>
            <div class="meta-text"><strong>Payment:</strong> ${paymentMethod}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-col">
            <div class="info-label">Delivered To</div>
            <div class="info-val">${address.name || order.userName || 'Customer'}</div>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">
              ${addressLine}
            </div>
            ${address.phone || order.userPhone ? `<div style="font-size: 11.5px; color: #64748b; margin-top: 4px;">Phone: ${address.phone || order.userPhone}</div>` : ''}
          </div>
          <div class="info-col">
            <div class="info-label">Order Details</div>
            <div class="info-val">Order #${orderNo}</div>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">Status: <strong>${order.status || 'Delivered'}</strong></div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 4px;">Items: ${items.length} product(s)</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Item Description</th>
              <th style="text-align: center; width: 60px;">Qty</th>
              <th style="text-align: right; width: 90px;">Rate</th>
              <th style="text-align: right; width: 100px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td style="color: #64748b;">Subtotal</td>
            <td style="text-align: right; font-weight: 600; color: #1e293b;">₹${subtotal}</td>
          </tr>
          ${
            Number(discount) > 0
              ? `<tr>
                  <td style="color: #047857;">Discount</td>
                  <td style="text-align: right; font-weight: 600; color: #047857;">-₹${discount}</td>
                </tr>`
              : ''
          }
          <tr>
            <td style="color: #64748b;">Delivery Charge</td>
            <td style="text-align: right; font-weight: 600; color: #1e293b;">${Number(deliveryCharge) > 0 ? `₹${deliveryCharge}` : 'FREE'}</td>
          </tr>
          ${
            Number(handlingCharge) > 0
              ? `<tr>
                  <td style="color: #64748b;">Handling Charge</td>
                  <td style="text-align: right; font-weight: 600; color: #1e293b;">₹${handlingCharge}</td>
                </tr>`
              : ''
          }
          <tr>
            <td class="grand-total">Total Amount</td>
            <td class="grand-total" style="text-align: right;">₹${total}</td>
          </tr>
        </table>

        <div class="footer">
          <strong>Thank you for choosing MS Traders!</strong><br/>
          For queries or assistance, contact us at hassanramla31@gmail.com or +91 90376 55180.<br/>
          This is a computer-generated invoice and does not require a physical signature.
        </div>
      </body>
      </html>
    `;

    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      Toast.show({ type: 'success', text1: 'Receipt opened for printing/saving' });
      return;
    }

    const { uri } = await Print.printToFileAsync({ html });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `MS Traders Receipt #${orderNo}`,
        UTI: 'com.adobe.pdf',
      });
      Toast.show({ type: 'success', text1: 'Receipt downloaded successfully' });
    } else {
      await Print.printAsync({ uri });
      Toast.show({ type: 'success', text1: 'Receipt opened' });
    }
  } catch (err) {
    console.error('Error generating receipt:', err);
    Toast.show({
      type: 'error',
      text1: 'Could not download receipt',
      text2: err.message || 'Please try again',
    });
  }
}
