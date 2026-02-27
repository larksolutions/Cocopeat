import { getDatabase } from '../config/db.js';

class MachineState {
    constructor(data = {}) {
        this.systemName = data.systemName || 'main';
        this.soilLevel = data.soilLevel !== undefined ? data.soilLevel : 1;
        this.cupLevel = data.cupLevel !== undefined ? data.cupLevel : 1;
        // Handle "null" string or empty string as null
        this.activeBatchId = (data.activeBatchId === "null" || data.activeBatchId === "" || !data.activeBatchId) 
            ? null 
            : data.activeBatchId;
        this.createdAt = data.createdAt || Date.now();
        this.updatedAt = data.updatedAt || Date.now();
    }

    static async findOne() {
        const db = getDatabase();
        const snapshot = await db.ref('machineState').once('value');
        
        if (!snapshot.exists()) {
            return null;
        }
        
        return new MachineState(snapshot.val());
    }

    async save() {
        const db = getDatabase();
        this.updatedAt = Date.now();
        
        const stateData = {
            systemName: this.systemName,
            soilLevel: this.soilLevel,
            cupLevel: this.cupLevel,
            // Store null as "null" string in Firebase (or could use null directly)
            activeBatchId: this.activeBatchId || null,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
        
        await db.ref('machineState').set(stateData);
        return this;
    }
}

export default MachineState;
