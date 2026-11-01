# Venpide • Plataforma de Delivery, Restaurantes & Logística Urbana

<div align="center">
  <img src="public/logo.png" alt="Venpide Logo" width="120" height="120" />
  <h3>Delivery Express en Moto Taxi y CRM de WhatsApp con Meta Cloud API</h3>
  <p>Conectando restaurantes, comercios y usuarios con conductores calificados en tiempo récord.</p>
</div>

---

## 🚀 Características Principales

### 1. Panel CRM de WhatsApp & Despacho de Repartidores (`/admin/whatsapp`)
- **Sincronización Tridireccional en Tiempo Real**: Cliente ↔ Conductor Moto Taxi ↔ Central de Despacho (Admin).
- **Integración con Meta WhatsApp Cloud API (Graph API v21.0)**:
  - Webhook oficial (`/api/webhook/whatsapp`) para recepción de mensajes, ubicaciones y notas de voz.
  - Detección automática del remitente (si es cliente o conductor registrado) para reenviar la comunicación en tiempo real.
  - Monitoreo en vivo de conversaciones con burbujas de colores diferenciadas para cada rol.
- **Gestión Logística de Flota**:
  - Asignación y reasignación de motorizados a órdenes activas con un solo clic.
  - Base de datos de choferes con estatus (`available`, `busy`, `offline`), placas y tipo de vehículo.
  - Respuestas rápidas de central y notificaciones automáticas vía WhatsApp al chofer.
- **Simulador de Pruebas Integrado**: Permite testear el flujo completo de mensajería sin necesidad de aprobación previa de Meta.

### 2. Tienda & Catálogo de Restaurantes
- Exploración de menús, platos, promociones y adicionales.
- Carrito de compras y checkout optimizado con cálculo de delivery por distancia en tiempo real.
- Notificaciones en vivo de pedidos entrantes con alertas auditivas y push para el administrador.

---

## 🛠️ Tecnologías

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 18, Tailwind CSS, Lucide Icons
- **Base de Datos**: MongoDB Atlas & Mongoose
- **Integraciones**: Meta Cloud API (WhatsApp Business), Star Micronics POS Printing, ImageKit
- **Despliegue**: Vercel Cloud Native CI/CD

---

## 📦 Despliegue en Producción

El proyecto está optimizado para compilarse y desplegarse automáticamente en **Vercel** ante cada commit a la rama `main`.

© 2026 Venpide. Todos los derechos reservados.
