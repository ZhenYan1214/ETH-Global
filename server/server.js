require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')

// Import routes
const tokensRouter = require('./routes/tokens')
const convertRouter = require('./routes/convert')
const circleRouter = require('./routes/circle')
const webhookRouter = require('./routes/webhook')
const historyRouter = require('./routes/history')

const app = express()

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// Routes
app.use('/api/tokens', tokensRouter)
app.use('/api/convert', convertRouter)
app.use('/api/circle', circleRouter)
app.use('/api/webhook', webhookRouter)
app.use('/api/history', historyRouter)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
}) 