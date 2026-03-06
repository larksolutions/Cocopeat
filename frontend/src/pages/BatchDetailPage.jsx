import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { 
  LoaderIcon, ArrowLeftIcon, Trash2Icon, AlertTriangleIcon, 
  PauseCircleIcon, PlayCircleIcon, CheckCircle2Icon, XCircleIcon
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/axios"

const StatusBadge = ({ status, isPausedBySupply }) => {
  const displayStatus = isPausedBySupply ? 'Paused' : status;
  const config = {
    Ongoing: { icon: <PlayCircleIcon className="size-3 mr-1" />, text: 'RUNNING', color: 'bg-info text-info-content' },
    Paused: { icon: <PauseCircleIcon className="size-3 mr-1" />, text: 'PAUSED', color: 'bg-warning text-warning-content animate-pulse shadow-md' },
    Finished: { icon: <CheckCircle2Icon className="size-3 mr-1" />, text: 'FINISHED', color: 'bg-success text-success-content' },
    Cancelled: { icon: <XCircleIcon className="size-3 mr-1" />, text: 'STOPPED', color: 'bg-base-300 text-base-content' },
  }[displayStatus] || { icon: null, text: 'UNKNOWN', color: 'bg-ghost' };

  return (
    <div className={`flex items-center px-2 py-1 rounded shadow-sm ${config.color}`}>
      {config.icon}
      <span className="font-black text-[10px] tracking-wider leading-none">{config.text}</span>
    </div>
  );
};

const SupplyStatus = ({ label, level }) => {
  const isLow = level === 0;
  const dotClass = isLow ? "bg-error animate-pulse shadow-[0_0_5px_rgba(255,0,0,0.5)]" : "bg-success shadow-[0_0_5px_rgba(0,255,0,0.3)]";
  return (
    <div className={`flex flex-col items-center justify-center p-1 bg-base-200 rounded-lg border ${isLow ? 'border-error/40' : 'border-base-300'}`}>
      <div className={`w-4 h-4 rounded-full mb-0.5 border-2 border-base-100 ${dotClass}`}></div>
      <span className="text-[9px] font-extrabold uppercase tracking-wider text-base-content/70 leading-tight">{label}</span>
    </div>
  );
};

const FullScreenConfirm = ({ isOpen, title, message, confirmText, confirmColor, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;
  return (
    <div className="absolute inset-0 z-50 bg-base-300/95 flex flex-col p-3 justify-center backdrop-blur-sm">
      <div className="flex flex-col items-center text-center mb-4">
        <AlertTriangleIcon className={`size-10 mb-2 ${confirmColor === 'btn-error' ? 'text-error' : 'text-warning'}`} />
        <h2 className="text-xl font-black mb-1 leading-tight">{title}</h2>
        <p className="text-xs text-base-content/80 font-bold leading-tight">{message}</p>
      </div>
      <div className="flex flex-row gap-2">
        <button className="btn btn-neutral flex-1 h-12 min-h-0 text-xs font-black active:scale-95" onClick={onCancel} disabled={isLoading}>GO BACK</button>
        <button className={`btn ${confirmColor} flex-1 h-12 min-h-0 text-xs font-black shadow-md active:scale-95`} onClick={onConfirm} disabled={isLoading}>{isLoading ? <LoaderIcon className="animate-spin size-5" /> : confirmText}</button>
      </div>
    </div>
  );
};

const BatchDetailPage = () => {
  const [batch, setBatch] = useState(null);
  const [machineState, setMachineState] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const navigate = useNavigate();
  const { id } = useParams();
  const pollingRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchRes, stateRes] = await Promise.all([
          api.get(`/batch/${id}`),
          api.get(`/batch/machine-state`)
        ]);
        setBatch(batchRes.data);
        setMachineState(stateRes.data);
        if (['Finished', 'Cancelled'].includes(batchRes.data.status)) clearInterval(pollingRef.current);
      } catch (e) {} finally { setLoading(false); }
    };

    fetchData();
    pollingRef.current = setInterval(fetchData, 3000);
    return () => clearInterval(pollingRef.current);
  }, [id]);

  if (loading || !batch || !machineState) return <div className="h-screen w-screen bg-base-200 flex items-center justify-center"><LoaderIcon className="animate-spin size-10 text-primary" /></div>;

  const progress = batch.outputCount > 0 ? (batch.potsDoneCount / batch.outputCount) * 100 : 0;
  const isLowSupply = machineState.soilLevel === 0 || machineState.cupLevel === 0;

  return (
    <div className="h-screen w-screen bg-base-200 flex flex-col overflow-hidden select-none relative">
      <FullScreenConfirm isOpen={showDelete} title="DELETE BATCH?" message="This action cannot be undone." confirmText="YES, DELETE" confirmColor="btn-error" onConfirm={async () => { setIsProcessing(true); try { await api.delete(`/batch/${id}`); navigate("/"); } catch (e) { setIsProcessing(false); setShowDelete(false); } }} onCancel={() => setShowDelete(false)} isLoading={isProcessing} />
      <FullScreenConfirm isOpen={showCancel} title="EMERGENCY STOP" message="Halt machine immediately?" confirmText="YES, STOP" confirmColor="btn-warning" onConfirm={async () => { setIsProcessing(true); try { await api.put(`/batch/${id}/cancel`); setShowCancel(false); } catch (e) {} finally { setIsProcessing(false); } }} onCancel={() => setShowCancel(false)} isLoading={isProcessing} />

      <div className="h-10 flex items-center justify-between px-2 bg-base-100 shadow-sm border-b border-base-300 shrink-0">
        <Link to="/" className="btn btn-ghost btn-xs h-7 min-h-0 px-1 active:scale-95"><ArrowLeftIcon className="size-4 mr-1" /><span className="font-bold text-xs uppercase">Back</span></Link>
        <StatusBadge status={batch.status} isPausedBySupply={isLowSupply && (batch.status === 'Ongoing' || batch.status === 'Paused')} />
      </div>

      <div className="flex-1 flex flex-col p-1.5 gap-1.5 overflow-hidden">
        
        {isLowSupply && !['Finished', 'Cancelled'].includes(batch.status) && (
          <div className="bg-error text-error-content p-2 rounded-lg flex items-center justify-center gap-2 animate-pulse shadow-md shrink-0 border border-white/20">
            <AlertTriangleIcon className="size-4 shrink-0" />
            <span className="font-black text-[10px] uppercase tracking-wider leading-none">Critical: Refill Needed - Process Paused</span>
          </div>
        )}

        <div className="bg-base-100 rounded-lg p-2 shrink-0 text-center shadow-sm border border-base-300">
          <h1 className="text-lg font-black truncate text-base-content">{batch.title}</h1>
        </div>

        <div className="flex-1 bg-base-100 rounded-lg p-2 flex flex-col justify-center items-center shadow-sm relative border border-base-300">
          <label className="text-[10px] font-black uppercase text-base-content/40 mb-1 tracking-widest leading-none">Current Progress</label>
          <div className="text-4xl font-black font-mono text-primary mb-2 leading-none">{batch.potsDoneCount} <span className="text-2xl text-base-content/30">/ {batch.outputCount}</span></div>
          <progress className="progress progress-primary w-full h-4 bg-base-300 shadow-inner border border-base-300/50" value={progress} max="100"></progress>
        </div>

        <div className="flex gap-1.5 shrink-0 h-14">
          <div className="flex-1 grid grid-cols-2 gap-1.5 bg-base-100 p-1.5 rounded-lg border border-base-300">
             <SupplyStatus label="SOIL" level={machineState.soilLevel} />
             <SupplyStatus label="CUPS" level={machineState.cupLevel} />
          </div>
          <div className="flex-1 flex items-center">
            {['Ongoing', 'Paused'].includes(batch.status) ? (
              <button onClick={() => setShowCancel(true)} className="btn btn-warning w-full h-full min-h-0 text-sm font-black shadow-md tracking-tighter active:scale-95"><XCircleIcon className="size-5 mr-1" /> STOP</button>
            ) : machineState.activeBatchId?.toString() !== batch._id && (
              <button onClick={() => setShowDelete(true)} className="btn btn-error w-full h-full min-h-0 text-sm font-black shadow-md text-error-content active:scale-95"><Trash2Icon className="size-5 mr-1" /> DELETE</button>
            )}
            {['Finished', 'Cancelled'].includes(batch.status) && machineState.activeBatchId?.toString() === batch._id && (
               <button className="btn w-full h-full min-h-0 text-[10px] font-black" disabled>CLEANING...</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchDetailPage;