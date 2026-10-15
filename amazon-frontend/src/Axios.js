import axios from 'axios'
import mockAdapter from './mock/adapter'

// Set REACT_APP_API_URL to point at a real amazon-backend deployment.
// Without it the app runs in demo mode against an in-browser mock API.
const apiUrl = process.env.REACT_APP_API_URL

const instance = apiUrl
    ? axios.create({ baseURL: apiUrl })
    : axios.create({ adapter: mockAdapter })

export default instance
