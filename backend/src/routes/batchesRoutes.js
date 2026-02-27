import { Router } from 'express';
import { 
    getAllBatch, 
    getBatchById, 
    createBatch, 
    updateBatch, 
    deleteBatch, 
    cancelBatch,
    getMachineState,
    updateMachineState,
    getESPStatus
} from '../controllers/batchController.js';

const router = Router();

router.put('/machine-state-update', updateMachineState);

router.get('/machine-state', getMachineState); 

router.get('/esp-status', getESPStatus);

router.get('/', getAllBatch);
router.post('/', createBatch);
router.get('/:id', getBatchById);
router.put('/:id', updateBatch); 
router.delete('/:id', deleteBatch);
router.put('/:id/cancel', cancelBatch);

export default router;