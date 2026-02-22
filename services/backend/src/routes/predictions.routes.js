import { Router } from 'express';
import * as ctrl from '../controllers/predictions.controller.js';

const router = Router();

router.post('/predict', ctrl.predict);
router.get('/predictions', ctrl.list);

export default router;
