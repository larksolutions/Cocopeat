import { getDatabase } from '../config/db.js';

class Batch {
    constructor(data) {
        this.title = data.title;
        this.seedType = data.seedType;
        this.outputCount = data.outputCount;
        this.potsDoneCount = data.potsDoneCount || 0;
        this.status = data.status || 'Ongoing';
        this.createdAt = data.createdAt || Date.now();
        this.updatedAt = data.updatedAt || Date.now();
        this._id = data._id || null;
    }

    static async create(batchData) {
        const db = getDatabase();
        const batchRef = db.ref('batches').push();
        const batch = new Batch({
            ...batchData,
            _id: batchRef.key,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        
        await batchRef.set({
            title: batch.title,
            seedType: batch.seedType,
            outputCount: batch.outputCount,
            potsDoneCount: batch.potsDoneCount,
            status: batch.status,
            createdAt: batch.createdAt,
            updatedAt: batch.updatedAt
        });
        
        return batch;
    }

    static async findById(id) {
        const db = getDatabase();
        const snapshot = await db.ref(`batches/${id}`).once('value');
        
        if (!snapshot.exists()) {
            return null;
        }
        
        const data = snapshot.val();
        return new Batch({ ...data, _id: id });
    }

    static async find() {
        const db = getDatabase();
        const snapshot = await db.ref('batches').once('value');
        
        if (!snapshot.exists()) {
            return [];
        }
        
        const batches = [];
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            batches.push(new Batch({ ...data, _id: childSnapshot.key }));
        });
        
        // Sort by createdAt descending (most recent first)
        return batches.sort((a, b) => b.createdAt - a.createdAt);
    }

    static async findByIdAndDelete(id) {
        const db = getDatabase();
        const batch = await this.findById(id);
        
        if (!batch) {
            return null;
        }
        
        await db.ref(`batches/${id}`).remove();
        return batch;
    }

    async save() {
        const db = getDatabase();
        this.updatedAt = Date.now();
        
        const batchData = {
            title: this.title,
            seedType: this.seedType,
            outputCount: this.outputCount,
            potsDoneCount: this.potsDoneCount,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
        
        await db.ref(`batches/${this._id}`).update(batchData);
        return this;
    }
}

export default Batch;

