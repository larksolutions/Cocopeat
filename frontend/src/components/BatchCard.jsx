import { Link } from "react-router";
import { Trash2Icon } from "lucide-react";
import { formatDate } from "../lib/utils";
import api from "../lib/axios";
import toast from "react-hot-toast";

// Helper function to determine the color of the status badge
const getStatusBadgeColor = (status) => {
  switch (status) {
    case 'Ongoing': return 'badge-info';
    case 'Paused': return 'badge-warning';
    case 'Finished': return 'badge-success';
    default: return 'badge-ghost';
  }
};

const BatchCard = ({ batch, setBatch }) => {
  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent navigation when clicking the delete icon

    if (!window.confirm("Are you sure you want to delete this batch?")) return;

    try {
      await api.delete(`/batch/${id}`);
      setBatch((prev) => prev.filter(b => b._id !== id));
      toast.success("Deleted Successfully");
    } catch (error) {
      console.log("Error in handleDelete", error);
      toast.error("Failed to delete");
    }
  };

  // Calculate progress percentage for the progress bar
  const progress = batch.outputCount > 0 ? (batch.potsDoneCount / batch.outputCount) * 100 : 0;

  return (
    <Link
      to={`/batch/${batch._id}`}
      className="card bg-base-100 hover:shadow-2xl transition-all duration-300 border-t-4 border-solid border-primary"
    >
      <div className="card-body">
        <div className="flex justify-between items-start mb-2">
          <h3 className="card-title text-base-content">{batch.title}</h3>
          <div className={`badge ${getStatusBadgeColor(batch.status)} font-semibold`}>
            {batch.status}
          </div>
        </div>

        <p className="text-base-content/70 line-clamp-2 h-12">{batch.content}</p>
        
        <div className="my-2">
          <div className="flex justify-between text-sm mb-1 text-base-content/80">
            <span>Progress</span>
            <span className="font-medium">{batch.potsDoneCount} / {batch.outputCount}</span>
          </div>
          <progress className="progress progress-primary w-full" value={progress} max="100"></progress>
        </div>

        <div className="card-actions justify-between items-center mt-2">
          <span className="text-sm text-base-content/50">
            {formatDate(new Date(batch.createdAt))}
          </span>
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost btn-xs text-error" onClick={(e) => handleDelete(e, batch._id)}>
              <Trash2Icon className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default BatchCard;

