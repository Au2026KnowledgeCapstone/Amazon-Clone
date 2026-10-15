import { db, products, save, nextId } from './db'

// A drop-in axios adapter that answers the same routes amazon-backend serves,
// so the app runs with no server. Response shapes mirror routers/*.js.

const ok = (data, status = 200) => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {},
    request: {},
})

const fail = (status, message) => {
    const error = new Error(message)
    error.response = { status, data: { message }, headers: {}, config: {} }
    return error
}

const parseBody = (config) => {
    if (!config.data) return {}
    if (typeof config.data === 'string') {
        try {
            return JSON.parse(config.data)
        } catch (e) {
            return {}
        }
    }
    return config.data
}

// Mirrors isAuth in utils.js. The token is just the user id -- there is no
// signature to verify without a server.
const requireUser = (config) => {
    const headers = config.headers || {}
    const header = headers.Authorization || headers.authorization
    if (!header) throw fail(401, 'No token')

    const user = db.users.find((u) => u._id === String(header).replace('Bearer ', ''))
    if (!user) throw fail(401, 'Invalid token')
    return user
}

const publicUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    token: user._id,
})

const handle = (config) => {
    const method = (config.method || 'get').toLowerCase()
    const url = (config.url || '').split('?')[0]
    const body = parseBody(config)

    if (method === 'get' && url === '/api/config/paypal') return ok('sb')

    // Products
    if (method === 'get' && url === '/api/products') return ok(products)
    if (method === 'get' && url === '/api/products/seed') return ok({ createdProducts: products })
    if (method === 'get' && url.startsWith('/api/products/')) {
        const product = products.find((p) => p._id === url.split('/')[3])
        if (!product) throw fail(404, 'Product not found.')
        return ok(product)
    }

    // Users
    if (method === 'post' && url === '/api/users/signin') {
        const user = db.users.find((u) => u.email === body.email)
        if (!user || user.password !== body.password) {
            throw fail(401, 'Invalid email or password.')
        }
        return ok(publicUser(user))
    }

    if (method === 'post' && url === '/api/users/register') {
        if (db.users.some((u) => u.email === body.email)) {
            throw fail(409, 'An account with that email already exists.')
        }
        const user = {
            _id: nextId('u'),
            name: body.name,
            email: body.email,
            password: body.password,
            isAdmin: false,
        }
        db.users.push(user)
        save()
        return ok(publicUser(user))
    }

    if (method === 'put' && url === '/api/users/profile') {
        const current = requireUser(config)
        current.name = body.name || current.name
        current.email = body.email || current.email
        if (body.password) current.password = body.password
        save()
        return ok(publicUser(current))
    }

    if (method === 'get' && url.startsWith('/api/users/')) {
        const user = db.users.find((u) => u._id === url.split('/')[3])
        if (!user) throw fail(404, 'User not found')
        return ok(user)
    }

    // Orders
    if (method === 'get' && url === '/api/orders/mine') {
        const current = requireUser(config)
        return ok(db.orders.filter((o) => o.user === current._id))
    }

    if (method === 'post' && url === '/api/orders') {
        const current = requireUser(config)
        if (!body.orderItems || body.orderItems.length === 0) {
            throw fail(400, 'Cart is empty')
        }
        const order = {
            ...body,
            _id: nextId('o'),
            user: current._id,
            isPaid: false,
            isDelivered: false,
            createdAt: new Date().toISOString(),
        }
        db.orders.push(order)
        save()
        return ok({ message: 'New order created.', order }, 201)
    }

    if (method === 'put' && /^\/api\/orders\/[^/]+\/pay$/.test(url)) {
        requireUser(config)
        const order = db.orders.find((o) => o._id === url.split('/')[3])
        if (!order) throw fail(404, 'Order not found.')
        order.isPaid = true
        order.paidAt = new Date().toISOString()
        order.paymentResult = {
            id: body.id,
            status: body.status,
            update_time: body.update_time,
            email_address: body.email_address,
        }
        save()
        return ok({ message: 'Order paid.', order })
    }

    if (method === 'get' && url.startsWith('/api/orders/')) {
        requireUser(config)
        const order = db.orders.find((o) => o._id === url.split('/')[3])
        if (!order) throw fail(404, 'Order not found.')
        return ok(order)
    }

    throw fail(404, `No mock route for ${method.toUpperCase()} ${url}`)
}

const mockAdapter = (config) =>
    new Promise((resolve, reject) => {
        // Small delay so loading states in the UI actually render.
        setTimeout(() => {
            try {
                resolve(handle(config))
            } catch (error) {
                reject(error)
            }
        }, 150)
    })

export default mockAdapter
