import { ArrowLeftIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import api from "../lib/axios";

const CreatePage = () => {
  const [title, setTitle] = useState("");
  const [seedType, setSeedType] = useState(""); 
  const [outputCount, setOutputCount] = useState(""); 
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !seedType || !outputCount || parseInt(outputCount, 10) <= 0) {
      toast.error("All fields are required and output count must be a positive number.", {
        duration: 3000,
      });
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/batch", {
        title,
        seedType: parseInt(seedType, 10),
        outputCount: parseInt(outputCount, 10),
      });

      const newBatch = response.data;
      toast.success("Batch created! Starting...");
      navigate(`/batch/${newBatch._id}`);

    } catch (error) {
      console.log("Error", error);
      
      if (error.response && error.response.status === 429) {
        toast.error("Slow down! You're submitting too fast", {
          duration: 3000,
        });
      } else {
        // Check for specific backend errors
        toast.error(error.response?.data?.message || "Failed to create batch");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className='container mx-auto px-4 py-8'>
        <div className='max-w-2xl mx-auto'>
          <Link to={"/"} className="btn btn-ghost mb-6">
            <ArrowLeftIcon className='size-5'>Back</ArrowLeftIcon>
          </Link>
          <div className='card bg-base-100 shadow-xl'>
            <div className='card-body'>
              <h2 className='card-title text-2xl mb-4'>Create New Batch</h2>
              <form onSubmit={handleSubmit}>
                <div className='form-control mb-4'>
                  <label className='label'>
                    <span className='label-text'>Batch Title</span>
                  </label>
                  <input type="text"
                    placeholder='Title'
                    className='input input-bordered'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>


                <div className='form-control mb-4'>
                  <label className='label'>
                    <span className='label-text'>Seed Type</span>
                  </label>
                  <select
                    className='select select-bordered w-full'
                    value={seedType}
                    onChange={(e) => setSeedType(e.target.value)}
                  >
                    <option value="" disabled>Select a seed type</option>
                    <option value="1">Lettuce Type 1</option>
                    <option value="2">Lettuce Type 2</option>
                    <option value="3">Lettuce Type 3</option>
                  </select>
                </div>

                <div className='form-control mb-4'>
                  <label className='label'>
                    <span className='label-text'>Number of Outputs</span>
                  </label>
                  <input
                    type="number"
                    placeholder='e.g., 10'
                    className='input input-bordered'
                    value={outputCount}
                    onChange={(e) => setOutputCount(e.target.value)}
                    min="1"
                  />
                </div>

                <div className='card-actions justify-end'>
                  <button type='submit' className='btn btn-primary' disabled={loading}>
                    {loading ? "Starting..." : "Start"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreatePage;