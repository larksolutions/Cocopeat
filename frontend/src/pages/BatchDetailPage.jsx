import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { 
    LoaderIcon, 
    ArrowLeftIcon, 
    Trash2Icon, 
    AlertTriangleIcon, 
    PauseCircleIcon, 
    PlayCircleIcon, 
    CheckCircle2Icon,
    XCircleIcon
} from "lucide-react";
import api from "../lib/axios";
import toast from "react-hot-toast";

// --- Helper UI Components ---

const ProgressBar = ({ value, colorClass = 'progress-primary' }) => (
    <progress className={`progress ${colorClass} w-full`} value={value} max="100"></progress>
);

const StatusBadge = ({ status }) => {
    const statusConfig = {
        Ongoing: { icon: <PlayCircleIcon className="h-5 w-5 mr-2" />, text: 'Ongoing', color: 'info' },
        Paused: { icon: <PauseCircleIcon className="h-5 w-5 mr-2" />, text: 'Paused', color: 'warning' },
        Finished: { icon: <CheckCircle2Icon className="h-5 w-5 mr-2" />, text: 'Finished', color: 'success' },
        Cancelled: { icon: <XCircleIcon className="h-5 w-5 mr-2" />, text: 'Cancelled', color: 'ghost' },
        default: { icon: null, text: 'Unknown', color: 'ghost' }
    };
    const config = statusConfig[status] || statusConfig.default;
    return (
        <div className={`badge badge-lg badge-${config.color} gap-2 p-4`}>
            {config.icon}
            <span className="font-semibold">{config.text}</span>
        </div>
    );
};

// --- LowSupplyAlert now just reads the batch status ---
const LowSupplyAlert = ({ status }) => {
    if (status !== 'Paused') {
        return null; 
    }

    return (
        <div className="alert alert-error shadow-lg mb-6 animate-pulse">
            <AlertTriangleIcon className="h-6 w-6 stroke-current shrink-0" />
            <div>
                <h3 className="font-bold">Critical Alert: Supplies Low!</h3>
                <div className="text-xs">
                    The process is paused. Please refill supplies to resume.
                </div>
            </div>
        </div>
    );
};

// --- SupplyStatus component (reads from machineState) ---
const SupplyStatus = ({ label, level }) => {
    const isLow = level === 0;
    const statusText = isLow ? 'Low' : 'Sufficient';
    const colorClass = isLow ? 'text-error' : 'text-success';

    return (
        <div className="flex justify-between items-center p-4 bg-base-200 rounded-lg">
            <span className="label-text font-medium">{label}</span>
            <span className={`font-bold ${colorClass} badge badge-outline badge-lg`}>{statusText}</span>
        </div>
    );
};


