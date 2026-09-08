# 💰 POSINNOVATE FINANZAS PERSONALES & CONTROL DE GASTOS

Sistema web y móvil (PWA) diseñado con la arquitectura y estética de **PosInnovate** para erradicar las fugas invisibles de dinero ("gastos hormiga"), administrar tus ingresos (> \$2.000.000 COP), presupuestar el apoyo familiar (\$350.000 COP a papás) y proyectar metas financieras con cálculo en tiempo real de **Gasto Diario Seguro**.

Soporta **Multi-Usuario con roles**, permitiendo que tú como **ADMIN** crees accesos independientes para tus amigos con aislamiento total de datos.

---

## 🚀 Características Principales

1. **⚡ Registro Ultra Rápido (Mobile First):**
   - Modal táctil optimizado para celular para registrar gastos en menos de 5 segundos.
   - Presets de montos rápidos (+5k, +10k, +20k, +50k, +100k).
   - Métodos de pago colombianos: Nequi, Daviplata, Efectivo, Tarjeta, Bancolombia.

2. **🔥 Límite de Gasto Diario Seguro (Safe Daily Spend):**
   - Calcula automáticamente: $\text{Saldo disponible} \div \text{Días restantes para el pago}$.
   - Diagnóstico en tiempo real: Si te quedan \$200.000 y faltan 22 días, te restringe a un máximo seguro de \$9.090 COP/día para no llegar en ceros.
   - Alerta de Ritmo de Gasto (Burn Rate): te avisa si a tu ritmo actual te quedarás sin dinero antes del fin de mes.

3. **🚦 Grupos de Gasto con Presupuestos Semáforo:**
   - 🟢 Verde (<70% del estimado mensual consumido).
   - 🟡 Amarillo (70%-90% del estimado: alerta de desaceleración).
   - 🔴 Rojo (>90% o superado: advertencia inmediata de sobregasto).
   - Incluye grupos precargados: Hogar & Papás (\$350k fijo), Alimentación, Gastos Hormiga, Transporte, Ocio, Suscripciones, Ahorro.

4. **🎯 Metas & Calculadora Inversa ("¿Cuánto debo ganar?"):**
   - Define metas de ahorro (Fondo de emergencia, Moto, Viaje) y abona fondos.
   - Calculadora: Ingresa tus gastos fijos + gastos de vida + ahorro deseado $\to$ calcula exactamente el salario o ingreso neto necesario.

5. **👥 Multi-Usuario & Roles (Admin & Amigos):**
   - **Tú (ADMIN):** Acceso completo a tus finanzas y a un panel de administración para crear cuentas a tus amigos.
   - **Tus Amigos (USER):** Cuentas 100% privadas. Nadie ve los gastos de los demás.

---

## 🔑 Credenciales Iniciales

- **Correo:** `admin@posinnovate.com`
- **Contraseña:** `admin123`
- **Rol:** `ADMIN`

---

## 💻 Ejecución Local

1. Entrar al directorio del proyecto:
   ```bash
   cd /home/michael/.gemini/antigravity/scratch/posinnovate-finance
   ```

2. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Abrir en tu navegador o celular conectado a tu red local:
   ```
   http://localhost:3005
   ```

---

## 📱 Cómo usarlo desde tu Celular como App (PWA)

1. Abre la URL en el navegador de tu celular (Safari en iPhone o Chrome en Android).
2. En el menú del navegador:
   - **En iPhone (Safari):** Toca el botón **Compartir** $\to$ selecciona **"Añadir a la pantalla de inicio"**.
   - **En Android (Chrome):** Toca los tres puntos $\to$ selecciona **"Instalar aplicación"** o **"Añadir a pantalla de inicio"**.
3. Se creará el icono de **PosInnovate Finanzas** en tu pantalla principal y abrirá en pantalla completa sin barra de navegación del navegador, como una app nativa.

---

## ☁️ Despliegue en la Nube (Gratis)

- **Vercel:** Sube el repositorio a GitHub e impórtalo en [Vercel](https://vercel.com).
- **Railway / Render:** Puedes desplegarlo directamente vinculando tu repositorio GitHub para tener persistencia en SQLite o conectar con Neon PostgreSQL.
