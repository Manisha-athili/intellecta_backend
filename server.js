import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import promptRoutes from './routes/promptRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// app.use(cors(
//   {
//   origin: ['http://localhost:5173'],  // allow frontend origin
//   credentials: true                // allow cookies/credentials
// }
// ));

app.use(cors(
  {
  origin: ['http://localhost:5173',
    'https://intellecta-frontend.vercel.app'],  // allow frontend origin
  credentials: true                // allow cookies/credentials
}
)); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running 🚀' });
});
     
app.use('/api', promptRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 


mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log('MongoDB connected');
})
.catch(err => console.error('DB connection failed:', err));

app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}/`));  