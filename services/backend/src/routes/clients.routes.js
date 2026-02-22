import { Router } from 'express';
import * as ctrl from '../controllers/clients.controller.js';

const router = Router();

router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);

export default router;
