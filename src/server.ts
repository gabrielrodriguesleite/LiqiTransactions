import app from "./app"

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.info('SIGTERM signal received. Closing HTTP server.')
  server.close(() => {
    console.log('HTTP server closed.')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.info('SIGINT signal received. Closing HTTP server.')
  server.close(() => {
    console.log('HTTP server closed.')
    process.exit(0)
  })
})
