import express from 'express';
import {
        createPrompt, 
        getAllPrompts,
        getPromptById,
        updatePrompt,
        deletePrompt,
        toggleStarPrompt,
        forkPrompt,
        getStarredPromptsByUser,
        incrementCopiedCount
 } from '../Controllers/promptController.js';
import protect from "../middleware/authMiddleware.js"
const router = express.Router();

// router.get('/search',searchPrompts)
router.post('/prompts', protect , createPrompt);     //  /api/prompts
router.get('/prompts', getAllPrompts);   //  /api/prompts
router.get('/prompts/s/starred', protect, getStarredPromptsByUser);
router.get('/prompts/:id',getPromptById);
router.put('/prompts/:id' , protect, updatePrompt);
router.delete('/prompts/:id', protect, deletePrompt);
router.post('/prompts/:id/copy', protect, incrementCopiedCount);
router.post('/prompts/:id/star', protect,toggleStarPrompt)
router.post('/prompts/:id/fork',  protect,forkPrompt)

export default router;
