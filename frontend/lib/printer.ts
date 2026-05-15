// frontend/lib/printer.ts

export async function printTicketWebUSB(orderData: any) {
  try {
    // Request a generic USB printer (class 7)
    const device = await (navigator as any).usb.requestDevice({
      filters: [{ classCode: 7 }]
    })

    await device.open()
    
    // Select configuration and interface
    if (device.configuration === null) {
      await device.selectConfiguration(1)
    }
    const iface = device.configuration!.interfaces[0]
    await device.claimInterface(iface.interfaceNumber)

    // Find the out endpoint
    let outEndpoint: USBEndpoint | undefined
    for (const endpoint of iface.alternate.endpoints) {
      if (endpoint.direction === 'out') {
        outEndpoint = endpoint
        break
      }
    }

    if (!outEndpoint) {
      throw new Error('No out endpoint found on device')
    }

    // Build ESC/POS data
    const encoder = new TextEncoder()
    const commands: Uint8Array[] = []

    const addCommand = (str: string) => commands.push(encoder.encode(str))
    const addBytes = (bytes: number[]) => commands.push(new Uint8Array(bytes))

    // Init
    addBytes([0x1B, 0x40])
    
    // Center Align
    addBytes([0x1B, 0x61, 0x01])
    
    addCommand("NATURAL BY NUTRIT\n")
    addCommand(`Sucursal ${orderData.branch?.name || 'Centro'}\n`)
    addCommand(`${new Date(orderData.createdAt).toLocaleString()}\n`)
    addCommand("--------------------------------\n")
    
    // Left Align
    addBytes([0x1B, 0x61, 0x00])
    addCommand(`Folio: ${orderData.orderNumber}\n`)
    addCommand(`Cajero: ${orderData.cashier?.name || 'User'}\n`)
    if (orderData.customer) {
      addCommand(`Cliente: ${orderData.customer.name}\n`)
    }
    addCommand("--------------------------------\n")
    
    // Items
    for (const item of orderData.items) {
      const qty = item.quantity.toString().padEnd(3, ' ')
      const name = (item.product?.name || 'Producto').substring(0, 16).padEnd(16, ' ')
      const subtotal = `$${item.subtotal.toFixed(2)}`.padStart(10, ' ')
      addCommand(`${qty} ${name} ${subtotal}\n`)
    }
    
    addCommand("--------------------------------\n")
    
    // Right Align
    addBytes([0x1B, 0x61, 0x02])
    addCommand(`Subtotal: $${orderData.subtotal.toFixed(2)}\n`)
    if (orderData.discountAmount > 0) {
      addCommand(`Descuento: -$${orderData.discountAmount.toFixed(2)}\n`)
    }
    addCommand(`TOTAL: $${orderData.total.toFixed(2)}\n`)
    addCommand("\n")
    
    // Left Align
    addBytes([0x1B, 0x61, 0x00])
    addCommand("Pagos:\n")
    for (const p of orderData.payments) {
      addCommand(`${p.method}: $${p.amount.toFixed(2)}\n`)
    }
    
    addCommand("\n")
    // Center Align
    addBytes([0x1B, 0x61, 0x01])
    addCommand("Gracias por tu visita!\n")
    addCommand("www.naturalbynutrit.com\n")
    addCommand("\n\n\n")

    // Cut paper
    addBytes([0x1D, 0x56, 0x41, 0x10])

    // Combine all commands
    const totalLength = commands.reduce((acc, val) => acc + val.length, 0)
    const payload = new Uint8Array(totalLength)
    let offset = 0
    for (const cmd of commands) {
      payload.set(cmd, offset)
      offset += cmd.length
    }

    await device.transferOut(outEndpoint.endpointNumber, payload)
    
    // Close
    await device.releaseInterface(iface.interfaceNumber)
    await device.close()
    
    return true
  } catch (error) {
    console.error('Print Error:', error)
    return false
  }
}
