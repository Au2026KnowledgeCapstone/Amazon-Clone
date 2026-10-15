import { products as seedProducts } from './products'

// Demo-mode datastore. Products are static; users and orders persist in
// localStorage so the app behaves like a real backend within one browser.

const STORAGE_KEY = 'amazonCloneMockDb'

export const products = seedProducts.map((product, i) => ({
    ...product,
    _id: `p${i + 1}`,
}))

// Passwords are plaintext here on purpose: there is no server, so nothing is
// actually being protected. Never carry this pattern into a real backend.
const seedState = () => ({
    users: [
        {
            _id: 'u1',
            name: 'Admin',
            email: 'admin2023@gmail.com',
            password: '1234',
            isAdmin: true,
        },
        {
            _id: 'u2',
            name: 'Debjit Pramanick',
            email: 'debjit1@gmail.com',
            password: '1234',
            isAdmin: true,
        },
        {
            _id: 'u3',
            name: 'Rohan Das',
            email: 'rohan67@gmail.com',
            password: '1234',
            isAdmin: false,
        },
    ],
    orders: [],
    nextId: 4,
})

const load = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : seedState()
    } catch (e) {
        return seedState()
    }
}

export const db = load()

export const save = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch (e) {
        // Quota or private-browsing failures are non-fatal; the in-memory copy
        // still serves the current session.
    }
}

export const nextId = (prefix) => `${prefix}${db.nextId++}`
