import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import 'dotenv/config';
import { createServer } from 'http';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import milestoneRoutes from './routes/milestones.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import { handleWebSocket } from './controllers/messages.js';

// Load environment variables
config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3400;  

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to the backend API!');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// WebSocket setup
handleWebSocket(server);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
server.listen(PORT, () => {  
  console.log(`Server running on port ${PORT}`);
});

export default app;