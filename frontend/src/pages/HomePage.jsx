import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router"; 
import { PlusIcon, LoaderIcon, AlertTriangleIcon, Wifi, WifiOff, ChevronLeft, ChevronRight } from "lucide-react"; 
import toast from "react-hot-toast";
import api from "../lib/axios";

const Navbar = ({ isBatchActive, areSuppliesLow }) => {
  const isDisabled = isBatchActive || areSuppliesLow;
  const handleNewBatchClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      toast.error(isBatchActive ? "Batch in progress!" : "Supplies Low!", { duration: 3000 });
    }
  };

  return (
    <header className="h-9 bg-neutral text-neutral-content px-3 flex justify-between items-center shadow-md z-10 shrink-0">
      <h1 className="text-lg font-black tracking-tight">POT-O-MATIC</h1>
      <Link
        to={"/create"}
        className={`btn btn-xs btn-primary h-7 px-3 ${isDisabled ? "btn-disabled opacity-50" : ""}`}
        onClick={handleNewBatchClick}
      >
        <PlusIcon className="size-4 mr-1" /> 
        <span className="font-bold text-[11px]">NEW BATCH</span>
      </Link>
    </header>
  );
};

const SupplyStatus = ({ label, level }) => {
  const isLow = level === 0; 
  const dotClass = isLow ? "bg-error animate-pulse shadow-[0_0_8px_rgba(255,0,0,0.6)]" : "bg-success shadow-[0_0_8px_rgba(0,255,0,0.4)]";
  return (
    <div className={`flex flex-col items-center justify-center p-1.5 bg-base-100 rounded-lg shadow-sm border ${isLow ? 'border-error/40 bg-error/5' : 'border-base-200/50'}`}>
      <div className={`w-5 h-5 rounded-full mb-1 border-2 border-base-100 ${dotClass}`}></div>
      <span className="text-[9px] font-extrabold uppercase tracking-widest text-base-content/70 leading-none">{label}</span>
    </div>
  );
};

const ESPConnectionStatus = ({ espStatus }) => {
  const isConnected = espStatus?.isConnected;
  const dotClass = isConnected ? "bg-success shadow-[0_0_8px_rgba(0,255,0,0.4)]" : "bg-error animate-pulse shadow-[0_0_8px_rgba(255,0,0,0.6)]";
  return (
    <div className="flex flex-col items-center justify-center p-1.5 bg-base-100 rounded-lg shadow-sm border border-base-200/50">
      <div className={`flex items-center justify-center w-5 h-5 rounded-full mb-1 border-2 border-base-100 ${dotClass}`}>
        {isConnected ? <Wifi className="size-3 text-success-content" /> : <WifiOff className="size-3 text-error-content" />}
      </div>
      <span className="text-[9px] font-extrabold uppercase tracking-widest text-base-content/70 leading-none">WIFI</span>
    </div>
  );
};

