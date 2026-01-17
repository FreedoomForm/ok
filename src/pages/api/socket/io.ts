import { Server as IOServer } from 'socket.io'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Server as HTTPServer } from 'http'
import type { Socket as NetSocket } from 'net'
import jwt from 'jsonwebtoken'

interface SocketServer extends HTTPServer {
    io?: IOServer
}

interface SocketWithIO extends NetSocket {
    server: SocketServer
}

interface NextApiResponseWithSocket extends NextApiResponse {
    socket: SocketWithIO
}

const JWT_SECRET = process.env.JWT_SECRET!

export const config = {
    api: {
        bodyParser: false
    }
}

interface ChatMessage {
    id: string
    senderName: string
    content: string
    timestamp: Date
}

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
    if (res.socket.server.io) {
        console.log('Socket.IO already running')
        res.end()
        return
    }

    console.log('Starting Socket.IO server...')

    const io = new IOServer(res.socket.server as any, {
        path: '/api/socket/io',
        addTrailingSlash: false,
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    })

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token

        if (!token) {
            return next(new Error('Authentication required'))
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string }
            if (decoded.role !== 'CUSTOMER') {
                return next(new Error('Invalid token role'))
            }
            socket.data.customerId = decoded.id
            next()
        } catch (err) {
            next(new Error('Invalid token'))
        }
    })

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.data.customerId)

        // Join admin-specific room based on websiteId
        socket.on('join_room', (websiteId: string) => {
            socket.join(`website:${websiteId}`)
            console.log(`${socket.data.customerId} joined room: website:${websiteId}`)
        })

        // Handle chat messages
        socket.on('chat_message', (data: { websiteId: string; senderName: string; content: string }) => {
            const message: ChatMessage = {
                id: `${Date.now()}-${socket.data.customerId}`,
                senderName: data.senderName,
                content: data.content,
                timestamp: new Date()
            }

            // Broadcast to all clients in the same website room
            io.to(`website:${data.websiteId}`).emit('new_message', message)
        })

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.data.customerId)
        })
    })

    res.socket.server.io = io
    res.end()
}
