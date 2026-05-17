// frontend/lib/printer.ts

export async function printTicketWebUSB(orderData: any) {
  try {
    let device: any = null

    // Intenta auto-conectar con una impresora ya autorizada y seleccionada previamente en este navegador
    if (typeof window !== 'undefined' && 'usb' in navigator) {
      try {
        const preferredVendor = localStorage.getItem('pref_printer_vendor_id')
        const preferredProduct = localStorage.getItem('pref_printer_product_id')
        
        const authorizedDevices = await (navigator as any).usb.getDevices()
        
        if (preferredVendor && preferredProduct) {
          device = authorizedDevices.find((d: any) => 
            d.vendorId === Number(preferredVendor) && 
            d.productId === Number(preferredProduct)
          )
        }
        
        // Si no coincide con la preferida o no hay preferida, buscar cualquiera con interfaz clase 7 (Printer)
        if (!device) {
          device = authorizedDevices.find((d: any) => 
            d.configuration?.interfaces.some((iface: any) => 
              iface.alternate.interfaceClass === 7
            )
          )
        }
        
        // Fallback: primer dispositivo USB autorizado
        if (!device && authorizedDevices.length > 0) {
          device = authorizedDevices[0]
        }
      } catch (err) {
        console.warn('No se pudieron recuperar impresoras USB pre-autorizadas:', err)
      }
    }

    // Si no hay un dispositivo pre-autorizado, abre el diálogo de emparejamiento nativo
    if (!device) {
      device = await (navigator as any).usb.requestDevice({
        filters: [{ classCode: 7 }]
      })
    }

    await device.open()
    
    // Configurar interfaz y seleccionarla
    if (device.configuration === null) {
      await device.selectConfiguration(1)
    }
    const iface = device.configuration!.interfaces[0]
    await device.claimInterface(iface.interfaceNumber)

    // Encontrar el Endpoint OUT de escritura
    let outEndpoint: any | undefined
    for (const endpoint of iface.alternate.endpoints) {
      if (endpoint.direction === 'out') {
        outEndpoint = endpoint
        break
      }
    }

    if (!outEndpoint) {
      throw new Error('No out endpoint found on device')
    }

    // Guardar las credenciales del dispositivo preferido para auto-conectar directamente en el futuro
    if (device) {
      localStorage.setItem('pref_printer_vendor_id', device.vendorId.toString())
      localStorage.setItem('pref_printer_product_id', device.productId.toString())
    }

    // Construcción de comandos en formato binario ESC/POS
    const encoder = new TextEncoder()
    const commands: Uint8Array[] = []

    const addCommand = (str: string) => commands.push(encoder.encode(str))
    const addBytes = (bytes: number[]) => commands.push(new Uint8Array(bytes))

    // 1. Inicialización de Impresora
    addBytes([0x1B, 0x40])
    
    // 2. Alinear al Centro
    addBytes([0x1B, 0x61, 0x01])
    
    // 3. Estilo del Título: Doble Alto, Doble Ancho, Negrita
    addBytes([0x1B, 0x21, 0x30])
    addCommand("NATURAL BY NUTRIT\n")
    
    // 4. Resetear Estilo de Texto
    addBytes([0x1B, 0x21, 0x00])
    addCommand(`Sucursal ${orderData.branch?.name || 'Centro'}\n`)
    addCommand(`${new Date(orderData.createdAt).toLocaleString()}\n`)
    addCommand("========================================\n")
    
    // 5. Alinear a la Izquierda
    addBytes([0x1B, 0x61, 0x00])
    addCommand(`Folio:   ${orderData.orderNumber}\n`)
    addCommand(`Cajero:  ${orderData.cashier?.name || 'User'}\n`)
    if (orderData.customer) {
      addCommand(`Cliente: ${orderData.customer.name}\n`)
    }
    addCommand("========================================\n")
    
    // 6. Lista de Productos (Alineación optimizada para tickets de 80mm, 40 columnas de ancho)
    // Columnas: Cant (3) | Espacio (1) | Producto (25) | Espacio (1) | Total (10)
    addCommand("Cant Producto                  Total     \n")
    addCommand("----------------------------------------\n")
    for (const item of orderData.items) {
      const qty = item.quantity.toString().padEnd(3, ' ')
      const name = (item.product?.name || 'Producto').substring(0, 25).padEnd(25, ' ')
      const subtotal = `$${item.subtotal.toFixed(2)}`.padStart(10, ' ')
      addCommand(`${qty} ${name} ${subtotal}\n`)
    }
    addCommand("----------------------------------------\n")
    
    // 7. Totales (Alineación a la Derecha)
    addBytes([0x1B, 0x61, 0x02])
    addCommand(`Subtotal:  $${orderData.subtotal.toFixed(2)}\n`)
    if (orderData.discountAmount > 0) {
      addCommand(`Descuento: -$${orderData.discountAmount.toFixed(2)}\n`)
    }
    // Total con Negrita
    addBytes([0x1B, 0x45, 0x01]) // Negrita ON
    addCommand(`TOTAL:     $${orderData.total.toFixed(2)}\n`)
    addBytes([0x1B, 0x45, 0x00]) // Negrita OFF
    addCommand("\n")
    
    // 8. Métodos de Pago (Alineación a la Izquierda)
    addBytes([0x1B, 0x61, 0x00])
    addCommand("Formas de Pago:\n")
    for (const p of orderData.payments) {
      addCommand(`• ${p.method}: $${p.amount.toFixed(2)}\n`)
    }
    
    addCommand("\n")
    
    // 9. Pie de Ticket (Alinear al Centro)
    addBytes([0x1B, 0x61, 0x01])
    addCommand("¡Gracias por tu visita! 🌿\n")
    addCommand("Alimenta tu bienestar con Natural.\n")
    addCommand("www.naturalbynutrit.com\n")
    addCommand("\n\n\n\n")

    // 10. Corte de papel automático (Comando de corte total)
    addBytes([0x1D, 0x56, 0x41, 0x10])

    // Unir todos los buffers de comandos binarios
    const totalLength = commands.reduce((acc, val) => acc + val.length, 0)
    const payload = new Uint8Array(totalLength)
    let offset = 0
    for (const cmd of commands) {
      payload.set(cmd, offset)
      offset += cmd.length
    }

    // Transmitir datos al Endpoint USB
    await device.transferOut(outEndpoint.endpointNumber, payload)
    
    // Liberar y cerrar dispositivo USB
    await device.releaseInterface(iface.interfaceNumber)
    await device.close()
    
    return true
  } catch (error) {
    console.error('Print Error:', error)
    return false
  }
}