// --- Main Page Component ---
const BatchDetailPage = () => {
    const [batch, setBatch] = useState(null);
    const [machineState, setMachineState] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);
    const navigate = useNavigate();
    const { id } = useParams();
    const pollingRef = useRef(null);

    useEffect(() => {
        const fetchBatchData = async () => {
            try {
                const batchRes = await api.get(`/batch/${id}`);
                const stateRes = await api.get(`/batch/machine-state`); 

                setBatch(batchRes.data);
                setMachineState(stateRes.data);
                
                if ((batchRes.data.status === 'Finished' || batchRes.data.status === 'Cancelled') && pollingRef.current) {
                    clearInterval(pollingRef.current);
                }
            } catch (error) {
                console.error("Error fetching data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBatchData(); // Initial fetch
        pollingRef.current = setInterval(fetchBatchData, 3000); // Polling

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [id]);

    const handleDelete = async () => {
        document.getElementById('delete_modal').showModal();
    };

    const confirmDelete = async () => {
       try {
            await api.delete(`/batch/${id}`);
            toast.success("Batch deleted successfully");
            navigate("/");
        } catch (error) {
            console.error("Error deleting the Batch", error);
            toast.error(error.response?.data?.message || "Failed to delete the Batch");
        }
    }

    const handleCancel = async () => {
        document.getElementById('cancel_modal').showModal();
    };

    const confirmCancel = async () => {
        setIsCancelling(true);
        try {
            await api.put(`/batch/${id}/cancel`); 
            toast.success("Batch cancelled successfully");
        } catch (error) {
            console.error("Error cancelling the Batch", error);
            toast.error("Failed to cancel the Batch");
        } finally {
            setIsCancelling(false);
            const modal = document.getElementById('cancel_modal');
            if (modal) {
                modal.close();
            }
        }
    };

    if (loading || !machineState) { 
        return (
            <div className="min-h-screen bg-base-200 flex items-center justify-center">
                <LoaderIcon className="animate-spin size-10 text-primary" />
            </div>
        );
    }

    if (!batch) {
        return (
             <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-bold mb-4">Batch Not Found</h2>
                <p className="text-gray-500 mb-6">The batch may have been deleted.</p>
                <Link to="/" className="btn btn-primary">
                    <ArrowLeftIcon className="h-5 w-5 mr-2" />
                    Back to All Batches
                </Link>
            </div>
        );
    }

    const progressPercentage = batch.outputCount > 0 ? (batch.potsDoneCount / batch.outputCount) * 100 : 0;

    return (
        <>
        <div className="min-h-screen bg-base-200 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <Link to="/" className="btn btn-ghost">
                        <ArrowLeftIcon className="h-5 w-5" />
                        Back
                    </Link>
                    
                    <div className="flex gap-2">
                        {(batch.status === 'Ongoing' || batch.status === 'Paused') && (
                            <button 
                                onClick={handleCancel} 
                                className="btn btn-warning btn-outline"
                                disabled={isCancelling}
                            >
                                <XCircleIcon className="h-5 w-5" />
                                {isCancelling ? "Cancelling..." : "Cancel Batch"}
                            </button>
                        )}
                        {machineState.activeBatchId?.toString() !== batch._id && (
                            <button onClick={handleDelete} className="btn btn-error btn-outline">
                                <Trash2Icon className="h-5 w-5" />
                                Delete Batch
                            </button>
                        )}
                    </div>
                </div>

                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body p-6 md:p-8">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-6">
                            <div>
                                <h1 className="card-title text-3xl font-bold mb-1">{batch.title}</h1>
                                <p className="text-gray-500">Seed Type ID: <span className="font-semibold">{batch.seedType}</span></p>
                            </div>
                            <div className="mt-4 sm:mt-0">
                                <StatusBadge status={batch.status} />
                            </div>
                        </div>

                        <LowSupplyAlert status={batch.status} />

                        <div className="mb-8">
                             <label className="label">
                                <span className="label-text text-lg font-semibold">Overall Progress</span>
                            </label>
                            <ProgressBar value={progressPercentage} />
                            <div className="text-right mt-1 font-mono text-gray-600">
                                Pots Done: {batch.potsDoneCount} / {batch.outputCount}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                           <SupplyStatus label="Soil Supply Level" level={machineState.soilLevel} />
                           <SupplyStatus label="Potting Cup Supply Level" level={machineState.cupLevel} />
                        </div>
                        
                        
                    </div>
                </div>
            </div>
        </div>

        {/* --- Delete Modal  --- */}
        <dialog id="delete_modal" className="modal">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Confirm Deletion</h3>
                <p className="py-4">Are you sure you want to delete this batch? This action cannot be undone.</p>
                <div className="modal-action">
                    <form method="dialog">
                        <button className="btn mr-2">Cancel</button>
                        <button className="btn btn-error" onClick={confirmDelete}>Delete</button>
                    </form>
                </div>
            </div>
             <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
        
        {/* --- Cancel Modal --- */}
        <dialog id="cancel_modal" className="modal">
            <div className="modal-box">
                <h3 className="font-bold text-lg">Confirm Cancellation</h3>
                <p className="py-4">Are you sure you want to cancel this batch? The process will be stopped.</p>
                <div className="modal-action">
                    <form method="dialog">
                        <button className="btn mr-2" disabled={isCancelling}>Close</button>
                        <button 
                            className="btn btn-warning" 
                            onClick={confirmCancel}
                            disabled={isCancelling}
                        >
                            {isCancelling ? "Cancelling..." : "Yes, Cancel"}
                        </button>
                    </form>
                </div>
            </div>
             <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
        </>
    );
};

export default BatchDetailPage;