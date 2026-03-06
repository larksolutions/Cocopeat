// import { ArrowLeftIcon } from 'lucide-react';
// import { useState } from 'react';
// import { Link, useNavigate } from 'react-router';
// import toast from 'react-hot-toast';
// import api from "../lib/axios";

// const CreatePage = () => {
//   const [title, setTitle] = useState("");
//   const [seedType, setSeedType] = useState(""); 
//   const [outputCount, setOutputCount] = useState(""); 
//   const [loading, setLoading] = useState(false);

//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!title.trim() || !seedType || !outputCount || parseInt(outputCount, 10) <= 0) {
//       toast.error("All fields are required and output count must be a positive number.", {
//         duration: 3000,
//       });
//       return;
//     }
//     setLoading(true);
//     try {
//       const response = await api.post("/batch", {
//         title,
//         seedType: parseInt(seedType, 10),
//         outputCount: parseInt(outputCount, 10),
//       });

//       const newBatch = response.data;
//       toast.success("Batch created! Starting...");
//       navigate(`/batch/${newBatch._id}`);

//     } catch (error) {
//       console.log("Error", error);
      
//       if (error.response && error.response.status === 429) {
//         toast.error("Slow down! You're submitting too fast", {
//           duration: 3000,
//         });
//       } else {
//         // Check for specific backend errors
//         toast.error(error.response?.data?.message || "Failed to create batch");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-base-200">
//       <div className='container mx-auto px-4 py-8'>
//         <div className='max-w-2xl mx-auto'>
//           <Link to={"/"} className="btn btn-ghost mb-6">
//             <ArrowLeftIcon className='size-5'>Back</ArrowLeftIcon>
//           </Link>
//           <div className='card bg-base-100 shadow-xl'>
//             <div className='card-body'>
//               <h2 className='card-title text-2xl mb-4'>Create New Batch</h2>
//               <form onSubmit={handleSubmit}>
//                 <div className='form-control mb-4'>
//                   <label className='label'>
//                     <span className='label-text'>Batch Title</span>
//                   </label>
//                   <input type="text"
//                     placeholder='Title'
//                     className='input input-bordered'
//                     value={title}
//                     onChange={(e) => setTitle(e.target.value)}
//                   />
//                 </div>


//                 <div className='form-control mb-4'>
//                   <label className='label'>
//                     <span className='label-text'>Seed Type</span>
//                   </label>
//                   <select
//                     className='select select-bordered w-full'
//                     value={seedType}
//                     onChange={(e) => setSeedType(e.target.value)}
//                   >
//                     <option value="" disabled>Select a seed type</option>
//                     <option value="1">Lettuce Type 1</option>
//                     <option value="2">Lettuce Type 2</option>
//                     <option value="3">Lettuce Type 3</option>
//                   </select>
//                 </div>

//                 <div className='form-control mb-4'>
//                   <label className='label'>
//                     <span className='label-text'>Number of Outputs</span>
//                   </label>
//                   <input
//                     type="number"
//                     placeholder='e.g., 10'
//                     className='input input-bordered'
//                     value={outputCount}
//                     onChange={(e) => setOutputCount(e.target.value)}
//                     min="1"
//                   />
//                 </div>

//                 <div className='card-actions justify-end'>
//                   <button type='submit' className='btn btn-primary' disabled={loading}>
//                     {loading ? "Starting..." : "Start"}
//                   </button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default CreatePage;
import { ArrowLeftIcon, Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import api from "../lib/axios"; 

const CreatePage = () => {
  const [title, setTitle] = useState("");
  const [outputCount, setOutputCount] = useState("1"); 
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const count = parseInt(outputCount, 10);
    
    if (!title.trim() || !outputCount || count <= 0 || count > 100) {
      toast.error("Please enter a title and an output count between 1 and 100.", {
        duration: 4000,
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post("/batch", {
        title,
        seedType: 1, 
        outputCount: count,
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
        toast.error(error.response?.data?.message || "Failed to create batch");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCountChange = (e) => {
    const value = e.target.value;
    if (value === '' || (Number(value) >= 0 && Number(value) <= 100)) {
      setOutputCount(value);
    }
  };

  // Up and Down button functions
  const incrementCount = () => {
    const current = parseInt(outputCount) || 0;
    if (current < 100) setOutputCount((current + 1).toString());
  };

  const decrementCount = () => {
    const current = parseInt(outputCount) || 0;
    if (current > 1) setOutputCount((current - 1).toString());
  };

  return (
    <div className="h-screen w-screen bg-base-200 overflow-hidden flex flex-col select-none">
      <header className="h-10 shrink-0 bg-neutral flex items-center px-2 shadow-md">
        <Link to={"/"} className="btn btn-ghost btn-xs h-8 min-h-0 px-2 text-neutral-content bg-base-100/10">
          <ArrowLeftIcon className='size-5 mr-1' /> 
          <span className="text-sm font-bold uppercase tracking-tight">Back</span>
        </Link>
        <h1 className="ml-auto font-black text-xs text-neutral-content pr-2 tracking-widest uppercase opacity-80">New Batch</h1>
      </header>
      
      {/* Main Content Container */}
      <div className="flex-1 p-2 flex flex-col overflow-hidden">
        <div className="bg-base-100 rounded-xl shadow-lg border border-base-300 flex-1 flex flex-col p-3 justify-between">
          
          <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
            
            <div className="space-y-2">
              {/* Title Section */}
              <div className='form-control'>
                <label className='label py-0 mb-1'>
                  <span className='label-text text-[10px] font-black uppercase opacity-60'>Batch Title</span>
                </label>
                <input type="text"
                  placeholder='Title'
                  className='input input-bordered h-10 w-full text-base font-bold bg-base-200 focus:bg-base-100'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Pot Quantity with Up/Down Buttons */}
              <div className='form-control'>
                <label className='label py-0 mb-1 flex justify-between'>
                  <span className='label-text text-[10px] font-black uppercase opacity-60'>Output Quantity</span>
                  <span className="text-[9px] font-bold text-primary px-1">MAX 100</span>
                </label>
                
                <div className="flex items-center gap-2 h-12">
                  <button 
                    type="button" 
                    onClick={decrementCount}
                    className="btn btn-neutral flex-1 h-full min-h-0 shadow-inner"
                  >
                    <Minus className="size-6" />
                  </button>
                  
                  <input
                    type="number"
                    inputMode="numeric" 
                    pattern="[0-9]*"
                    placeholder='0'
                    className='input input-bordered h-full flex-[1.5] text-center text-2xl font-mono font-black bg-base-200 focus:bg-base-100 min-w-0'
                    value={outputCount}
                    onChange={handleCountChange}
                    min="1"
                    max="100"
                  />

                  <button 
                    type="button" 
                    onClick={incrementCount}
                    className="btn btn-neutral flex-1 h-full min-h-0 shadow-inner"
                  >
                    <Plus className="size-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className='pt-2'>
              <button 
                type='submit' 
                className='btn btn-primary w-full h-14 min-h-0 text-xl font-black shadow-lg tracking-widest active:scale-95 transition-transform' 
                disabled={loading}
              >
                {loading ? "INITIALIZING..." : "START BATCH"}
              </button>
            </div>
            
          </form>
          
        </div>
      </div>
    </div>
  );
};

export default CreatePage;