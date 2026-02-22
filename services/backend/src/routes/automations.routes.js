import { Router } from 'express';
import * as ctrl from '../controllers/automations.controller.js';

const router = Router();

router.post('/high-value-lead', ctrl.triggerHighValueLead);

export default router;
