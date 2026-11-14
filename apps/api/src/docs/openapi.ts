import { parse } from 'yaml';

const spec = String.raw`
openapi: 3.0.3
info:
  title: Gofest Ticketing API
  version: 0.1.0
  description: >-
    REST API untuk platform tiket Gofest. Semua endpoint berada di bawah prefix
    /api/v1. Respons sukses memakai envelope { success: true, data, meta } dan
    respons gagal memakai { success: false, data: null, meta: null, error }.

    Autentikasi pengguna memakai cookie HttpOnly access_token (15 menit) dan
    refresh_token (7 hari, dirotasi setiap refresh). Endpoint yang ditandai
    cookieAuth membutuhkan cookie tersebut. Endpoint order tamu memakai header
    x-order-token atau query token yang dikembalikan saat checkout.

    Permintaan mutasi dari browser wajib menyertakan Origin yang sama dengan
    WEB_URL. Webhook pembayaran dikecualikan dari pemeriksaan Origin dan
    memverifikasi signature pada raw body.
  contact:
    name: Gofest
servers:
  - url: http://localhost:4000/api/v1
    description: Local development
  - url: https://api.gofest.example/api/v1
    description: Production (placeholder domain)
tags:
  - name: Auth
    description: Registrasi, login, sesi, profil, dan reset password.
  - name: Public
    description: Discovery event, kategori, dan profil organizer publik.
  - name: Orders
    description: Checkout, pembayaran, tiket, dan QR.
  - name: Organizer account
    description: Pendaftaran organizer dan profil organisasi.
  - name: Organizer workspace
    description: Pengelolaan event, tiket, kupon, staf, order, dan check-in.
  - name: Uploads
    description: Unggah gambar publik (cover event, logo organizer).
  - name: Staff
    description: Akses petugas check-in.
  - name: Check-in
    description: Pemindaian tiket dan ringkasan kehadiran.
  - name: Admin
    description: Moderasi, pengguna, transaksi, kategori, pengaturan, audit.
  - name: Webhooks
    description: Callback pembayaran dari provider.
  - name: System
    description: Health check dan dokumentasi.

paths:
  /health:
    get:
      tags: [System]
      summary: Health check API dan database
      operationId: getHealth
      responses:
        '200':
          description: API dan database sehat.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'
        '503':
          description: Database tidak dapat dijangkau.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'

  /auth/register:
    post:
      tags: [Auth]
      summary: Membuat akun baru
      operationId: register
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, email, password]
              properties:
                name: { type: string, minLength: 2, maxLength: 120, example: Nadia Prameswari }
                email: { type: string, format: email, example: nadia@example.com }
                password: { type: string, minLength: 8, maxLength: 72, format: password }
                phone: { type: string, nullable: true, example: '081234567890' }
      responses:
        '201':
          description: Akun dibuat dan sesi aktif. Cookie access_token dan refresh_token dikirim.
          headers:
            Set-Cookie:
              schema: { type: string }
              description: access_token dan refresh_token sebagai cookie HttpOnly.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '409':
          description: Email sudah terdaftar (EMAIL_ALREADY_REGISTERED).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '422':
          description: Validasi gagal.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/RateLimited'

  /auth/login:
    post:
      tags: [Auth]
      summary: Login dengan email dan password
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string, format: email }
                password: { type: string, format: password }
                rememberMe: { type: boolean, default: false }
      responses:
        '200':
          description: Login berhasil. Cookie sesi dikirim.
          headers:
            Set-Cookie:
              schema: { type: string }
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          description: Kredensial salah (INVALID_CREDENTIALS) atau akun tidak aktif.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '429':
          $ref: '#/components/responses/RateLimited'

  /auth/refresh:
    post:
      tags: [Auth]
      summary: Rotasi refresh token dan perbarui access token
      operationId: refreshSession
      security:
        - refreshCookie: []
      responses:
        '200':
          description: Sesi diperbarui.
          headers:
            Set-Cookie:
              schema: { type: string }
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          description: >-
            Sesi tidak valid, kedaluwarsa, sudah dicabut, atau token lama dipakai
            ulang (SESSION_REUSED). Pemakaian ulang mencabut seluruh sesi pengguna.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'

  /auth/logout:
    post:
      tags: [Auth]
      summary: Logout dan cabut sesi refresh
      operationId: logout
      security:
        - refreshCookie: []
      responses:
        '200':
          description: Sesi dicabut dan cookie dibersihkan.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimpleSuccess'

  /auth/forgot-password:
    post:
      tags: [Auth]
      summary: Meminta tautan reset password
      operationId: forgotPassword
      description: Respons selalu generik agar keberadaan email tidak bocor.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email]
              properties:
                email: { type: string, format: email }
      responses:
        '200':
          description: Permintaan diterima. Email dikirim melalui outbox bila akun ada.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimpleSuccess'
        '429':
          $ref: '#/components/responses/RateLimited'

  /auth/reset-password:
    post:
      tags: [Auth]
      summary: Mengganti password dengan token reset
      operationId: resetPassword
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [token, password]
              properties:
                token: { type: string, minLength: 20 }
                password: { type: string, minLength: 8, maxLength: 72, format: password }
      responses:
        '200':
          description: Password diganti dan sesi lama dicabut.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimpleSuccess'
        '422':
          description: Token tidak valid atau kedaluwarsa (INVALID_RESET_TOKEN).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'

  /auth/me:
    get:
      tags: [Auth]
      summary: Profil dan permission pengguna saat ini
      operationId: getMe
      security:
        - cookieAuth: []
      responses:
        '200':
          description: Profil pengguna beserta status organizer.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MeResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /auth/profile:
    patch:
      tags: [Auth]
      summary: Memperbarui nama dan nomor telepon
      operationId: updateProfile
      security:
        - cookieAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string, minLength: 2, maxLength: 120 }
                phone: { type: string, nullable: true, example: '081234567890' }
      responses:
        '200':
          description: Profil diperbarui.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MeResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '422':
          $ref: '#/components/responses/ValidationError'

  /events:
    get:
      tags: [Public]
      summary: Mencari event publik
      operationId: listPublicEvents
      description: >-
        Hanya event berstatus PUBLISHED yang tampil. Filter dapat dibagikan
        melalui URL. Event sold out tetap tampil dengan status ketersediaan.
      parameters:
        - name: q
          in: query
          schema: { type: string, maxLength: 120 }
          description: Judul, organizer, kota, atau kategori.
        - { name: category, in: query, schema: { type: string }, description: Slug kategori. }
        - { name: city, in: query, schema: { type: string, maxLength: 80 } }
        - { name: dateFrom, in: query, schema: { type: string, format: date-time } }
        - { name: dateTo, in: query, schema: { type: string, format: date-time } }
        - { name: price, in: query, schema: { type: string, enum: [all, free, paid], default: all } }
        - { name: availability, in: query, schema: { type: string, enum: [all, available, sold_out], default: all } }
        - { name: sort, in: query, schema: { type: string, enum: [starts_soon, published_newest], default: starts_soon } }
        - { name: page, in: query, schema: { type: integer, minimum: 1, default: 1 } }
        - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 50, default: 12 } }
      responses:
        '200':
          description: Daftar event publik.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EventListResponse'
        '422':
          $ref: '#/components/responses/ValidationError'

  /events/{slug}:
    get:
      tags: [Public]
      summary: Detail event publik
      operationId: getPublicEvent
      parameters:
        - $ref: '#/components/parameters/EventSlug'
      responses:
        '200':
          description: Detail event. Akses online tidak dikirim sebelum waktunya.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EventDetailResponse'
        '404':
          $ref: '#/components/responses/NotFound'

  /events/{slug}/ticket-types:
    get:
      tags: [Public]
      summary: Tipe tiket yang dapat dijual
      operationId: listPublicTicketTypes
      parameters:
        - $ref: '#/components/parameters/EventSlug'
      responses:
        '200':
          description: Daftar tipe tiket aktif beserta ketersediaan.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TicketTypeListResponse'
        '404':
          $ref: '#/components/responses/NotFound'

  /categories:
    get:
      tags: [Public]
      summary: Kategori event aktif
      operationId: listCategories
      responses:
        '200':
          description: Daftar kategori aktif.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CategoryListResponse'

  /organizers/{slug}:
    get:
      tags: [Public]
      summary: Profil organizer publik
      operationId: getPublicOrganizer
      parameters:
        - { name: slug, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: Profil organizer dan event publiknya.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizerDetailResponse'
        '404':
          $ref: '#/components/responses/NotFound'

  /orders:
    post:
      tags: [Orders]
      summary: Membuat order dan mereservasi tiket
      operationId: createOrder
      description: >-
        Harga, diskon, dan biaya platform dihitung di server. Reservasi kuota
        bersifat atomik. Idempotency key yang sama mengembalikan order yang sama.
        Order gratis langsung diterbitkan tanpa pembayaran.
      security:
        - cookieAuth: []
        - {}
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderInput'
      responses:
        '201':
          description: Order dibuat. accessToken hanya dikembalikan sekali di respons ini.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreateOrderResponse'
        '409':
          description: >-
            Kuota habis (TICKET_SOLD_OUT), kupon tidak memenuhi syarat, atau
            idempotency bentrok (IDEMPOTENCY_CONFLICT).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorEnvelope'
        '422':
          $ref: '#/components/responses/ValidationError'
        '429':
          $ref: '#/components/responses/RateLimited'

  /orders/{orderCode}/status:
    get:
      tags: [Orders]
      summary: Status order dan tiket
      operationId: getOrderStatus
      security:
        - orderToken: []
        - cookieAuth: []
        - {}
      parameters:
        - $ref: '#/components/parameters/OrderCode'
        - $ref: '#/components/parameters/OrderTokenQuery'
      responses:
        '200':
          description: Status order. qrImageKey tidak pernah dikirim ke klien.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderDetailResponse'
        '401':
          $ref: '#/components/responses/OrderAccessDenied'
        '404':
          $ref: '#/components/responses/NotFound'

  /orders/{orderCode}/tickets:
    get:
      tags: [Orders]
      summary: Daftar tiket dengan URL QR
      operationId: getOrderTickets
      security:
        - orderToken: []
        - cookieAuth: []
        - {}
      parameters:
        - $ref: '#/components/parameters/OrderCode'
        - $ref: '#/components/parameters/OrderTokenQuery'
      responses:
        '200':
          description: Tiket beserta qrUrl yang memuat token akses.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TicketListResponse'
        '401':
          $ref: '#/components/responses/OrderAccessDenied'
        '404':
          $ref: '#/components/responses/NotFound'

  /orders/{orderCode}/tickets/{ticketId}/qr:
    get:
      tags: [Orders]
      summary: Mengunduh gambar QR tiket
      operationId: getTicketQr
      security:
        - orderToken: []
        - cookieAuth: []
        - {}
      parameters:
        - $ref: '#/components/parameters/OrderCode'
        - { name: ticketId, in: path, required: true, schema: { type: string } }
        - $ref: '#/components/parameters/OrderTokenQuery'
      responses:
        '200':
          description: PNG QR privat.
          content:
            image/png:
              schema: { type: string, format: binary }
        '401':
          $ref: '#/components/responses/OrderAccessDenied'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: Tiket sudah dibatalkan atau di-refund (TICKET_INVALID).

  /orders/{orderCode}/tickets/{ticketId}/qr/regenerate:
    post:
      tags: [Orders]
      summary: Membuat ulang token dan gambar QR tiket
      operationId: regenerateTicketQr
      description: Hanya untuk tiket VALID pada order PAID. Token dan file lama diganti.
      security:
        - orderToken: []
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/OrderCode'
        - { name: ticketId, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: QR baru dibuat.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TicketQrResponse'
        '401':
          $ref: '#/components/responses/OrderAccessDenied'
        '409':
          description: Order belum dibayar atau tiket tidak dapat diperbarui (TICKET_NOT_REGENERATABLE).

  /orders/{orderCode}/payment:
    post:
      tags: [Orders]
      summary: Membuat sesi pembayaran
      operationId: createPaymentSession
      description: >-
        Pada development, provider mock mengembalikan instruksi dan
        providerReference MOCK-<orderCode>. Provider asli akan diisi melalui adapter.
      security:
        - orderToken: []
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/OrderCode'
      responses:
        '200':
          description: Sesi pembayaran dibuat.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentSessionResponse'
        '401':
          $ref: '#/components/responses/OrderAccessDenied'
        '409':
          description: Order tidak dapat dibayar (ORDER_NOT_PAYABLE / ORDER_EXPIRED).
        '429':
          $ref: '#/components/responses/RateLimited'

  /orders/{orderCode}/mock-pay:
    post:
      tags: [Orders]
      summary: Simulasi pembayaran (development saja)
      operationId: mockPayOrder
      description: >-
        Hanya tersedia saat PAYMENT_PROVIDER=mock. Di production endpoint ini
        ditolak. Webhook tetap diproses melalui endpoint webhook.
      security:
        - orderToken: []
      parameters:
        - $ref: '#/components/parameters/OrderCode'
      responses:
        '200':
          description: Pembayaran mock diproses.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimpleSuccess'
        '404':
          description: Provider mock tidak aktif.
        '409':
          description: Order tidak dapat dibayar.

  /account/orders:
    get:
      tags: [Orders]
      summary: Riwayat order milik pengguna login
      operationId: listAccountOrders
      security:
        - cookieAuth: []
      parameters:
        - { name: page, in: query, schema: { type: integer, minimum: 1, default: 1 } }
        - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 50, default: 10 } }
      responses:
        '200':
          description: Daftar order milik pengguna.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AccountOrderListResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /organizer/account/apply:
    post:
      tags: [Organizer account]
      summary: Mendaftar sebagai organizer
      operationId: applyOrganizer
      security:
        - cookieAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [organizationName, slug, description]
              properties:
                organizationName: { type: string, minLength: 2, maxLength: 120 }
                slug: { type: string, pattern: '^[a-z0-9-]+$' }
                description: { type: string, minLength: 20, maxLength: 2000 }
                contactEmail: { type: string, format: email }
                contactPhone: { type: string }
                websiteUrl: { type: string, format: uri, nullable: true }
                logoKey: { type: string, nullable: true }
      responses:
        '201':
          description: Pengajuan dibuat dengan status PENDING.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizerProfileResponse'
        '409':
          description: Pengajuan sudah ada atau slug dipakai (ORGANIZER_ALREADY_EXISTS / ORGANIZER_SLUG_TAKEN).

  /organizer/account/profile:
    get:
      tags: [Organizer account]
      summary: Profil organizer milik pengguna
      operationId: getOrganizerProfile
      security:
        - cookieAuth: []
      responses:
        '200':
          description: Profil organizer.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizerProfileResponse'
        '404':
          description: Belum mendaftar sebagai organizer.
    patch:
      tags: [Organizer account]
      summary: Memperbarui profil organizer
      operationId: updateOrganizerProfile
      security:
        - cookieAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                organizationName: { type: string, minLength: 2, maxLength: 120 }
                slug: { type: string }
                description: { type: string, maxLength: 2000 }
                contactEmail: { type: string, format: email, nullable: true }
                contactPhone: { type: string, nullable: true }
                websiteUrl: { type: string, format: uri, nullable: true }
                logoKey: { type: string, nullable: true }
      responses:
        '200':
          description: Profil diperbarui.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizerProfileResponse'
        '409':
          description: Organizer tidak dapat diedit pada status saat ini.

  /organizer/dashboard:
    get:
      tags: [Organizer workspace]
      summary: Ringkasan penjualan dan operasional organizer
      operationId: getOrganizerDashboard
      security:
        - cookieAuth: []
      responses:
        '200':
          description: Agregat event, order, pendapatan, dan check-in.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizerDashboardResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          description: Organizer belum aktif (ORGANIZER_NOT_ACTIVE).

  /organizer/events:
    get:
      tags: [Organizer workspace]
      summary: Daftar event milik organizer
      operationId: listOrganizerEvents
      security:
        - cookieAuth: []
      parameters:
        - { name: q, in: query, schema: { type: string } }
        - { name: status, in: query, schema: { $ref: '#/components/schemas/EventStatus' } }
        - { name: page, in: query, schema: { type: integer, minimum: 1, default: 1 } }
        - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 50, default: 10 } }
      responses:
        '200':
          description: Daftar event dengan status dan penjualan.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EventListResponse'
    post:
      tags: [Organizer workspace]
      summary: Membuat event draft
      operationId: createEvent
      security:
        - cookieAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EventInput'
      responses:
        '201':
          description: Event draft dibuat.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EventDetailResponse'
        '409':
          description: Slug sudah dipakai (EVENT_SLUG_TAKEN).
        '422':
          $ref: '#/components/responses/ValidationError'

  /organizer/events/{id}:
    get:
      tags: [Organizer workspace]
      summary: Detail event milik organizer
      operationId: getOrganizerEvent
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: Detail event lengkap.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EventDetailResponse'
        '403':
          description: Event bukan milik organizer (EVENT_NOT_OWNED).
        '404':
          $ref: '#/components/responses/NotFound'
    patch:
      tags: [Organizer workspace]
      summary: Memperbarui event
      operationId: updateEvent
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EventInput'
      responses:
        '200':
          description: Event diperbarui.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EventDetailResponse'
        '403':
          description: Event bukan milik organizer.
        '409':
          description: Perubahan tidak diizinkan pada status saat ini atau slug bentrok.
        '422':
          $ref: '#/components/responses/ValidationError'
    delete:
      tags: [Organizer workspace]
      summary: Menghapus event draft/rejected tanpa order
      operationId: deleteEvent
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: Event dihapus.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimpleSuccess'
        '409':
          description: Event tidak dapat dihapus (EVENT_NOT_DELETABLE).

  /organizer/events/{id}/submit:
    post:
      tags: [Organizer workspace]
      summary: Mengajukan event untuk review atau publikasi
      operationId: submitEvent
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: >-
            Status menjadi PENDING_REVIEW bila review wajib, atau PUBLISHED bila
            review tidak wajib.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EventDetailResponse'
        '409':
          description: Event tidak dapat diajukan (EVENT_NOT_SUBMITTABLE / EVENT_NEEDS_TICKET_TYPE).

  /organizer/events/{id}/cancel:
    post:
      tags: [Organizer workspace]
      summary: Membatalkan event dan menandai order untuk refund
      operationId: cancelEvent
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [reason]
              properties:
                reason: { type: string, minLength: 10, maxLength: 1000 }
      responses:
        '200':
          description: Event dibatalkan. Tiket VALID menjadi CANCELLED dan order PAID menjadi REFUND_PENDING.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimpleSuccess'
        '409':
          description: Event sudah ditutup (EVENT_ALREADY_CLOSED).

  /organizer/events/{eventId}/ticket-types:
    get:
      tags: [Organizer workspace]
      summary: Daftar tipe tiket event
      operationId: listTicketTypes
      security:
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/EventId'
      responses:
        '200':
          description: Tipe tiket event.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TicketTypeListResponse'
    post:
      tags: [Organizer workspace]
      summary: Menambah tipe tiket
      operationId: createTicketType
      security:
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/EventId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TicketTypeInput'
      responses:
        '201':
          description: Tipe tiket dibuat.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TicketTypeResponse'
        '409':
          description: Kuota lebih kecil dari tiket terjual atau nama bentrok.
        '422':
          $ref: '#/components/responses/ValidationError'

  /organizer/ticket-types/{id}:
    patch:
      tags: [Organizer workspace]
      summary: Memperbarui tipe tiket
      operationId: updateTicketType
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TicketTypeInput'
      responses:
        '200':
          description: Tipe tiket diperbarui.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TicketTypeResponse'
        '409':
          description: Perubahan melanggar kuota terjual.
    delete:
      tags: [Organizer workspace]
      summary: Menonaktifkan tipe tiket
      operationId: deactivateTicketType
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: Tipe tiket dinonaktifkan (tidak dihapus karena histori order).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TicketTypeResponse'

  /organizer/events/{eventId}/coupons:
    get:
      tags: [Organizer workspace]
      summary: Daftar kupon event
      operationId: listCoupons
      security:
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/EventId'
      responses:
        '200':
          description: Kupon event.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CouponListResponse'
    post:
      tags: [Organizer workspace]
      summary: Membuat kupon
      operationId: createCoupon
      security:
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/EventId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CouponInput'
      responses:
        '201':
          description: Kupon dibuat.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CouponResponse'
        '409':
          description: Kode kupon sudah dipakai (COUPON_CODE_TAKEN).
        '422':
          $ref: '#/components/responses/ValidationError'

  /organizer/coupons/{id}:
    patch:
      tags: [Organizer workspace]
      summary: Memperbarui kupon
      operationId: updateCoupon
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CouponInput'
      responses:
        '200':
          description: Kupon diperbarui.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CouponResponse'
        '404':
          $ref: '#/components/responses/NotFound'
    delete:
      tags: [Organizer workspace]
      summary: Menonaktifkan kupon
      operationId: deactivateCoupon
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: Kupon dinonaktifkan.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CouponResponse'

  /organizer/events/{eventId}/staff:
    get:
      tags: [Organizer workspace]
      summary: Daftar staf event
      operationId: listStaff
      security:
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/EventId'
      responses:
        '200':
          description: Staf yang ditugaskan.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StaffListResponse'
    post:
      tags: [Organizer workspace]
      summary: Menugaskan staf berdasarkan email
      operationId: addStaff
      security:
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/EventId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email]
              properties:
                email: { type: string, format: email }
                role: { type: string, enum: [CHECK_IN, MANAGER], default: CHECK_IN }
      responses:
        '201':
          description: Staf ditugaskan.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StaffListResponse'
        '404':
          description: Pengguna dengan email tersebut tidak ditemukan.

  /organizer/events/{eventId}/staff/{staffId}:
    delete:
      tags: [Organizer workspace]
      summary: Menghapus penugasan staf
      operationId: removeStaff
      security:
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/EventId'
        - { name: staffId, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: Penugasan dihapus.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimpleSuccess'
        '404':
          $ref: '#/components/responses/NotFound'

  /organizer/events/{eventId}/orders:
    get:
      tags: [Organizer workspace]
      summary: Daftar order event
      operationId: listEventOrders
      security:
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/EventId'
        - { name: q, in: query, schema: { type: string } }
        - { name: status, in: query, schema: { $ref: '#/components/schemas/OrderStatus' } }
        - { name: page, in: query, schema: { type: integer, default: 1 } }
        - { name: limit, in: query, schema: { type: integer, default: 10 } }
      responses:
        '200':
          description: Order event.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderListResponse'
        '403':
          description: Event bukan milik organizer (EVENT_NOT_OWNED).

  /organizer/events/{eventId}/tickets:
    get:
      tags: [Organizer workspace]
      summary: Daftar tiket event
      operationId: listEventTickets
      security:
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/EventId'
        - { name: q, in: query, schema: { type: string } }
        - { name: status, in: query, schema: { type: string, enum: [VALID, CHECKED_IN, CANCELLED, REFUNDED] } }
        - { name: page, in: query, schema: { type: integer, default: 1 } }
        - { name: limit, in: query, schema: { type: integer, default: 10 } }
      responses:
        '200':
          description: Tiket event dengan status check-in.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TicketListResponse'
        '403':
          description: Event bukan milik organizer.

  /organizer/events/{eventId}/attendees/export:
    get:
      tags: [Organizer workspace]
      summary: Ekspor peserta sebagai CSV
      operationId: exportAttendees
      security:
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/EventId'
      responses:
        '200':
          description: File CSV peserta.
          headers:
            Content-Disposition:
              schema: { type: string }
          content:
            text/csv:
              schema: { type: string }
        '403':
          description: Event bukan milik organizer.

  /organizer/events/{eventId}/check-in/summary:
    get:
      tags: [Organizer workspace]
      summary: Ringkasan check-in event
      operationId: getOrganizerCheckInSummary
      security:
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/EventId'
      responses:
        '200':
          description: Statistik kehadiran dan pemindaian terakhir.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CheckInSummaryResponse'
        '403':
          description: Event bukan milik organizer.

  /uploads:
    post:
      tags: [Uploads]
      summary: Unggah gambar publik
      operationId: uploadImage
      security:
        - cookieAuth: []
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [file]
              properties:
                file:
                  type: string
                  format: binary
                  description: JPG, PNG, atau WebP maksimal MAX_UPLOAD_SIZE_MB.
                scope:
                  type: string
                  enum: [events, organizers]
                  default: events
      responses:
        '201':
          description: Gambar dikonversi ke WebP dan disimpan.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UploadResponse'
        '422':
          description: Format atau ukuran file tidak valid.

  /staff/events:
    get:
      tags: [Staff]
      summary: Event tempat pengguna bertugas atau memiliki akses
      operationId: listStaffEvents
      security:
        - cookieAuth: []
      responses:
        '200':
          description: Daftar event dengan accessRole OWNER, CHECK_IN, atau MANAGER.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StaffEventListResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /check-in/scan:
    post:
      tags: [Check-in]
      summary: Memindai tiket
      operationId: scanTicket
      description: >-
        Hasil bisnis selalu HTTP 200 dengan field result: VALID, ALREADY_USED,
        INVALID, CANCELLED, atau WRONG_EVENT. Hanya satu perangkat yang dapat
        mengubah tiket VALID menjadi CHECKED_IN. Idempotency key mengembalikan
        hasil yang sama tanpa mencatat log baru.
      security:
        - cookieAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [eventId]
              properties:
                eventId: { type: string }
                token: { type: string, minLength: 20, maxLength: 500, description: Isi QR. Salah satu dari token atau ticketCode wajib. }
                ticketCode: { type: string, minLength: 4, maxLength: 40 }
                gate: { type: string, maxLength: 40, example: Pintu A }
                idempotencyKey: { type: string, minLength: 8, maxLength: 100 }
      responses:
        '200':
          description: Hasil pemindaian.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ScanResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          description: Pengguna tidak ditugaskan pada event (CHECK_IN_NOT_ASSIGNED).
        '422':
          $ref: '#/components/responses/ValidationError'
        '429':
          $ref: '#/components/responses/RateLimited'

  /check-in/events/{eventId}/summary:
    get:
      tags: [Check-in]
      summary: Ringkasan check-in untuk staf
      operationId: getStaffCheckInSummary
      security:
        - cookieAuth: []
      parameters:
        - $ref: '#/components/parameters/EventId'
      responses:
        '200':
          description: Statistik kehadiran event.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CheckInSummaryResponse'
        '403':
          description: Pengguna tidak ditugaskan pada event.

  /admin/dashboard:
    get:
      tags: [Admin]
      summary: Ringkasan operasional platform
      operationId: getAdminDashboard
      security:
        - cookieAuth: []
      responses:
        '200':
          description: Agregat pengguna, organizer, event, order, tiket, dan audit.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminDashboardResponse'
        '403':
          description: Bukan admin (ADMIN_ONLY).

  /admin/users:
    get:
      tags: [Admin]
      summary: Mencari pengguna
      operationId: listAdminUsers
      security:
        - cookieAuth: []
      parameters:
        - { name: q, in: query, schema: { type: string } }
        - { name: status, in: query, schema: { type: string, enum: [ACTIVE, PENDING_VERIFICATION, SUSPENDED, DELETED] } }
        - { name: page, in: query, schema: { type: integer, default: 1 } }
        - { name: limit, in: query, schema: { type: integer, default: 10 } }
      responses:
        '200':
          description: Daftar pengguna.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminUserListResponse'

  /admin/users/{id}:
    get:
      tags: [Admin]
      summary: Detail pengguna
      operationId: getAdminUser
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: Detail pengguna, order, dan penugasan staf.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminUserDetailResponse'
        '404':
          $ref: '#/components/responses/NotFound'

  /admin/users/{id}/status:
    patch:
      tags: [Admin]
      summary: Mengubah status pengguna
      operationId: updateUserStatus
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status: { type: string, enum: [ACTIVE, PENDING_VERIFICATION, SUSPENDED, DELETED] }
                note: { type: string, maxLength: 1000, description: Wajib untuk SUSPENDED. }
      responses:
        '200':
          description: Status diperbarui. Suspend mencabut sesi dan menonaktifkan organizer.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminUserDetailResponse'
        '400':
          description: Admin mencoba mengubah akunnya sendiri (CANNOT_MODIFY_SELF).
        '422':
          $ref: '#/components/responses/ValidationError'

  /admin/organizers:
    get:
      tags: [Admin]
      summary: Daftar organizer
      operationId: listAdminOrganizers
      security:
        - cookieAuth: []
      parameters:
        - { name: q, in: query, schema: { type: string } }
        - { name: status, in: query, schema: { type: string, enum: [PENDING, ACTIVE, REJECTED, SUSPENDED] } }
        - { name: page, in: query, schema: { type: integer, default: 1 } }
        - { name: limit, in: query, schema: { type: integer, default: 10 } }
      responses:
        '200':
          description: Daftar organizer.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminOrganizerListResponse'

  /admin/organizers/{id}:
    get:
      tags: [Admin]
      summary: Detail organizer
      operationId: getAdminOrganizer
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: Profil organizer dan event terbaru.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizerProfileResponse'
        '404':
          $ref: '#/components/responses/NotFound'

  /admin/organizers/{id}/status:
    patch:
      tags: [Admin]
      summary: Menyetujui, menolak, atau menangguhkan organizer
      operationId: reviewOrganizer
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status: { type: string, enum: [PENDING, ACTIVE, REJECTED, SUSPENDED] }
                note: { type: string, maxLength: 1000, description: Wajib untuk REJECTED dan SUSPENDED. }
      responses:
        '200':
          description: Status organizer diperbarui dan sesi dicabut bila ditolak/disuspend.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizerProfileResponse'
        '409':
          description: Akun organizer tidak aktif (ORGANIZER_USER_INACTIVE).
        '422':
          $ref: '#/components/responses/ValidationError'

  /admin/events:
    get:
      tags: [Admin]
      summary: Daftar event untuk moderasi
      operationId: listAdminEvents
      security:
        - cookieAuth: []
      parameters:
        - { name: q, in: query, schema: { type: string } }
        - { name: status, in: query, schema: { $ref: '#/components/schemas/EventStatus' } }
        - { name: page, in: query, schema: { type: integer, default: 1 } }
        - { name: limit, in: query, schema: { type: integer, default: 10 } }
      responses:
        '200':
          description: Daftar event semua organizer.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdminEventListResponse'

  /admin/events/{id}:
    get:
      tags: [Admin]
      summary: Detail event untuk moderasi
      operationId: getAdminEvent
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: Detail event, organizer, dan tipe tiket.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EventDetailResponse'
        '404':
          $ref: '#/components/responses/NotFound'

  /admin/events/{id}/review:
    patch:
      tags: [Admin]
      summary: Memoderasi event
      operationId: reviewEvent
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [status]
              properties:
                status: { type: string, enum: [PUBLISHED, REJECTED, CANCELLED] }
                note: { type: string, maxLength: 1000, description: Wajib untuk REJECTED dan CANCELLED. }
      responses:
        '200':
          description: Event dipublikasikan, ditolak, atau dibatalkan.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EventDetailResponse'
        '409':
          description: Event butuh tipe tiket, kategori nonaktif, atau event sudah ditutup.
        '422':
          $ref: '#/components/responses/ValidationError'

  /admin/orders:
    get:
      tags: [Admin]
      summary: Mencari order platform
      operationId: listAdminOrders
      security:
        - cookieAuth: []
      parameters:
        - name: q
          in: query
          schema: { type: string }
          description: Kode order, nama/email pembeli, atau referensi pembayaran.
        - { name: status, in: query, schema: { $ref: '#/components/schemas/OrderStatus' } }
        - { name: page, in: query, schema: { type: integer, default: 1 } }
        - { name: limit, in: query, schema: { type: integer, default: 10 } }
      responses:
        '200':
          description: Daftar order.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderListResponse'

  /admin/orders/{id}:
    get:
      tags: [Admin]
      summary: Detail order untuk support
      operationId: getAdminOrder
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: Detail order, pembayaran, dan tiket.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderDetailResponse'
        '404':
          $ref: '#/components/responses/NotFound'

  /admin/orders/{id}/payment-review/resolve:
    post:
      tags: [Admin]
      summary: Menyelesaikan review pembayaran telat
      operationId: resolvePaymentReview
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [action, note]
              properties:
                action: { type: string, enum: [ISSUE_TICKETS, REFUND] }
                note: { type: string, minLength: 5, maxLength: 1000 }
      responses:
        '200':
          description: Tiket diterbitkan atau order ditandai refund pending.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimpleSuccess'
        '409':
          description: Order tidak dalam review atau pembayaran PAID tidak ditemukan.
        '422':
          $ref: '#/components/responses/ValidationError'

  /admin/categories:
    get:
      tags: [Admin]
      summary: Semua kategori termasuk nonaktif
      operationId: listAdminCategories
      security:
        - cookieAuth: []
      responses:
        '200':
          description: Daftar kategori.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CategoryListResponse'
    post:
      tags: [Admin]
      summary: Membuat kategori
      operationId: createCategory
      security:
        - cookieAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CategoryInput'
      responses:
        '201':
          description: Kategori dibuat.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CategoryResponse'
        '409':
          description: Slug kategori sudah dipakai (CATEGORY_SLUG_TAKEN).

  /admin/categories/{id}:
    patch:
      tags: [Admin]
      summary: Memperbarui kategori
      operationId: updateCategory
      security:
        - cookieAuth: []
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CategoryInput'
      responses:
        '200':
          description: Kategori diperbarui.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CategoryResponse'
        '404':
          $ref: '#/components/responses/NotFound'

  /admin/settings:
    get:
      tags: [Admin]
      summary: Pengaturan platform
      operationId: getPlatformSettings
      security:
        - cookieAuth: []
      responses:
        '200':
          description: Pengaturan efektif.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlatformSettingsResponse'
    patch:
      tags: [Admin]
      summary: Memperbarui pengaturan platform
      operationId: updatePlatformSettings
      security:
        - cookieAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PlatformSettingsInput'
      responses:
        '200':
          description: Pengaturan diperbarui dan dicatat di audit log.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlatformSettingsResponse'

  /admin/audit-logs:
    get:
      tags: [Admin]
      summary: Mencari audit log
      operationId: listAuditLogs
      security:
        - cookieAuth: []
      parameters:
        - { name: q, in: query, schema: { type: string } }
        - { name: action, in: query, schema: { type: string, example: EVENT_REVIEWED } }
        - { name: resourceType, in: query, schema: { type: string, example: EVENT } }
        - { name: page, in: query, schema: { type: integer, default: 1 } }
        - { name: limit, in: query, schema: { type: integer, default: 20 } }
      responses:
        '200':
          description: Audit log terbaru.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuditLogListResponse'

  /webhooks/payments/{provider}:
    post:
      tags: [Webhooks]
      summary: Callback pembayaran
      operationId: paymentWebhook
      description: >-
        Body diverifikasi terhadap raw bytes. Provider mock memakai header
        x-mock-signature berisi HMAC-SHA256 body dengan PAYMENT_WEBHOOK_SECRET.
        Event pembayaran disimpan untuk idempotensi; pengiriman ulang
        mengembalikan duplicate=true. Nominal dan referensi harus cocok.
      parameters:
        - { name: provider, in: path, required: true, schema: { type: string, enum: [mock] } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [eventId, reference, orderCode, amount, currency, status, paidAt]
              properties:
                eventId: { type: string }
                reference: { type: string, example: MOCK-ORD-ABC123 }
                orderCode: { type: string }
                amount: { type: integer, example: 175000 }
                currency: { type: string, enum: [IDR] }
                status: { type: string, enum: [PAID, FAILED, EXPIRED] }
                paidAt: { type: string, format: date-time }
      responses:
        '200':
          description: >-
            Pembayaran diproses, diterbitkan, atau dicatat untuk review admin
            bila order sudah kedaluwarsa.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WebhookResponse'
        '400':
          description: Signature tidak valid.
        '404':
          description: Provider atau referensi pembayaran tidak dikenal.
        '422':
          description: Nominal atau status pembayaran tidak sesuai.

components:
  securitySchemes:
    cookieAuth:
      type: apiKey
      in: cookie
      name: access_token
      description: JWT access token HttpOnly berumur 15 menit.
    refreshCookie:
      type: apiKey
      in: cookie
      name: refresh_token
      description: Opaque refresh token HttpOnly berumur 7 hari, dirotasi setiap refresh.
    orderToken:
      type: apiKey
      in: header
      name: x-order-token
      description: >-
        Token akses order tamu yang dikembalikan saat checkout. Dapat juga
        dikirim sebagai query token pada endpoint GET dan unduhan QR.
    mockSignature:
      type: apiKey
      in: header
      name: x-mock-signature
      description: HMAC-SHA256 raw body dengan PAYMENT_WEBHOOK_SECRET.

  parameters:
    EventSlug:
      name: slug
      in: path
      required: true
      schema: { type: string }
    EventId:
      name: eventId
      in: path
      required: true
      schema: { type: string }
    OrderCode:
      name: orderCode
      in: path
      required: true
      schema: { type: string, example: ORD-7KQ2M9 }
    OrderTokenQuery:
      name: token
      in: query
      required: false
      schema: { type: string }
      description: Alternatif header x-order-token untuk akses order tamu.

  responses:
    Unauthorized:
      description: Tidak terautentikasi atau sesi berakhir.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'
          example:
            success: false
            data: null
            meta: null
            error:
              code: SESSION_EXPIRED
              message: Sesi sudah berakhir. Silakan masuk lagi.
              requestId: 6f0e2f3a-7a1e-4e5c-9a51-2d9a3f7e1c11
    OrderAccessDenied:
      description: Token order tidak ada atau tidak cocok.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'
          example:
            success: false
            data: null
            meta: null
            error:
              code: ORDER_ACCESS_DENIED
              message: Token akses order tidak valid
              requestId: 6f0e2f3a-7a1e-4e5c-9a51-2d9a3f7e1c11
    NotFound:
      description: Resource tidak ditemukan.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'
    ValidationError:
      description: Validasi payload atau query gagal.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'
          example:
            success: false
            data: null
            meta: null
            error:
              code: UNPROCESSABLE_ENTITY
              message: Data yang dikirim tidak valid
              details:
                - path: buyerEmail
                  message: Format email tidak valid
              requestId: 6f0e2f3a-7a1e-4e5c-9a51-2d9a3f7e1c11
    RateLimited:
      description: Terlalu banyak permintaan dalam jendela waktu.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorEnvelope'
          example:
            success: false
            data: null
            meta: null
            error:
              code: RATE_LIMITED
              message: Terlalu banyak percobaan. Coba lagi nanti.
              requestId: 6f0e2f3a-7a1e-4e5c-9a51-2d9a3f7e1c11

  schemas:
    ErrorDetail:
      type: object
      properties:
        path: { type: string }
        message: { type: string }

    ErrorEnvelope:
      type: object
      required: [success, data, meta, error]
      properties:
        success: { type: boolean, enum: [false] }
        data: { nullable: true }
        meta: { nullable: true }
        error:
          type: object
          required: [code, message]
          properties:
            code: { type: string, example: TICKET_SOLD_OUT }
            message: { type: string }
            details:
              type: array
              nullable: true
              items: { $ref: '#/components/schemas/ErrorDetail' }
            requestId: { type: string, format: uuid }

    PaginationMeta:
      type: object
      required: [page, limit, total, totalPages]
      properties:
        page: { type: integer }
        limit: { type: integer }
        total: { type: integer }
        totalPages: { type: integer }

    User:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        email: { type: string, format: email }
        phone: { type: string, nullable: true }
        role: { type: string, enum: [USER, ADMIN] }
        status: { type: string, enum: [ACTIVE, PENDING_VERIFICATION, SUSPENDED, DELETED] }
        organizerProfile:
          type: object
          nullable: true
          properties:
            slug: { type: string }
            status: { $ref: '#/components/schemas/OrganizerStatus' }

    AuthResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              required: [user]
              properties:
                user: { $ref: '#/components/schemas/User' }

    MeResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              required: [user]
              properties:
                user: { $ref: '#/components/schemas/User' }
                permissions:
                  type: array
                  items: { type: string }

    SimpleSuccess:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              additionalProperties: true

    HealthResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                status: { type: string, example: ok }
                service: { type: string, example: gofest-api }
                version: { type: string }
                time: { type: string, format: date-time }

    Envelope:
      type: object
      required: [success, data, meta]
      properties:
        success: { type: boolean, enum: [true] }
        data: {}
        meta: { nullable: true }

    OrganizerStatus:
      type: string
      enum: [PENDING, ACTIVE, REJECTED, SUSPENDED]

    EventStatus:
      type: string
      enum: [DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED, CANCELLED, COMPLETED]

    OrderStatus:
      type: string
      enum: [PENDING_PAYMENT, PAID, PAYMENT_REVIEW, EXPIRED, CANCELLED, REFUND_PENDING, REFUNDED]

    Category:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        slug: { type: string }
        description: { type: string, nullable: true }
        isActive: { type: boolean }

    CategoryInput:
      type: object
      required: [name, slug]
      properties:
        name: { type: string, minLength: 2, maxLength: 80 }
        slug: { type: string, pattern: '^[a-z0-9-]+$' }
        description: { type: string, maxLength: 500, nullable: true }
        isActive: { type: boolean, default: true }

    CategoryResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                category: { $ref: '#/components/schemas/Category' }

    CategoryListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                categories:
                  type: array
                  items: { $ref: '#/components/schemas/Category' }

    TicketType:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        description: { type: string, nullable: true }
        price: { type: integer, description: Harga dalam IDR. }
        quotaTotal: { type: integer }
        quantitySold: { type: integer }
        quantityReserved: { type: integer }
        remaining: { type: integer, description: Sisa kuota yang dapat dibeli. }
        salesStartAt: { type: string, format: date-time, nullable: true }
        salesEndAt: { type: string, format: date-time, nullable: true }
        minPerOrder: { type: integer }
        maxPerOrder: { type: integer }
        isActive: { type: boolean }
        isSoldOut: { type: boolean }
        salesStatus: { type: string, enum: [SCHEDULED, ON_SALE, ENDED] }

    TicketTypeInput:
      type: object
      required: [name, price, quotaTotal]
      properties:
        name: { type: string, minLength: 2, maxLength: 80 }
        description: { type: string, maxLength: 1000, nullable: true }
        price: { type: integer, minimum: 0, maximum: 1000000000 }
        quotaTotal: { type: integer, minimum: 1, maximum: 1000000 }
        salesStartAt: { type: string, format: date-time, nullable: true }
        salesEndAt: { type: string, format: date-time, nullable: true }
        minPerOrder: { type: integer, minimum: 1, maximum: 20, default: 1 }
        maxPerOrder: { type: integer, minimum: 1, maximum: 50, default: 10 }
        isActive: { type: boolean, default: true }
        sortOrder: { type: integer, minimum: 0, default: 0 }

    TicketTypeResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                ticketType: { $ref: '#/components/schemas/TicketType' }

    TicketTypeListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                ticketTypes:
                  type: array
                  items: { $ref: '#/components/schemas/TicketType' }

    EventInput:
      type: object
      required: [title, slug, summary, description, categoryId, type, startsAt, endsAt]
      properties:
        title: { type: string, minLength: 4, maxLength: 140 }
        slug: { type: string, pattern: '^[a-z0-9-]+$' }
        summary: { type: string, minLength: 20, maxLength: 240 }
        description: { type: string, minLength: 40, maxLength: 30000 }
        categoryId: { type: string }
        coverKey: { type: string, nullable: true }
        type: { type: string, enum: [ONLINE, OFFLINE] }
        venueName: { type: string, nullable: true, description: Wajib untuk OFFLINE. }
        address: { type: string, nullable: true, description: Wajib untuk OFFLINE. }
        city: { type: string, nullable: true, description: Wajib untuk OFFLINE. }
        onlineAccessUrl: { type: string, format: uri, nullable: true }
        onlineAccessNote: { type: string, maxLength: 500, nullable: true }
        startsAt: { type: string, format: date-time }
        endsAt: { type: string, format: date-time }
        timezone: { type: string, default: Asia/Jakarta }
        salesStartAt: { type: string, format: date-time, nullable: true }
        salesEndAt: { type: string, format: date-time, nullable: true }
        rules: { type: string, maxLength: 10000, nullable: true }
        refundPolicy: { type: string, maxLength: 10000, nullable: true }

    EventSummary:
      type: object
      properties:
        id: { type: string }
        title: { type: string }
        slug: { type: string }
        summary: { type: string }
        status: { $ref: '#/components/schemas/EventStatus' }
        type: { type: string, enum: [ONLINE, OFFLINE] }
        coverUrl: { type: string, nullable: true }
        city: { type: string, nullable: true }
        venueName: { type: string, nullable: true }
        startsAt: { type: string, format: date-time }
        endsAt: { type: string, format: date-time }
        timezone: { type: string }
        priceFrom: { type: integer, nullable: true }
        isFree: { type: boolean }
        isSoldOut: { type: boolean }
        isDemo: { type: boolean }
        organizer:
          type: object
          properties:
            organizationName: { type: string }
            slug: { type: string }
        category: { $ref: '#/components/schemas/Category' }

    EventDetailResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                event: { $ref: '#/components/schemas/EventSummary' }

    EventListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: array
              items: { $ref: '#/components/schemas/EventSummary' }
            meta: { $ref: '#/components/schemas/PaginationMeta' }

    OrganizerProfile:
      type: object
      properties:
        id: { type: string }
        organizationName: { type: string }
        slug: { type: string }
        description: { type: string, nullable: true }
        status: { $ref: '#/components/schemas/OrganizerStatus' }
        contactEmail: { type: string, nullable: true }
        contactPhone: { type: string, nullable: true }
        websiteUrl: { type: string, nullable: true }
        logoUrl: { type: string, nullable: true }
        reviewNote: { type: string, nullable: true }
        events:
          type: array
          items: { $ref: '#/components/schemas/EventSummary' }

    OrganizerProfileResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                organizer: { $ref: '#/components/schemas/OrganizerProfile' }

    OrganizerDetailResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                organizer: { $ref: '#/components/schemas/OrganizerProfile' }

    CreateOrderInput:
      type: object
      required: [eventId, buyerName, buyerEmail, items, acceptTerms, idempotencyKey]
      properties:
        eventId: { type: string }
        buyerName: { type: string, minLength: 2, maxLength: 120 }
        buyerEmail: { type: string, format: email }
        buyerPhone: { type: string, example: '081234567890' }
        couponCode: { type: string, maxLength: 24 }
        items:
          type: array
          minItems: 1
          maxItems: 10
          items:
            type: object
            required: [ticketTypeId, quantity]
            properties:
              ticketTypeId: { type: string }
              quantity: { type: integer, minimum: 1, maximum: 50 }
        acceptTerms: { type: boolean, enum: [true] }
        idempotencyKey: { type: string, minLength: 8, maxLength: 100 }

    OrderItem:
      type: object
      properties:
        id: { type: string }
        ticketTypeId: { type: string }
        ticketTypeName: { type: string }
        quantity: { type: integer }
        unitPrice: { type: integer }
        lineTotal: { type: integer }

    Ticket:
      type: object
      properties:
        id: { type: string }
        ticketCode: { type: string }
        holderName: { type: string }
        holderEmail: { type: string }
        status: { type: string, enum: [VALID, CHECKED_IN, CANCELLED, REFUNDED] }
        ticketTypeName: { type: string }
        issuedAt: { type: string, format: date-time }
        checkedInAt: { type: string, format: date-time, nullable: true }
        qrUrl: { type: string, description: Hanya pada endpoint tiket. }

    Order:
      type: object
      properties:
        id: { type: string }
        orderCode: { type: string }
        status: { $ref: '#/components/schemas/OrderStatus' }
        buyerName: { type: string }
        buyerEmail: { type: string }
        buyerPhone: { type: string, nullable: true }
        subtotal: { type: integer }
        discount: { type: integer }
        platformFee: { type: integer }
        total: { type: integer }
        currency: { type: string, enum: [IDR] }
        couponCode: { type: string, nullable: true }
        expiresAt: { type: string, format: date-time }
        paidAt: { type: string, format: date-time, nullable: true }
        createdAt: { type: string, format: date-time }
        event:
          type: object
          properties:
            id: { type: string }
            title: { type: string }
            slug: { type: string }
            startsAt: { type: string, format: date-time }
            endsAt: { type: string, format: date-time }
            timezone: { type: string }
            venueName: { type: string, nullable: true }
            city: { type: string, nullable: true }
            coverUrl: { type: string, nullable: true }
        items:
          type: array
          items: { $ref: '#/components/schemas/OrderItem' }
        tickets:
          type: array
          items: { $ref: '#/components/schemas/Ticket' }

    CreateOrderResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                order: { $ref: '#/components/schemas/Order' }
                accessToken: { type: string, description: Simpan sebagai x-order-token atau query token. }
                reused: { type: boolean }

    OrderDetailResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                order: { $ref: '#/components/schemas/Order' }
                event:
                  type: object
                  additionalProperties: true

    OrderListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: array
              items: { $ref: '#/components/schemas/Order' }
            meta: { $ref: '#/components/schemas/PaginationMeta' }

    AccountOrderListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: array
              items: { $ref: '#/components/schemas/Order' }
            meta: { $ref: '#/components/schemas/PaginationMeta' }

    TicketListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              oneOf:
                - type: array
                  items: { $ref: '#/components/schemas/Ticket' }
                - type: object
                  properties:
                    tickets:
                      type: array
                      items: { $ref: '#/components/schemas/Ticket' }

    TicketQrResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                ticketId: { type: string }
                qrUrl: { type: string }

    PaymentSessionResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                payment:
                  type: object
                  properties:
                    provider: { type: string, example: mock }
                    providerReference: { type: string, example: MOCK-ORD-ABC123 }
                    amount: { type: integer }
                    currency: { type: string }
                    status: { type: string }
                    instructions:
                      type: array
                      items: { type: string }

    CouponInput:
      type: object
      required: [code, discountType, discountValue]
      properties:
        code: { type: string, minLength: 3, maxLength: 24, pattern: '^[A-Z0-9_-]+$' }
        discountType: { type: string, enum: [PERCENTAGE, FIXED_AMOUNT] }
        discountValue: { type: integer, minimum: 1 }
        maxDiscount: { type: integer, minimum: 1, nullable: true }
        minimumPurchase: { type: integer, minimum: 0, default: 0 }
        maxRedemptions: { type: integer, minimum: 1, nullable: true }
        maxPerUser: { type: integer, minimum: 1, nullable: true }
        validFrom: { type: string, format: date-time, nullable: true }
        validUntil: { type: string, format: date-time, nullable: true }
        isActive: { type: boolean, default: true }

    Coupon:
      allOf:
        - $ref: '#/components/schemas/CouponInput'
        - type: object
          properties:
            id: { type: string }
            eventId: { type: string }
            redeemedCount: { type: integer }

    CouponResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                coupon: { $ref: '#/components/schemas/Coupon' }

    CouponListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                coupons:
                  type: array
                  items: { $ref: '#/components/schemas/Coupon' }

    StaffMember:
      type: object
      properties:
        id: { type: string }
        role: { type: string, enum: [CHECK_IN, MANAGER] }
        assignedAt: { type: string, format: date-time }
        user:
          type: object
          properties:
            id: { type: string }
            name: { type: string }
            email: { type: string }

    StaffListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                staff:
                  type: array
                  items: { $ref: '#/components/schemas/StaffMember' }
                staffAssignments:
                  type: array
                  items: { $ref: '#/components/schemas/StaffMember' }

    StaffEventListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                events:
                  type: array
                  items:
                    allOf:
                      - $ref: '#/components/schemas/EventSummary'
                      - type: object
                        properties:
                          accessRole: { type: string, enum: [OWNER, CHECK_IN, MANAGER] }
                          ticketCounts:
                            type: object
                            properties:
                              valid: { type: integer }
                              checkedIn: { type: integer }
                              cancelled: { type: integer }
                              refunded: { type: integer }

    CheckInSummary:
      type: object
      properties:
        counts:
          type: object
          properties:
            valid: { type: integer }
            checkedIn: { type: integer }
            cancelled: { type: integer }
            refunded: { type: integer }
        issued: { type: integer }
        attendanceRate: { type: number, example: 62.5 }
        lastScanAt: { type: string, format: date-time, nullable: true }
        recentScans:
          type: array
          items:
            type: object
            properties:
              id: { type: string }
              result: { type: string, enum: [VALID, ALREADY_USED, INVALID, CANCELLED, WRONG_EVENT] }
              gate: { type: string, nullable: true }
              scannedAt: { type: string, format: date-time }
              staffName: { type: string }
              ticketCode: { type: string, nullable: true }
              holderName: { type: string, nullable: true }

    CheckInSummaryResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data: { $ref: '#/components/schemas/CheckInSummary' }

    ScanResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                result: { type: string, enum: [VALID, ALREADY_USED, INVALID, CANCELLED, WRONG_EVENT] }
                accepted: { type: boolean }
                message: { type: string }
                scannedAt: { type: string, format: date-time }
                replayed: { type: boolean }
                ticket: { $ref: '#/components/schemas/Ticket' }

    UploadResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                key: { type: string }
                url: { type: string }
                width: { type: integer }
                height: { type: integer }
                size: { type: integer }
                mimeType: { type: string, example: image/webp }

    OrganizerDashboardResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              additionalProperties: true

    AdminDashboardResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              additionalProperties: true

    AdminUser:
      allOf:
        - $ref: '#/components/schemas/User'
        - type: object
          properties:
            createdAt: { type: string, format: date-time }
            organizerProfile:
              type: object
              nullable: true
              properties:
                id: { type: string }
                organizationName: { type: string }
                status: { $ref: '#/components/schemas/OrganizerStatus' }
            _count:
              type: object
              properties:
                orders: { type: integer }
                staffAssignments: { type: integer }

    AdminUserDetailResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                user: { $ref: '#/components/schemas/AdminUser' }

    AdminUserListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: array
              items: { $ref: '#/components/schemas/AdminUser' }
            meta: { $ref: '#/components/schemas/PaginationMeta' }

    AdminOrganizerListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: array
              items: { $ref: '#/components/schemas/OrganizerProfile' }
            meta: { $ref: '#/components/schemas/PaginationMeta' }

    AdminEventListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: array
              items: { $ref: '#/components/schemas/EventSummary' }
            meta: { $ref: '#/components/schemas/PaginationMeta' }

    PlatformSettingsInput:
      type: object
      properties:
        platformFeeType: { type: string, enum: [none, fixed, percentage] }
        platformFeeValue: { type: integer, minimum: 0, maximum: 10000000 }
        orderReservationMinutes: { type: integer, minimum: 5, maximum: 120 }
        eventReviewRequired: { type: boolean }

    PlatformSettings:
      allOf:
        - $ref: '#/components/schemas/PlatformSettingsInput'
        - type: object
          properties:
            updatedAt: { type: string, format: date-time }

    PlatformSettingsResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                settings: { $ref: '#/components/schemas/PlatformSettings' }

    AuditLog:
      type: object
      properties:
        id: { type: string }
        action: { type: string }
        resourceType: { type: string }
        resourceId: { type: string, nullable: true }
        metadata: { nullable: true }
        ip: { type: string, nullable: true }
        requestId: { type: string, nullable: true }
        createdAt: { type: string, format: date-time }
        actor:
          type: object
          nullable: true
          properties:
            id: { type: string }
            name: { type: string }
            email: { type: string }

    AuditLogListResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: array
              items: { $ref: '#/components/schemas/AuditLog' }
            meta: { $ref: '#/components/schemas/PaginationMeta' }

    WebhookResponse:
      allOf:
        - $ref: '#/components/schemas/Envelope'
        - type: object
          properties:
            data:
              type: object
              properties:
                result:
                  type: object
                  additionalProperties: true
                duplicate: { type: boolean }

x-error-codes:
  - code: SESSION_NOT_FOUND
    status: 401
    description: Cookie sesi tidak ada.
  - code: SESSION_EXPIRED
    status: 401
    description: Access token kedaluwarsa atau tidak valid.
  - code: SESSION_REUSED
    status: 401
    description: Refresh token lama dipakai ulang; seluruh sesi dicabut.
  - code: ORDER_ACCESS_DENIED
    status: 401
    description: Token akses order tamu salah atau tidak ada.
  - code: ADMIN_ONLY
    status: 403
    description: Endpoint hanya untuk admin.
  - code: ORGANIZER_NOT_ACTIVE
    status: 403
    description: Organizer belum disetujui atau disuspend.
  - code: EVENT_NOT_OWNED
    status: 403
    description: Event bukan milik organizer yang login.
  - code: CHECK_IN_NOT_ASSIGNED
    status: 403
    description: Pengguna bukan staf event tersebut.
  - code: TICKET_SOLD_OUT
    status: 409
    description: Kuota tipe tiket tidak mencukupi.
  - code: IDEMPOTENCY_CONFLICT
    status: 409
    description: Idempotency key dipakai untuk payload berbeda.
  - code: COUPON_USER_LIMIT
    status: 409
    description: Kupon sudah mencapai batas pemakaian pembeli.
  - code: COUPON_LIMIT_REACHED
    status: 409
    description: Kupon sudah mencapai batas total pemakaian.
  - code: EVENT_SLUG_TAKEN
    status: 409
    description: Slug event sudah dipakai.
  - code: ORDER_NOT_PAYABLE
    status: 409
    description: Order tidak berada pada status yang dapat dibayar.
  - code: ORDER_NOT_IN_REVIEW
    status: 409
    description: Order bukan PAYMENT_REVIEW.
  - code: INVALID_ORIGIN
    status: 403
    description: Origin permintaan mutasi tidak diizinkan.
  - code: UNPROCESSABLE_ENTITY
    status: 422
    description: Validasi payload gagal.
  - code: RATE_LIMITED
    status: 429
    description: Melebihi batas laju permintaan.
  - code: INTERNAL_ERROR
    status: 500
    description: Kesalahan tak terduga pada server.
`;

export const openApiDocument = parse(spec) as Record<string, unknown>;