const BatchCard = ({ batch, isCurrentlyPausedBySupply }) => {
  const progress = batch.outputCount > 0 ? (batch.potsDoneCount / batch.outputCount) * 100 : 0;
  
  // UI Logic: If machine is physically paused by supply, show Paused regardless of DB status
  const effectiveStatus = isCurrentlyPausedBySupply ? 'Paused' : batch.status;

  const getStatusColor = (status) => {
    if (status === 'Ongoing') return 'bg-info text-info-content';
    if (status === 'Paused') return 'bg-warning text-warning-content animate-pulse shadow-sm';
    if (status === 'Finished') return 'bg-success text-success-content';
    return 'bg-base-300';
  };

  return (
    <Link
      to={`/batch/${batch._id}`}
      className="block bg-base-100 rounded-lg shadow-sm p-2 border-l-4 border-primary h-[52px] active:scale-[0.99] transition-transform"
    >
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-sm truncate pr-2 text-base-content">{batch.title}</span>
        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${getStatusColor(effectiveStatus)}`}>
          {effectiveStatus}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <progress className="progress progress-primary flex-1 h-2 bg-base-300" value={progress} max="100"></progress>
        <span className="text-[11px] font-mono font-bold w-10 text-right">{batch.potsDoneCount}/{batch.outputCount}</span>
      </div>
    </Link>
  );
};

function HomePage() {
  const [batches, setBatches] = useState([]); 
  const [machineState, setMachineState] = useState(null); 
  const [espStatus, setEspStatus] = useState(null); 
  const [loadingBatches, setLoadingBatches] = useState(true); 
  
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 2; 
  const totalPages = Math.ceil(batches.length / ITEMS_PER_PAGE) || 1;
  
  const pollingRef = useRef(null); 
  const previousActiveBatchIdRef = useRef(null);

  const fetchBatchHistory = async () => {
    try {
      const batchRes = await api.get("/batch");
      if (Array.isArray(batchRes.data)) setBatches(batchRes.data);
    } catch (error) {
      console.error("Error fetching batch history:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoadingBatches(true);
      await fetchBatchHistory();
      setLoadingBatches(false);
    };
    init();

    const poll = async () => {
      try {
        const [stateRes, espRes] = await Promise.all([
          api.get("/batch/machine-state"),
          api.get("/batch/esp-status")
        ]);
        
        const newMachineState = stateRes.data;
        
        // Check if batch status changed (from active to inactive)
        const previousBatchId = previousActiveBatchIdRef.current;
        const currentBatchId = newMachineState.activeBatchId;
        
        // If batch just finished (was active, now inactive), refresh batch list
        if (previousBatchId && !currentBatchId) {
          console.log("Batch completed - refreshing batch list");
          await fetchBatchHistory();
          toast.success("Batch completed! You can now start a new batch.");
        }
        
        // Update the ref with current batch ID
        previousActiveBatchIdRef.current = currentBatchId;
        
        setMachineState(newMachineState);
        setEspStatus(espRes.data);
      } catch (error) {
        console.error("Error polling:", error);
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollingRef.current);
  }, []);

  const areSuppliesLow = useMemo(() => {
    if (!machineState) return false; 
    return machineState.cupLevel === 0 || machineState.seedLevel === 0 || 
           machineState.cocoLevel === 0;
  }, [machineState]);

  const isBatchActive = useMemo(() => {
    if (!machineState || !machineState.activeBatchId) return false;
    const active = batches.find(b => b._id === machineState.activeBatchId);
    return active ? (active.status === 'Ongoing' || active.status === 'Paused') : true;
  }, [machineState, batches]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentBatches = batches.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="h-screen w-screen flex flex-col bg-base-200 overflow-hidden select-none">
      <Navbar isBatchActive={isBatchActive} areSuppliesLow={areSuppliesLow} />

      <div className="flex-1 flex flex-col p-1.5 gap-1.5 overflow-hidden">
        
        {/* Banner Alert Injection */}
        {areSuppliesLow && (
          <div className="bg-error text-error-content p-2 rounded-lg flex items-center justify-center gap-2 animate-pulse shadow-md shrink-0">
            <AlertTriangleIcon className="size-4" />
            <span className="font-bold text-[10px] uppercase tracking-wider leading-none">Refill Required</span>
          </div>
        )}

        <div className="bg-base-300/50 rounded-xl p-1.5 shrink-0">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <h2 className="text-sm font-black text-base-content/80 uppercase tracking-tight">System Status</h2>
          </div>
          {machineState ? (
            <div className="grid grid-cols-4 gap-1.5 h-[50px]">
              <SupplyStatus label="Cups" level={machineState.cupLevel} />
              <SupplyStatus label="Seed" level={machineState.seedLevel} />
              <SupplyStatus label="Coco" level={machineState.cocoLevel} />
              <ESPConnectionStatus espStatus={espStatus} />
            </div>
          ) : (
            <div className="flex justify-center p-2"><LoaderIcon className="animate-spin size-6" /></div>
          )}
        </div>
        
        <div className="flex-1 flex flex-col bg-base-300/50 rounded-xl p-1.5 overflow-hidden">
          <div className="flex items-center justify-between mb-1.5 px-1 shrink-0 h-8">
            <button className="btn btn-neutral btn-sm h-full w-12 min-h-0 rounded active:scale-95" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}><ChevronLeft className="size-5" /></button>
            <h2 className="text-xs font-black text-base-content/80 text-center leading-tight uppercase tracking-tight">History <br/><span className="text-[9px] opacity-70 tracking-wider">P. {currentPage}/{totalPages}</span></h2>
            <button className="btn btn-neutral btn-sm h-full w-12 min-h-0 rounded active:scale-95" disabled={currentPage === totalPages || batches.length === 0} onClick={() => setCurrentPage(prev => prev + 1)}><ChevronRight className="size-5" /></button>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            {currentBatches.map((batch) => (
              <BatchCard 
                key={batch._id} 
                batch={batch} 
                isCurrentlyPausedBySupply={areSuppliesLow && machineState?.activeBatchId === batch._id}
              />
            ))}
            {!loadingBatches && currentBatches.length === 0 && (
               <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-xs">No records</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;

