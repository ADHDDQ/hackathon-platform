import { Router } from 'express';
import * as ctrl from '../controllers/chat.controller.js';

const router = Router();

router.post('/', ctrl.send);

export default router;
