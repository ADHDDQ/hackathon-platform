import { Router } from 'express';
import * as ctrl from '../controllers/overrides.controller.js';
import { validateBody } from '../middleware/validateRequest.js';

const router = Router();

router.post('/', validateBody(['predictionId', 'selectedBundle']), ctrl.create);
router.get('/', ctrl.list);

export default router;
